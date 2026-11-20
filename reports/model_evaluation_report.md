# Model Evaluation Report (Task B)

**Model:** XGBoost (v1)  
**Dataset:** `D:\AiOPS\machinemitra-predictive-maintenance\data\incoming\ai4i_predictive_maintenance_modified.csv` (10,000 samples)  
**Decision Threshold:** `0.3088`  

---

## 1. Classification Metrics Summary

| Metric | Score | Industrial Context / Significance |
| :--- | :--- | :--- |
| **Accuracy** | **96.64%** | Overall correct predictions (can be misleading due to class imbalance) |
| **Precision** | **50.28%** | When model flags a failure, chance it is an actual failure |
| **Recall (Sensitivity)** | **80.83%** | Percentage of actual machine failures correctly identified |
| **F1-Score** | **61.99%** | Harmonic balance between Precision and Recall |
| **PR-AUC** | **0.7324** | Area under Precision-Recall Curve (primary metric for imbalanced data) |
| **ROC-AUC** | **0.9785** | Model discriminative capability across all thresholds |

---

## 2. Confusion Matrix

```
                      PREDICTED NORMAL    PREDICTED FAILURE
ACTUAL NORMAL (0)        9390               271 (False Alarms)
ACTUAL FAILURE (1)       65                 274 (Caught Failures)
```

- **True Positives (TP):** 274 failures caught in advance.
- **False Negatives (FN):** 65 failures missed.
- **False Positives (FP):** 271 false alarms.
- **True Negatives (TN):** 9390 correctly identified normal operating cycles.

---

## 3. Comparison with Training Baseline

| Metric | Baseline (Train/Test) | Current (New Batch) | Delta | Status |
| :--- | :--- | :--- | :--- | :--- |
| ACCURACY | 0.9653 | 0.9664 | +0.0011 | `IMPROVED` |
| PRECISION | 0.4940 | 0.5028 | +0.0088 | `IMPROVED` |
| RECALL | 0.8039 | 0.8083 | +0.0044 | `IMPROVED` |
| F1 | 0.6119 | 0.6199 | +0.0080 | `IMPROVED` |
| PR_AUC | 0.7800 | 0.7324 | -0.0476 | `STABLE` |
| ROC_AUC | 0.9708 | 0.9785 | +0.0077 | `IMPROVED` |
