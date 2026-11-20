# Quality Gate Decision Record (Task D)

**Timestamp:** `2026-11-20T06:53:55Z`  
**Decision:** **`ELIGIBLE_FOR_PROMOTION`** (Passed (Eligible))  
**Promotion Action:** `CHAMPION_RETAINED (Promotion flag --promote not set; awaiting explicit deployment)`  
**Evaluated Data:** `D:\AiOPS\machinemitra-predictive-maintenance\data\incoming\ai4i_predictive_maintenance_modified.csv` (10,000 samples)  

---

## 1. Selected Metric Justification

> [!IMPORTANT]
> **Why Recall and F1-Score?**  
> In industrial predictive maintenance (MachineMitra), the operational objective is zero unplanned machine downtime. Missing a machine failure (False Negative) leads to catastrophic line stoppage, costly emergency repairs, and safety risks. Conversely, a false alarm (False Positive) only triggers a preventive inspection. Because the failure class is extremely rare (3.39% in the incoming batch), standard Accuracy is misleading—a naive classifier predicting 'Normal' on all cycles yields 96.61% accuracy while catching 0% of failures. Therefore, Recall (Sensitivity) is selected as the primary safety metric to maximize failure capture, paired with F1-Score to ensure that Precision is not sacrificed, and PR-AUC to assess threshold-independent performance on highly imbalanced data.

---

## 2. Champion vs Candidate Performance Comparison

| Metric | Champion (`XGBoost v1`) | Candidate (`Candidate_XGBoost v2.0-candidate`) | Delta (Candidate - Champion) | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Recall (Sensitivity)** | **80.83%** | **95.87%** | **+15.04%** | Critical Improvement |
| **F1-Score** | **61.99%** | **73.28%** | **+11.29%** | Significant Improvement |
| **PR-AUC** | 0.7324 | 0.9039 | +0.1715 | Higher Discriminative Power |
| **Accuracy** | 96.64% | 97.63% | +0.99% | Minor |
| **Precision** | 50.28% | 59.31% | +9.03% | Improved |
| **ROC-AUC** | 0.9785 | 0.9924 | +0.0140 | Improved |

---

## 3. Confusion Matrix Comparison (Failure Detection Impact)

| Model | Caught Failures (TP) | Missed Failures (FN) | False Alarms (FP) | Normal Cycles (TN) |
| :--- | :--- | :--- | :--- | :--- |
| **Champion** | 274 | **65** | 271 | 9390 |
| **Candidate** | 325 | **14** | 223 | 9438 |
| **Net Difference** | **+51 Caught** | **-51 Missed** | -48 | +48 |

---

## 4. Quality Gate Criteria Verification

- **Recall Not Degraded:** [PASS] — Rule: `Candidate Recall >= Champion Recall - 0.01`
- **F1 Score Improved:** [PASS] — Rule: `Candidate F1-Score >= Champion F1-Score`
- **Pr Auc Stable:** [PASS] — Rule: `Candidate PR-AUC >= Champion PR-AUC - 0.05`
- **False Negatives Reduced Or Equal:** [PASS] — Rule: `Candidate Missed Failures (FN) <= Champion Missed Failures (FN)`

---

## 5. Decision Summary & Audit Trail

- **Decision Summary:** Candidate model outperformed Champion. Recall improved by +15.04%, F1-score improved by +11.29%, preventing 51 missed failures.
- **Action Recorded:** CHAMPION_RETAINED (Promotion flag --promote not set; awaiting explicit deployment)
- **Champion Overwrite Safeguard:** Champion is never overwritten automatically without recording this decision.
