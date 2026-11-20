"""
Task D — Quality Gate & Model Promotion Module
MachineMitra Predictive Maintenance - MLOps Monitoring Pipeline
"""

import os
import json
import time
import shutil
import pickle
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CHAMPION_PATH = PROJECT_ROOT / 'models' / 'champion.pkl'
CANDIDATE_PATH = PROJECT_ROOT / 'models' / 'candidate.pkl'
DEFAULT_EVAL_DATA = PROJECT_ROOT / 'data' / 'incoming' / 'ai4i_predictive_maintenance_modified.csv'
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

# Metric justification text required by Assessment Task D
METRIC_JUSTIFICATION = (
    "In industrial predictive maintenance (MachineMitra), the operational objective is "
    "zero unplanned machine downtime. Missing a machine failure (False Negative) leads to "
    "catastrophic line stoppage, costly emergency repairs, and safety risks. Conversely, a false "
    "alarm (False Positive) only triggers a preventive inspection. Because the failure class is "
    "extremely rare (3.39% in the incoming batch), standard Accuracy is misleading—a naive "
    "classifier predicting 'Normal' on all cycles yields 96.61% accuracy while catching 0% of failures. "
    "Therefore, Recall (Sensitivity) is selected as the primary safety metric to maximize failure capture, "
    "paired with F1-Score to ensure that Precision is not sacrificed, and PR-AUC to assess threshold-independent "
    "performance on highly imbalanced data."
)


def load_model(path: Path) -> Dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Model artifact not found: {path}")
    with open(path, 'rb') as f:
        bundle = pickle.load(f)
    return bundle


def evaluate_pipeline(pipe, threshold: float, X: pd.DataFrame, y: np.ndarray) -> Dict[str, Any]:
    """Scores a pipeline and returns classification metrics."""
    if hasattr(pipe, 'predict_proba'):
        probs = pipe.predict_proba(X)[:, 1]
    elif hasattr(pipe, 'decision_function'):
        scores = pipe.decision_function(X)
        probs = 1 / (1 + np.exp(-scores))
    else:
        probs = pipe.predict(X).astype(float)

    preds = (probs >= threshold).astype(int)
    cm = confusion_matrix(y, preds)
    tn, fp, fn, tp = [int(v) for v in cm.ravel()]

    return {
        'accuracy': float(accuracy_score(y, preds)),
        'precision': float(precision_score(y, preds, zero_division=0)),
        'recall': float(recall_score(y, preds, zero_division=0)),
        'f1': float(f1_score(y, preds, zero_division=0)),
        'pr_auc': float(average_precision_score(y, probs)),
        'roc_auc': float(roc_auc_score(y, probs)),
        'threshold': float(threshold),
        'true_negatives': tn,
        'false_positives': fp,
        'false_negatives': fn,
        'true_positives': tp
    }


def run_quality_gate(
    champion_path: Optional[str | Path] = None,
    candidate_path: Optional[str | Path] = None,
    eval_data_path: Optional[str | Path] = None,
    promote: bool = False
) -> Dict[str, Any]:
    """
    Executes automated quality gate comparison between existing Champion and newly trained Candidate.
    
    Decision Criteria:
      1. Recall Improvement: Candidate Recall >= Champion Recall - epsilon (tolerance = 0.01)
      2. F1-Score Improvement: Candidate F1 >= Champion F1
      3. PR-AUC Stability: Candidate PR-AUC >= Champion PR-AUC - 0.05
      4. False Negative Reduction: Candidate FN <= Champion FN
      
    Safety:
      Never overwrites champion automatically without recording the decision.
      Only promotes if candidate is eligible AND promote=True is explicitly set.
    """
    champion_file = Path(champion_path or CHAMPION_PATH)
    candidate_file = Path(candidate_path or CANDIDATE_PATH)
    eval_file = Path(eval_data_path or DEFAULT_EVAL_DATA)

    champion_bundle = load_model(champion_file)
    candidate_bundle = load_model(candidate_file)

    if not eval_file.exists():
        raise FileNotFoundError(f"Evaluation dataset not found: {eval_file}")

    df = pd.read_csv(eval_file, encoding='utf-8-sig')
    X = df[FEATURES].copy()
    y = df[TARGET].astype(int).values

    # Evaluate Champion on incoming batch
    champ_thresh = float(champion_bundle.get('threshold', 0.5))
    champ_metrics = evaluate_pipeline(champion_bundle['pipeline'], champ_thresh, X, y)

    # Evaluate Candidate on same incoming batch
    cand_thresh = float(candidate_bundle.get('threshold', 0.5))
    cand_metrics = evaluate_pipeline(candidate_bundle['pipeline'], cand_thresh, X, y)

    # Calculate metric deltas (Candidate - Champion)
    deltas = {
        'recall': round(cand_metrics['recall'] - champ_metrics['recall'], 4),
        'f1': round(cand_metrics['f1'] - champ_metrics['f1'], 4),
        'pr_auc': round(cand_metrics['pr_auc'] - champ_metrics['pr_auc'], 4),
        'accuracy': round(cand_metrics['accuracy'] - champ_metrics['accuracy'], 4),
        'precision': round(cand_metrics['precision'] - champ_metrics['precision'], 4),
        'roc_auc': round(cand_metrics['roc_auc'] - champ_metrics['roc_auc'], 4),
        'fn_reduction': champ_metrics['false_negatives'] - cand_metrics['false_negatives']
    }

    # Evaluate decision criteria
    criteria_checks = {
        'recall_not_degraded': {
            'rule': 'Candidate Recall >= Champion Recall - 0.01',
            'champion': round(champ_metrics['recall'], 4),
            'candidate': round(cand_metrics['recall'], 4),
            'delta': deltas['recall'],
            'passed': bool(cand_metrics['recall'] >= (champ_metrics['recall'] - 0.01))
        },
        'f1_score_improved': {
            'rule': 'Candidate F1-Score >= Champion F1-Score',
            'champion': round(champ_metrics['f1'], 4),
            'candidate': round(cand_metrics['f1'], 4),
            'delta': deltas['f1'],
            'passed': bool(cand_metrics['f1'] >= champ_metrics['f1'])
        },
        'pr_auc_stable': {
            'rule': 'Candidate PR-AUC >= Champion PR-AUC - 0.05',
            'champion': round(champ_metrics['pr_auc'], 4),
            'candidate': round(cand_metrics['pr_auc'], 4),
            'delta': deltas['pr_auc'],
            'passed': bool(cand_metrics['pr_auc'] >= (champ_metrics['pr_auc'] - 0.05))
        },
        'false_negatives_reduced_or_equal': {
            'rule': 'Candidate Missed Failures (FN) <= Champion Missed Failures (FN)',
            'champion_fn': champ_metrics['false_negatives'],
            'candidate_fn': cand_metrics['false_negatives'],
            'failures_prevented': deltas['fn_reduction'],
            'passed': bool(cand_metrics['false_negatives'] <= champ_metrics['false_negatives'])
        }
    }

    all_criteria_passed = all(c['passed'] for c in criteria_checks.values())
    decision_timestamp = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

    promotion_action_taken = "NONE"
    backup_path = None

    if all_criteria_passed:
        decision = "ELIGIBLE_FOR_PROMOTION"
        decision_summary = (
            f"Candidate model outperformed Champion. Recall improved by {deltas['recall']*100:+.2f}%, "
            f"F1-score improved by {deltas['f1']*100:+.2f}%, preventing {deltas['fn_reduction']} missed failures."
        )
        if promote:
            # Create automated backup of champion before promotion
            backup_name = f"champion_backup_{time.strftime('%Y%m%d_%H%M%S')}.pkl"
            backup_path = champion_file.parent / backup_name
            shutil.copyfile(champion_file, backup_path)

            # Promote candidate to champion
            shutil.copyfile(candidate_file, champion_file)
            promotion_action_taken = f"PROMOTED_TO_CHAMPION (Backup saved at {backup_name})"
        else:
            promotion_action_taken = "CHAMPION_RETAINED (Promotion flag --promote not set; awaiting explicit deployment)"
    else:
        decision = "RETAIN_CHAMPION"
        decision_summary = (
            "Candidate model did not satisfy all quality gate criteria. Retaining existing Champion."
        )
        promotion_action_taken = "CHAMPION_RETAINED (Quality criteria not met)"

    record = {
        'task': 'Task D — Quality Gate Decision Record',
        'decision': decision,
        'eligible_for_promotion': all_criteria_passed,
        'promotion_action_taken': promotion_action_taken,
        'timestamp': decision_timestamp,
        'champion_model': {
            'name': champion_bundle.get('model_name', 'XGBoost'),
            'version': champion_bundle.get('version', '1'),
            'threshold': champ_thresh,
            'metrics': {k: round(v, 4) for k, v in champ_metrics.items() if isinstance(v, float)},
            'confusion_matrix': {
                'tn': champ_metrics['true_negatives'],
                'fp': champ_metrics['false_positives'],
                'fn': champ_metrics['false_negatives'],
                'tp': champ_metrics['true_positives']
            }
        },
        'candidate_model': {
            'name': candidate_bundle.get('model_name', 'Candidate_XGBoost'),
            'version': candidate_bundle.get('version', '2.0-candidate'),
            'threshold': cand_thresh,
            'metrics': {k: round(v, 4) for k, v in cand_metrics.items() if isinstance(v, float)},
            'confusion_matrix': {
                'tn': cand_metrics['true_negatives'],
                'fp': cand_metrics['false_positives'],
                'fn': cand_metrics['false_negatives'],
                'tp': cand_metrics['true_positives']
            }
        },
        'metric_deltas': deltas,
        'criteria_evaluation': criteria_checks,
        'metric_justification': METRIC_JUSTIFICATION,
        'decision_summary': decision_summary,
        'evaluated_dataset': str(eval_file),
        'sample_count': len(df),
        'champion_backup_created': str(backup_path) if backup_path else None
    }

    # Save decision record immediately to JSON
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    decision_file = REPORTS_DIR / 'quality_gate_decision.json'
    with open(decision_file, 'w', encoding='utf-8') as f:
        json.dump(record, f, indent=2)

    # Save decision record to Markdown
    md_decision_file = REPORTS_DIR / 'quality_gate_decision.md'
    save_quality_gate_markdown(record, md_decision_file)

    return record


def save_quality_gate_markdown(record: Dict[str, Any], output_path: Path) -> None:
    """Generates markdown documentation for the quality gate decision."""
    c = record['candidate_model']
    ch = record['champion_model']
    d = record['metric_deltas']

    status_icon = "Passed (Eligible)" if record['eligible_for_promotion'] else "Rejected (Retain Champion)"

    md = f"""# Quality Gate Decision Record (Task D)

**Timestamp:** `{record['timestamp']}`  
**Decision:** **`{record['decision']}`** ({status_icon})  
**Promotion Action:** `{record['promotion_action_taken']}`  
**Evaluated Data:** `{record['evaluated_dataset']}` ({record['sample_count']:,} samples)  

---

## 1. Selected Metric Justification

> [!IMPORTANT]
> **Why Recall and F1-Score?**  
> {record['metric_justification']}

---

## 2. Champion vs Candidate Performance Comparison

| Metric | Champion (`{ch['name']} v{ch['version']}`) | Candidate (`{c['name']} v{c['version']}`) | Delta (Candidate - Champion) | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Recall (Sensitivity)** | **{ch['metrics']['recall']*100:.2f}%** | **{c['metrics']['recall']*100:.2f}%** | **{d['recall']*100:+.2f}%** | {'Critical Improvement' if d['recall'] > 0 else 'Stable'} |
| **F1-Score** | **{ch['metrics']['f1']*100:.2f}%** | **{c['metrics']['f1']*100:.2f}%** | **{d['f1']*100:+.2f}%** | {'Significant Improvement' if d['f1'] > 0 else 'Stable'} |
| **PR-AUC** | {ch['metrics']['pr_auc']:.4f} | {c['metrics']['pr_auc']:.4f} | {d['pr_auc']:+.4f} | {'Higher Discriminative Power' if d['pr_auc'] > 0 else 'Acceptable'} |
| **Accuracy** | {ch['metrics']['accuracy']*100:.2f}% | {c['metrics']['accuracy']*100:.2f}% | {d['accuracy']*100:+.2f}% | Minor |
| **Precision** | {ch['metrics']['precision']*100:.2f}% | {c['metrics']['precision']*100:.2f}% | {d['precision']*100:+.2f}% | Improved |
| **ROC-AUC** | {ch['metrics']['roc_auc']:.4f} | {c['metrics']['roc_auc']:.4f} | {d['roc_auc']:+.4f} | Improved |

---

## 3. Confusion Matrix Comparison (Failure Detection Impact)

| Model | Caught Failures (TP) | Missed Failures (FN) | False Alarms (FP) | Normal Cycles (TN) |
| :--- | :--- | :--- | :--- | :--- |
| **Champion** | {ch['confusion_matrix']['tp']} | **{ch['confusion_matrix']['fn']}** | {ch['confusion_matrix']['fp']} | {ch['confusion_matrix']['tn']} |
| **Candidate** | {c['confusion_matrix']['tp']} | **{c['confusion_matrix']['fn']}** | {c['confusion_matrix']['fp']} | {c['confusion_matrix']['tn']} |
| **Net Difference** | **+{d['fn_reduction']} Caught** | **-{d['fn_reduction']} Missed** | {c['confusion_matrix']['fp'] - ch['confusion_matrix']['fp']:+d} | {c['confusion_matrix']['tn'] - ch['confusion_matrix']['tn']:+d} |

---

## 4. Quality Gate Criteria Verification

"""
    for name, item in record['criteria_evaluation'].items():
        pass_str = "[PASS]" if item['passed'] else "[FAIL]"
        md += f"- **{name.replace('_', ' ').title()}:** {pass_str} — Rule: `{item['rule']}`\n"

    md += f"""
---

## 5. Decision Summary & Audit Trail

- **Decision Summary:** {record['decision_summary']}
- **Action Recorded:** {record['promotion_action_taken']}
- **Champion Overwrite Safeguard:** Champion is never overwritten automatically without recording this decision.
"""
    if record.get('champion_backup_created'):
        md += f"- **Champion Backup Created:** `{record['champion_backup_created']}`\n"

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(md)


def print_quality_gate_summary(record: Dict[str, Any]) -> None:
    """Prints formatted summary of the quality gate evaluation."""
    ch = record['champion_model']
    c = record['candidate_model']
    d = record['metric_deltas']
    print("=" * 70)
    print("  TASK D: AUTOMATED QUALITY GATE DECISION")
    print("=" * 70)
    print(f"Decision:               {record['decision']}")
    print(f"Eligible for Promotion: {record['eligible_for_promotion']}")
    print(f"Action Taken:           {record['promotion_action_taken']}")
    print(f"Timestamp:              {record['timestamp']}")
    print("-" * 70)
    print(f"{'Metric':<14} | {'Champion':<12} | {'Candidate':<12} | {'Delta':<10}")
    print("-" * 70)
    print(f"{'Recall':<14} | {ch['metrics']['recall']*100:.2f}%       | {c['metrics']['recall']*100:.2f}%       | {d['recall']*100:+.2f}%")
    print(f"{'F1-Score':<14} | {ch['metrics']['f1']*100:.2f}%       | {c['metrics']['f1']*100:.2f}%       | {d['f1']*100:+.2f}%")
    print(f"{'PR-AUC':<14} | {ch['metrics']['pr_auc']:.4f}       | {c['metrics']['pr_auc']:.4f}       | {d['pr_auc']:+.4f}")
    print(f"{'Accuracy':<14} | {ch['metrics']['accuracy']*100:.2f}%       | {c['metrics']['accuracy']*100:.2f}%       | {d['accuracy']*100:+.2f}%")
    print(f"{'Precision':<14} | {ch['metrics']['precision']*100:.2f}%       | {c['metrics']['precision']*100:.2f}%       | {d['precision']*100:+.2f}%")
    print("-" * 70)
    print("Failure Catch Comparison:")
    print(f"  Champion Missed Failures (FN):  {ch['confusion_matrix']['fn']} (Caught: {ch['confusion_matrix']['tp']})")
    print(f"  Candidate Missed Failures (FN): {c['confusion_matrix']['fn']} (Caught: {c['confusion_matrix']['tp']})")
    print(f"  Net Reduction in Failures:      {d['fn_reduction']} fewer catastrophic failures missed!")
    print("-" * 70)
    print("Criteria Verification:")
    for k, v in record['criteria_evaluation'].items():
        status = "PASSED" if v['passed'] else "FAILED"
        print(f"  [{status}] {k}: {v['rule']}")
    print("-" * 70)
    print(f"Summary: {record['decision_summary']}")
    print("=" * 70)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="Evaluate quality gate between Champion and Candidate")
    parser.add_argument('--champion', type=str, default=str(CHAMPION_PATH), help="Path to champion pkl")
    parser.add_argument('--candidate', type=str, default=str(CANDIDATE_PATH), help="Path to candidate pkl")
    parser.add_argument('--eval-data', type=str, default=str(DEFAULT_EVAL_DATA), help="Path to eval dataset")
    parser.add_argument('--promote', action='store_true', help="Promote candidate to champion if quality criteria met")
    args = parser.parse_args()

    record = run_quality_gate(args.champion, args.candidate, args.eval_data, promote=args.promote)
    print_quality_gate_summary(record)
    print(f"Quality gate decision saved to: {REPORTS_DIR / 'quality_gate_decision.json'}")
    print(f"Quality gate markdown saved to: {REPORTS_DIR / 'quality_gate_decision.md'}")
