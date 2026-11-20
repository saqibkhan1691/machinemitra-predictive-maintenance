"""
Task B — Champion Model Evaluation Module
MachineMitra Predictive Maintenance - MLOps Monitoring Pipeline
"""

import os
import json
import pickle
import warnings
from pathlib import Path
from typing import Dict, Any, Optional
import pandas as pd
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
    classification_report
)

warnings.filterwarnings('ignore')

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_PATH = PROJECT_ROOT / 'models' / 'champion.pkl'

DEFAULT_DATA_PATH = PROJECT_ROOT / 'data' / 'incoming' / 'new_batch_dataset.csv'
if not DEFAULT_DATA_PATH.exists():
    DEFAULT_DATA_PATH = PROJECT_ROOT / 'data' / 'incoming' / 'ai4i_predictive_maintenance_modified.csv'

REPORTS_DIR = PROJECT_ROOT / 'reports'

FEATURES = [
    'Type',
    'Air temperature [K]',
    'Process temperature [K]',
    'Rotational speed [rpm]',
    'Torque [Nm]',
    'Tool wear [min]'
]
TARGET = 'Machine failure'


def load_model_bundle(model_path: Optional[str | Path] = None) -> Dict[str, Any]:
    """Loads model bundle pickle containing pipeline, threshold, and metadata."""
    if model_path is None:
        model_path = DEFAULT_MODEL_PATH
    model_path = Path(model_path)

    if not model_path.exists():
        raise FileNotFoundError(f"Champion model artifact not found at: {model_path}")

    with open(model_path, 'rb') as f:
        bundle = pickle.load(f)

    if not isinstance(bundle, dict) or 'pipeline' not in bundle:
        raise ValueError("Invalid model bundle format: expected dict with 'pipeline' key")

    return bundle


def evaluate_existing_model(
    model_path: Optional[str | Path] = None,
    data_path: Optional[str | Path] = None
) -> Dict[str, Any]:
    """
    Evaluates the existing Champion model on incoming labelled data batch.
    Computes Accuracy, Precision, Recall, F1-Score, PR-AUC, ROC-AUC, and Confusion Matrix.
    """
    if data_path is None:
        data_path = DEFAULT_DATA_PATH
    data_path = Path(data_path)

    bundle = load_model_bundle(model_path)
    pipe = bundle['pipeline']
    threshold = float(bundle.get('threshold', 0.5))
    model_name = bundle.get('model_name', 'Champion Model')
    model_version = bundle.get('version', '1')

    if not data_path.exists():
        raise FileNotFoundError(f"Evaluation dataset not found at: {data_path}")

    df = pd.read_csv(data_path, encoding='utf-8-sig')

    missing = set(FEATURES + [TARGET]) - set(df.columns)
    if missing:
        raise ValueError(f"Dataset missing required evaluation columns: {sorted(missing)}")

    X = df[FEATURES].copy()
    y = df[TARGET].astype(int).values

    # Generate prediction probabilities
    if hasattr(pipe, 'predict_proba'):
        probabilities = pipe.predict_proba(X)[:, 1]
    elif hasattr(pipe, 'decision_function'):
        scores = pipe.decision_function(X)
        probabilities = 1 / (1 + np.exp(-scores))
    else:
        probabilities = pipe.predict(X).astype(float)

    predictions = (probabilities >= threshold).astype(int)

    # Compute classification metrics
    acc = float(accuracy_score(y, predictions))
    prec = float(precision_score(y, predictions, zero_division=0))
    rec = float(recall_score(y, predictions, zero_division=0))
    f1 = float(f1_score(y, predictions, zero_division=0))
    
    try:
        pr_auc = float(average_precision_score(y, probabilities))
    except Exception:
        pr_auc = 0.0

    try:
        roc_auc = float(roc_auc_score(y, probabilities))
    except Exception:
        roc_auc = 0.0

    cm = confusion_matrix(y, predictions)
    tn, fp, fn, tp = [int(v) for v in cm.ravel()]

    clf_report = classification_report(y, predictions, output_dict=True, zero_division=0)
    baseline_metrics = bundle.get('metrics', {})

    report = {
        'evaluation_type': 'Task B — Champion Model Evaluation on New Batch',
        'model_name': model_name,
        'model_version': model_version,
        'model_path': str(model_path or DEFAULT_MODEL_PATH),
        'dataset_path': str(data_path),
        'sample_count': len(df),
        'decision_threshold': round(threshold, 4),
        'metrics': {
            'accuracy': round(acc, 4),
            'precision': round(prec, 4),
            'recall': round(rec, 4),
            'f1_score': round(f1, 4),
            'pr_auc': round(pr_auc, 4),
            'roc_auc': round(roc_auc, 4)
        },
        'confusion_matrix': {
            'matrix': cm.tolist(),
            'true_negatives': tn,
            'false_positives': fp,
            'false_negatives': fn,
            'true_positives': tp
        },
        'classification_report': clf_report,
        'baseline_metrics': baseline_metrics,
        'metric_comparison_vs_baseline': {}
    }

    if baseline_metrics:
        for k in ['accuracy', 'precision', 'recall', 'f1', 'pr_auc', 'roc_auc']:
            base_k = 'f1' if k == 'f1_score' else k
            if base_k in baseline_metrics:
                cur_val = report['metrics'].get(k if k != 'f1' else 'f1_score', 0)
                base_val = round(float(baseline_metrics[base_k]), 4)
                delta = round(cur_val - base_val, 4)
                report['metric_comparison_vs_baseline'][k] = {
                    'baseline': base_val,
                    'current': cur_val,
                    'delta': delta,
                    'status': 'IMPROVED' if delta > 0 else ('DEGRADED' if delta < -0.05 else 'STABLE')
                }

    return report


def save_evaluation_report(report: Dict[str, Any], output_path: Optional[str | Path] = None) -> Path:
    """Saves evaluation report to JSON in reports directory."""
    if output_path is None:
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        output_path = REPORTS_DIR / 'model_evaluation_report.json'
    else:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)

    return output_path


def print_evaluation_summary(report: Dict[str, Any]) -> None:
    """Prints a neat, clean, formatted summary of Champion evaluation."""
    m = report['metrics']
    cm = report['confusion_matrix']
    dataset_name = Path(report['dataset_path']).name

    print("----------------------------------------------------------------------------------------")
    print(f" [TASK B] CHAMPION MODEL EVALUATION (ON NEW DATASET: {dataset_name})")
    print("----------------------------------------------------------------------------------------")
    print(f"  • Model Architecture:   {report['model_name']} (v{report['model_version']})")
    print(f"  • Evaluated Samples:    {report['sample_count']:,} records from new dataset")
    print(f"  • Decision Threshold:   {report['decision_threshold']}")
    print("  • Classification Performance Breakdown:")
    print("      ┌──────────────────────┬──────────────┬───────────────────────────────────────────┐")
    print("      │ Metric               │ Score        │ Operational Significance                  │")
    print("      ├──────────────────────┼──────────────┼───────────────────────────────────────────┤")
    print(f"      │ Accuracy             │ {m['accuracy']*100:6.2f}%       │ High overall correct rate                 │")
    print(f"      │ Recall (Safety)      │ {m['recall']*100:6.2f}%       │ Catches {cm['true_positives']} of {cm['true_positives'] + cm['false_negatives']} actual breakdowns        │")
    print(f"      │ F1-Score             │ {m['f1_score']*100:6.2f}%       │ Harmonic balance of Precision & Recall    │")
    print(f"      │ Precision            │ {m['precision']*100:6.2f}%       │ 1 in 2 alarms is an actual breakdown      │")
    print(f"      │ PR-AUC               │ {m['pr_auc']:6.4f}        │ Minority-class precision-recall curve     │")
    print(f"      │ ROC-AUC              │ {m['roc_auc']:6.4f}        │ Discrimination across all thresholds      │")
    print("      └──────────────────────┴──────────────┴───────────────────────────────────────────┘")
    print("  • Breakdown Confusion Matrix:")
    print(f"      - Caught Breakdowns (TP):  {cm['true_positives']:,}   (Early intervention success)")
    print(f"      - Missed Breakdowns (FN):  {cm['false_negatives']:,}   (Unplanned catastrophic downtime!)")
    print(f"      - False Alarms (FP):       {cm['false_positives']:,}   (Routine 5-min visual inspections)")
    print(f"      - Normal Cycles (TN):      {cm['true_negatives']:,}")
    print(f"  -> Audit: Champion model maintains {m['recall']*100:.2f}% recall, but leaves {cm['false_negatives']} failures undetected.")
    print("----------------------------------------------------------------------------------------\n")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="Evaluate existing Champion model on incoming batch")
    parser.add_argument('--model', type=str, default=str(DEFAULT_MODEL_PATH), help="Path to champion model bundle")
    parser.add_argument('--data', type=str, default=str(DEFAULT_DATA_PATH), help="Path to evaluation data CSV")
    parser.add_argument('--output', type=str, default=None, help="Path to output JSON report")
    args = parser.parse_args()

    report = evaluate_existing_model(args.model, args.data)
    saved_path = save_evaluation_report(report, args.output)
    print_evaluation_summary(report)
    print(f"Evaluation report saved to: {saved_path}")
