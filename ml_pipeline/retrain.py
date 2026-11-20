"""
Task C — Candidate Model Retraining Module
MachineMitra Predictive Maintenance - MLOps Monitoring Pipeline
"""

import os
import json
import time
import pickle
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd
import mlflow
import mlflow.sklearn
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
    precision_recall_curve
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_DATA_PATH = PROJECT_ROOT / 'data' / 'raw' / 'ai4i2020.csv'
INCOMING_DATA_PATH = PROJECT_ROOT / 'data' / 'incoming' / 'ai4i_predictive_maintenance_modified.csv'
MODEL_DIR = PROJECT_ROOT / 'models'
REPORTS_DIR = PROJECT_ROOT / 'reports'

FEATURES = [
    'Type',
    'Air temperature [K]',
    'Process temperature [K]',
    'Rotational speed [rpm]',
    'Torque [Nm]',
    'Tool wear [min]'
]
NUMERIC_FEATURES = FEATURES[1:]
TARGET = 'Machine failure'


def get_tracking_uri() -> str:
    """Finds an active MLflow tracking URI, checking environment, Docker, and localhost."""
    env_uri = os.getenv('MLFLOW_TRACKING_URI')
    if env_uri:
        return env_uri

    import urllib.request
    # Check localhost:5000 (standard local Docker port mapping)
    try:
        urllib.request.urlopen('http://localhost:5000', timeout=1.5)
        return 'http://localhost:5000'
    except Exception:
        pass

    # Check mlflow:5000 (inside docker container network)
    try:
        urllib.request.urlopen('http://mlflow:5000', timeout=1.5)
        return 'http://mlflow:5000'
    except Exception:
        pass

    # Fallback to local mlruns file repository
    local_mlruns = PROJECT_ROOT / 'mlruns'
    local_mlruns.mkdir(parents=True, exist_ok=True)
    return str(local_mlruns.as_uri())


def build_preprocessing_pipeline(classifier_model) -> Pipeline:
    """Builds the standard MachineMitra preprocessing and modeling pipeline."""
    preprocessor = ColumnTransformer(
        transformers=[
            ('type', OneHotEncoder(handle_unknown='ignore'), ['Type']),
            ('numeric', Pipeline([
                ('imputer', SimpleImputer(strategy='median')),
                ('scale', StandardScaler())
            ]), NUMERIC_FEATURES)
        ]
    )
    return Pipeline([
        ('preprocess', preprocessor),
        ('classifier', classifier_model)
    ])


def find_optimal_threshold(y_true: np.ndarray, y_probs: np.ndarray, beta: float = 2.0) -> float:
    """
    Finds the optimal probability threshold maximizing F-beta score.
    Default beta=2.0 weights Recall higher than Precision to catch rare machine failures.
    """
    precision, recall, thresholds = precision_recall_curve(y_true, y_probs)
    if len(thresholds) == 0:
        return 0.5
    
    b2 = beta ** 2
    f_score = ((1 + b2) * precision[:-1] * recall[:-1]) / (b2 * precision[:-1] + recall[:-1] + 1e-12)
    best_idx = int(np.nanargmax(f_score))
    return float(thresholds[best_idx])


def calculate_metrics(y_true: np.ndarray, y_probs: np.ndarray, threshold: float) -> Dict[str, Any]:
    """Calculates comprehensive classification metrics given probabilities and threshold."""
    y_pred = (y_probs >= threshold).astype(int)
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = [int(v) for v in cm.ravel()]

    return {
        'accuracy': float(accuracy_score(y_true, y_pred)),
        'precision': float(precision_score(y_true, y_pred, zero_division=0)),
        'recall': float(recall_score(y_true, y_pred, zero_division=0)),
        'f1': float(f1_score(y_true, y_pred, zero_division=0)),
        'pr_auc': float(average_precision_score(y_true, y_probs)),
        'roc_auc': float(roc_auc_score(y_true, y_probs)),
        'threshold': float(threshold),
        'confusion_matrix': cm.tolist(),
        'true_negatives': tn,
        'false_positives': fp,
        'false_negatives': fn,
        'true_positives': tp
    }


def retrain_candidate_model(
    raw_path: Optional[str | Path] = None,
    incoming_path: Optional[str | Path] = None,
    candidate_save_path: Optional[str | Path] = None,
    tracking_uri: Optional[str] = None
) -> Dict[str, Any]:
    """
    Combines existing raw data with new incoming batch, trains a candidate model,
    saves candidate artifact separately, and logs the run to MLflow.
    """
    raw_path = Path(raw_path or RAW_DATA_PATH)
    incoming_path = Path(incoming_path or INCOMING_DATA_PATH)
    candidate_save_path = Path(candidate_save_path or (MODEL_DIR / 'candidate.pkl'))
    candidate_save_path.parent.mkdir(parents=True, exist_ok=True)

    if not raw_path.exists():
        raise FileNotFoundError(f"Existing raw dataset not found: {raw_path}")
    if not incoming_path.exists():
        raise FileNotFoundError(f"Incoming batch dataset not found: {incoming_path}")

    # Step 1: Load and combine datasets
    df_raw = pd.read_csv(raw_path, encoding='utf-8-sig')
    df_incoming = pd.read_csv(incoming_path, encoding='utf-8-sig')

    req_cols = FEATURES + [TARGET]
    df_raw_clean = df_raw[req_cols].dropna().copy()
    df_incoming_clean = df_incoming[req_cols].dropna().copy()

    df_combined = pd.concat([df_raw_clean, df_incoming_clean], ignore_index=True)
    total_samples = len(df_combined)

    X = df_combined[FEATURES]
    y = df_combined[TARGET].astype(int)

    # Step 2: Stratified Split (70% train, 15% val, 15% test)
    x_train, x_hold, y_train, y_hold = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )
    x_val, x_test, y_val, y_test = train_test_split(
        x_hold, y_hold, test_size=0.50, random_state=42, stratify=y_hold
    )

    # Compute scale_pos_weight for handling class imbalance
    neg_count = int((y_train == 0).sum())
    pos_count = int((y_train == 1).sum())
    scale_weight = float(neg_count / max(pos_count, 1))

    # Candidate model configuration (XGBoost classifier with tuned hyperparameters)
    candidate_classifier = XGBClassifier(
        n_estimators=400,
        max_depth=5,
        learning_rate=0.04,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_lambda=2.0,
        scale_pos_weight=scale_weight,
        eval_metric='aucpr',
        n_jobs=-1,
        random_state=42
    )

    candidate_pipeline = build_preprocessing_pipeline(candidate_classifier)

    # Step 3: MLflow Tracking Setup
    if tracking_uri is None:
        tracking_uri = get_tracking_uri()

    try:
        mlflow.set_tracking_uri(tracking_uri)
        mlflow.set_experiment('MachineMitra Predictive Maintenance')
    except Exception as e:
        print(f"[Warning] Failed to set MLflow URI {tracking_uri}: {e}. Retrying with local mlruns.")
        local_uri = str((PROJECT_ROOT / 'mlruns').as_uri())
        mlflow.set_tracking_uri(local_uri)
        mlflow.set_experiment('MachineMitra Predictive Maintenance')

    run_id = None
    start_time = time.time()

    # Step 4: Fit candidate pipeline & optimize threshold
    with mlflow.start_run(run_name='Candidate Retraining (Combined Data)') as run:
        run_id = run.info.run_id
        candidate_pipeline.fit(x_train, y_train)
        training_duration = time.time() - start_time

        # Validation set evaluation & threshold tuning
        val_probs = candidate_pipeline.predict_proba(x_val)[:, 1]
        best_threshold = find_optimal_threshold(y_val.values, val_probs, beta=2.0)
        val_metrics = calculate_metrics(y_val.values, val_probs, best_threshold)

        # Holdout test set evaluation
        test_probs = candidate_pipeline.predict_proba(x_test)[:, 1]
        test_metrics = calculate_metrics(y_test.values, test_probs, best_threshold)

        # Also evaluate specifically on the incoming batch for direct comparison
        incoming_X = df_incoming_clean[FEATURES]
        incoming_y = df_incoming_clean[TARGET].astype(int).values
        incoming_probs = candidate_pipeline.predict_proba(incoming_X)[:, 1]
        incoming_metrics = calculate_metrics(incoming_y, incoming_probs, best_threshold)

        # Log parameters to MLflow
        mlflow.log_params({
            'model_type': 'Candidate_XGBoost',
            'dataset_source': 'combined (raw + incoming batch)',
            'total_samples': total_samples,
            'raw_samples': len(df_raw_clean),
            'incoming_samples': len(df_incoming_clean),
            'train_samples': len(x_train),
            'val_samples': len(x_val),
            'test_samples': len(x_test),
            'decision_threshold': best_threshold,
            'scale_pos_weight': round(scale_weight, 3),
            'threshold_optimization': 'F2-Score'
        })

        # Log metrics to MLflow
        for prefix, metric_dict in [('test_', test_metrics), ('incoming_', incoming_metrics)]:
            for k, v in metric_dict.items():
                if isinstance(v, (int, float)):
                    mlflow.log_metric(f"{prefix}{k}", round(float(v), 4))

        mlflow.log_metric('training_seconds', round(training_duration, 2))

        # Log model artifact to MLflow
        try:
            mlflow.sklearn.log_model(candidate_pipeline, artifact_path='candidate_model')
        except Exception as e:
            print(f"[Warning] MLflow log_model skipped: {e}")

    # Step 5: Save candidate model artifact separately
    trained_at = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    candidate_bundle = {
        'pipeline': candidate_pipeline,
        'model_name': 'Candidate_XGBoost',
        'version': '2.0-candidate',
        'threshold': best_threshold,
        'metrics': test_metrics,
        'validation_metrics': val_metrics,
        'incoming_metrics': incoming_metrics,
        'trained_at': trained_at,
        'dataset_info': {
            'total_samples': total_samples,
            'raw_samples': len(df_raw_clean),
            'incoming_samples': len(df_incoming_clean),
            'train_samples': len(x_train),
            'test_samples': len(x_test)
        },
        'mlflow_run_id': run_id,
        'mlflow_tracking_uri': tracking_uri
    }

    with open(candidate_save_path, 'wb') as f:
        pickle.dump(candidate_bundle, f)

    retrain_summary = {
        'status': 'SUCCESS',
        'candidate_artifact_path': str(candidate_save_path),
        'model_name': 'Candidate_XGBoost',
        'version': '2.0-candidate',
        'total_samples_trained': total_samples,
        'training_duration_seconds': round(training_duration, 2),
        'decision_threshold': round(best_threshold, 4),
        'test_metrics': {
            'accuracy': round(test_metrics['accuracy'], 4),
            'precision': round(test_metrics['precision'], 4),
            'recall': round(test_metrics['recall'], 4),
            'f1_score': round(test_metrics['f1'], 4),
            'pr_auc': round(test_metrics['pr_auc'], 4),
            'roc_auc': round(test_metrics['roc_auc'], 4)
        },
        'incoming_batch_metrics': {
            'accuracy': round(incoming_metrics['accuracy'], 4),
            'precision': round(incoming_metrics['precision'], 4),
            'recall': round(incoming_metrics['recall'], 4),
            'f1_score': round(incoming_metrics['f1'], 4),
            'pr_auc': round(incoming_metrics['pr_auc'], 4),
            'roc_auc': round(incoming_metrics['roc_auc'], 4)
        },
        'mlflow_run_id': run_id,
        'mlflow_tracking_uri': tracking_uri,
        'trained_at': trained_at
    }

    return retrain_summary


def print_retrain_summary(summary: Dict[str, Any]) -> None:
    """Prints a formatted summary of candidate model retraining."""
    tm = summary['test_metrics']
    im = summary['incoming_batch_metrics']
    print("=" * 70)
    print("  TASK C: CANDIDATE MODEL RETRAINING REPORT")
    print("=" * 70)
    print(f"Status:                     {summary['status']}")
    print(f"Candidate Model:            {summary['model_name']} ({summary['version']})")
    print(f"Saved Artifact Path:        {summary['candidate_artifact_path']}")
    print(f"Total Samples Combined:     {summary['total_samples_trained']:,}")
    print(f"Training Duration:          {summary['training_duration_seconds']}s")
    print(f"Optimal Decision Threshold: {summary['decision_threshold']}")
    print(f"MLflow Run ID:              {summary['mlflow_run_id']}")
    print(f"MLflow Tracking URI:        {summary['mlflow_tracking_uri']}")
    print("-" * 70)
    print("Holdout Test Set Performance:")
    print(f"  Accuracy:  {tm['accuracy'] * 100:.2f}% | Precision: {tm['precision'] * 100:.2f}%")
    print(f"  Recall:    {tm['recall'] * 100:.2f}% | F1-Score:  {tm['f1_score'] * 100:.2f}%")
    print(f"  PR-AUC:    {tm['pr_auc']:.4f}  | ROC-AUC:   {tm['roc_auc']:.4f}")
    print("-" * 70)
    print("Incoming Batch Performance (Candidate):")
    print(f"  Accuracy:  {im['accuracy'] * 100:.2f}% | Precision: {im['precision'] * 100:.2f}%")
    print(f"  Recall:    {im['recall'] * 100:.2f}% | F1-Score:  {im['f1_score'] * 100:.2f}%")
    print(f"  PR-AUC:    {im['pr_auc']:.4f}  | ROC-AUC:   {im['roc_auc']:.4f}")
    print("=" * 70)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="Retrain candidate model on combined data")
    parser.add_argument('--raw', type=str, default=str(RAW_DATA_PATH), help="Path to original raw CSV")
    parser.add_argument('--incoming', type=str, default=str(INCOMING_DATA_PATH), help="Path to incoming CSV")
    parser.add_argument('--candidate-out', type=str, default=str(MODEL_DIR / 'candidate.pkl'), help="Path to save candidate pkl")
    args = parser.parse_args()

    summary = retrain_candidate_model(args.raw, args.incoming, args.candidate_out)
    print_retrain_summary(summary)
