"""
Unit Tests for MachineMitra MLOps Monitoring, Retraining, and Quality Gate Pipeline
"""

import sys
import json
import pickle
from pathlib import Path
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, '/app')
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ml_pipeline.data_validation import validate_incoming_data, REQUIRED_FEATURES
from ml_pipeline.evaluate_model import evaluate_existing_model, load_model_bundle
from ml_pipeline.quality_gate import run_quality_gate, METRIC_JUSTIFICATION


@pytest.fixture
def incoming_csv_path():
    path = PROJECT_ROOT / 'data' / 'incoming' / 'new_batch_dataset.csv'
    if not path.exists():
        path = PROJECT_ROOT / 'data' / 'incoming' / 'ai4i_predictive_maintenance_modified.csv'
    assert path.exists(), f"Incoming CSV not found at {path}"
    return path


@pytest.fixture
def champion_model_path():
    path = PROJECT_ROOT / 'models' / 'champion.pkl'
    assert path.exists(), f"Champion model not found at {path}"
    return path


@pytest.fixture
def candidate_model_path():
    path = PROJECT_ROOT / 'models' / 'candidate.pkl'
    assert path.exists(), f"Candidate model not found at {path}"
    return path


def test_task_a_data_validation(incoming_csv_path):
    """Test Task A: Schema validation, null checking, duplicate checking, and target distribution."""
    report = validate_incoming_data(incoming_csv_path)

    assert report['is_valid'] is True
    assert report['status'] == 'PASSED'
    assert report['total_rows'] == 10000
    assert report['total_columns'] >= 14

    # Verify required feature validation
    for feat in REQUIRED_FEATURES:
        assert feat in report['columns']

    # Verify extra columns detected
    assert 'Vibration [mm/s]' in report['extra_columns_detected']
    assert 'Humidity [%]' in report['extra_columns_detected']

    # Verify null values and duplicates
    assert report['missing_values']['total_nulls_in_required'] == 0
    assert report['duplicates']['full_row_duplicates'] == 0

    # Verify target distribution
    td = report['target_distribution']
    assert td['total_normal'] == 9661
    assert td['total_failures'] == 339
    assert td['failure_rate_percent'] == pytest.approx(3.39, abs=0.1)


def test_task_b_champion_evaluation(champion_model_path, incoming_csv_path):
    """Test Task B: Loading champion model, predicting on new batch, calculating classification metrics."""
    bundle = load_model_bundle(champion_model_path)
    assert 'pipeline' in bundle
    assert 'model_name' in bundle

    report = evaluate_existing_model(champion_model_path, incoming_csv_path)
    metrics = report['metrics']

    assert report['sample_count'] == 10000
    assert 0.0 <= metrics['accuracy'] <= 1.0
    assert 0.0 <= metrics['precision'] <= 1.0
    assert 0.0 <= metrics['recall'] <= 1.0
    assert 0.0 <= metrics['f1_score'] <= 1.0
    assert 0.0 <= metrics['pr_auc'] <= 1.0
    assert 0.0 <= metrics['roc_auc'] <= 1.0

    # Ensure baseline reasonable performance on imbalanced data
    assert metrics['accuracy'] > 0.90
    assert metrics['recall'] > 0.70
    assert metrics['f1_score'] > 0.50

    # Verify confusion matrix consistency
    cm = report['confusion_matrix']
    total_preds = cm['true_negatives'] + cm['false_positives'] + cm['false_negatives'] + cm['true_positives']
    assert total_preds == 10000


def test_task_c_candidate_artifact(candidate_model_path):
    """Test Task C: Verifying candidate model artifact exists separately from champion."""
    with open(candidate_model_path, 'rb') as f:
        cand_bundle = pickle.load(f)

    assert 'pipeline' in cand_bundle
    assert 'threshold' in cand_bundle
    assert 'metrics' in cand_bundle
    assert cand_bundle['version'] == '2.0-candidate'
    assert cand_bundle['dataset_info']['total_samples'] == 20000


def test_task_d_quality_gate_logic(champion_model_path, candidate_model_path, incoming_csv_path):
    """Test Task D: Automated quality gate comparison, metric justification, and overwrite safeguard."""
    # Ensure champion is never overwritten automatically when promote=False
    champ_stat_before = champion_model_path.stat().st_mtime

    record = run_quality_gate(
        champion_path=champion_model_path,
        candidate_path=candidate_model_path,
        eval_data_path=incoming_csv_path,
        promote=False
    )

    champ_stat_after = champion_model_path.stat().st_mtime
    assert champ_stat_before == champ_stat_after, "Champion file was modified without explicit promotion flag!"

    assert record['task'].startswith('Task D')
    assert record['decision'] in ['ELIGIBLE_FOR_PROMOTION', 'RETAIN_CHAMPION']
    assert record['promotion_action_taken'].startswith('CHAMPION_RETAINED')
    assert 'Recall' in record['metric_justification']
    assert 'F1-Score' in record['metric_justification']

    # Verify deltas exist
    deltas = record['metric_deltas']
    assert 'recall' in deltas
    assert 'f1' in deltas
    assert 'fn_reduction' in deltas
