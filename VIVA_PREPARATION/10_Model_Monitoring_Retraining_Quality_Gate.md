# 10. Model Monitoring, Retraining, and Quality Gate (MLOps Practical Assessment)

> [!NOTE]
> **Assessment Theme:** Extend MachineMitra with a robust model-quality monitoring, automated retraining, and quality-gated promotion capability using the modified AI4I 2020 predictive maintenance dataset.

---

## 1. System Architecture & Workflow

```mermaid
flowchart TD
    A["Incoming Data Batch<br/>(10,000 samples)"] --> B["Task A: Data Validation<br/>(Schema, Duplicates, Nulls, Imbalance)"]
    B -->|Passed (10k rows, 0 nulls)| C["Task B: Champion Evaluation<br/>(Evaluate existing XGBoost v1)"]
    
    C --> D["Task C: Candidate Retraining<br/>(Combine Raw 10k + Batch 10k = 20k rows)"]
    D --> E["Save Candidate Model<br/>('models/candidate.pkl')"]
    D --> F["Log Run in MLflow<br/>(Metrics, Params & Pipeline Artifact)"]
    
    E --> G["Task D: Quality Gate Decision<br/>(Compare Champion vs Candidate)"]
    C --> G
    
    G --> H{"Quality Criteria Met?<br/>(Recall >= 80.8%, F1 >= 62.0%)"}
    H -->|Yes| I["Decision: ELIGIBLE_FOR_PROMOTION<br/>(Champion Retained by Default)"]
    H -->|No| J["Decision: RETAIN_CHAMPION"]
    
    I --> K["Task E: Audit Trail & Reports<br/>(JSON & Markdown Artifacts)"]
    J --> K
```

---

## 2. Assessment Task Breakdown & Execution Results

### Task A — Prepare New Data (`ml_pipeline/data_validation.py`)
- **Dataset Ingested:** `data/incoming/ai4i_predictive_maintenance_modified.csv`
- **Dataset Dimensions:** 10,000 rows × 16 columns.
- **Schema Validation:**
  - Required Features: `Type`, `Air temperature [K]`, `Process temperature [K]`, `Rotational speed [rpm]`, `Torque [Nm]`, `Tool wear [min]` (All present).
  - Target Feature: `Machine failure` (Present).
  - Extra Columns Detected: `UDI`, `Product ID`, `Vibration [mm/s]`, `Humidity [%]`, `TWF`, `HDF`, `PWF`, `OSF`, `RNF`.
- **Data Quality Audit:**
  - Missing values in required features: **0 (0.0%)**.
  - Duplicate rows / duplicate IDs: **0 (0.0%)**.
- **Target Distribution (Machine failure):**
  - Class 0 (Normal): **9,661 (96.61%)**
  - Class 1 (Failure): **339 (3.39%)**
  - Imbalance Ratio: **28.5 : 1** (Heavily imbalanced industrial scenario).
- **Artifact Generated:** `reports/data_validation_report.json`

---

### Task B — Evaluate Existing Model (`ml_pipeline/evaluate_model.py`)
- **Champion Model Loaded:** `models/champion.pkl` (XGBoost Classifier v1).
- **Calibrated Decision Threshold:** `0.3088` (optimized on validation $F_2$-score).
- **Evaluated Samples:** 10,000 samples from the new incoming batch.
- **Classification Performance:**

| Metric | Score | Industrial Interpretation |
| :--- | :--- | :--- |
| **Accuracy** | **96.64%** | Overall correct predictions |
| **Precision** | **50.28%** | ~1 in 2 failure alarms indicates a real breakdown |
| **Recall (Sensitivity)** | **80.83%** | **Catches 274 out of 339 actual machine failures** |
| **F1-Score** | **61.99%** | Harmonic balance between Precision and Recall |
| **PR-AUC** | **0.7324** | Area under Precision-Recall Curve for rare classes |
| **ROC-AUC** | **0.9785** | Overall threshold-independent discrimination |

- **Confusion Matrix:**
  - True Negatives (TN): 9,390 (Correctly identified normal cycles)
  - False Positives (FP): 271 (False alarms / preventive inspections)
  - False Negatives (FN): 65 (Missed catastrophic breakdowns)
  - True Positives (TP): 274 (Breakdowns successfully intercepted)
- **Artifacts Generated:** `reports/model_evaluation_report.json` and `reports/model_evaluation_report.md`

---

### Task C — Retrain Candidate Model (`ml_pipeline/retrain.py`)
- **Dataset Synthesis:**
  - Existing training data (`data/raw/ai4i2020.csv`): 10,000 records.
  - Incoming batch data (`data/incoming/...`): 10,000 records.
  - Combined training pool: **20,000 records** (678 total failures).
- **Pipeline & Preprocessing:**
  - `ColumnTransformer` with `OneHotEncoder(handle_unknown='ignore')` for `Type`.
  - `SimpleImputer(strategy='median')` + `StandardScaler()` for 5 numerical sensor channels.
  - Split: 70% Train (14,000), 15% Validation (3,000), 15% Holdout Test (3,000) with stratification.
- **Algorithm & Class Imbalance Handling:**
  - XGBoost Classifier with `scale_pos_weight = 28.5` (negative-to-positive ratio).
  - Validation threshold optimization maximizing $F_2$-score ($\beta = 2.0$, heavily weighting Recall).
  - Optimal threshold determined: `0.5022`.
- **Model Artifact Preservation:**
  - Candidate model saved separately at `models/candidate.pkl`.
  - Champion model (`models/champion.pkl`) left untouched.
- **MLflow Tracking:**
  - Logged run name: `Candidate Retraining (Combined Data)`.
  - Logged parameters: `model_type`, `total_samples=20000`, `decision_threshold=0.5022`, `scale_pos_weight=28.497`.
  - Logged test and incoming batch metrics (`accuracy`, `precision`, `recall`, `f1`, `pr_auc`, `roc_auc`).
  - Saved model artifact in MLflow model registry: `candidate_model`.

---

### Task D — Implement Quality Gate (`ml_pipeline/quality_gate.py`)
- **Comparative Evaluation on Incoming Batch:**

| Metric | Champion (`XGBoost v1`) | Candidate (`Candidate_XGBoost v2`) | Delta ($\Delta$) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Recall (Sensitivity)** | **80.83%** | **95.87%** | **+15.04%** | **Massive Gain** |
| **F1-Score** | **61.99%** | **73.28%** | **+11.29%** | **Massive Gain** |
| **PR-AUC** | 0.7324 | 0.9039 | +0.1715 | Substantial Improvement |
| **Accuracy** | 96.64% | 97.63% | +0.99% | Improved |
| **Precision** | 50.28% | 59.31% | +9.03% | Improved |
| **Missed Failures (FN)** | 65 missed | 14 missed | **-51 failures** | **51 fewer catastrophic breakdowns!** |
| **Caught Failures (TP)** | 274 caught | 325 caught | **+51 caught** | Intercepts 95.9% of failures |

#### Metric Choice & Justification (Mandatory Viva Topic)
> [!IMPORTANT]
> **Why Recall and F1-score instead of Accuracy?**
> 1. **Extreme Class Imbalance:** Failures represent only 3.39% of operations. A useless dummy model predicting "0" for every record would achieve **96.61% Accuracy** despite failing to prevent a single catastrophic machine failure.
> 2. **Asymmetric Business Cost:** In manufacturing, the cost of a **False Negative (FN)**—an undetected catastrophic tool breakage or overheating incident—causes line stoppage, secondary machine damage, and thousands of dollars in lost throughput. A **False Positive (FP)** merely prompts an inexpensive 5-minute visual inspection.
> 3. **The Role of F1-Score:** While Recall guarantees maximum safety, F1-Score ensures that Precision is maintained so technicians are not fatigued by an excessive false alarm rate.
> 4. **PR-AUC as Benchmark:** PR-AUC evaluates model ranking specifically on the minority positive class, unaffected by large numbers of true negatives.

#### Quality Gate Decision Rules:
1. `Candidate Recall >= Champion Recall - 0.01` -> **PASSED** (95.87% >= 79.83%)
2. `Candidate F1-Score >= Champion F1-Score` -> **PASSED** (73.28% >= 61.99%)
3. `Candidate PR-AUC >= Champion PR-AUC - 0.05` -> **PASSED** (0.9039 >= 0.6824)
4. `Candidate Missed Failures (FN) <= Champion FN` -> **PASSED** (14 <= 65)

- **Gate Decision:** `ELIGIBLE_FOR_PROMOTION`
- **Safeguard Enforcement:** `CHAMPION_RETAINED (Promotion flag --promote not set; awaiting explicit deployment)`.
  *Champion is NEVER automatically overwritten without explicit human confirmation and audit recording.*
- **Artifact Generated:** `reports/quality_gate_decision.json` and `reports/quality_gate_decision.md`

---

## 3. How to Run the Demonstration (Task E)

### Option 1: One-Click Windows Batch Script
```cmd
scripts\run_monitoring.bat
```

### Option 2: Python Command Line
```powershell
.\.venv\Scripts\python.exe ml_pipeline\run_monitoring_pipeline.py
```

### Option 3: Automated Pytest Suite
```powershell
.\.venv\Scripts\pytest.exe backend\tests -v
```

### Option 4: Inspect Reports
All reports are available in the `reports/` directory:
- `reports/data_validation_report.json`
- `reports/model_evaluation_report.json` & `.md`
- `reports/quality_gate_decision.json` & `.md`
- `reports/monitoring_pipeline_summary.json` & `.md`

---

## 4. Key Viva Questions & Answers

**Q1: What did you do with the new incoming dataset?**  
> We ingested the 10,000-record batch, ran schema validation against required sensor columns, checked for missing values (0 nulls found), verified duplicate counts (0 duplicates), and analyzed class distribution (96.61% normal vs 3.39% failure). We also detected extra sensor channels (`Vibration` and `Humidity`) present in the new batch.

**Q2: How did the existing Champion model perform on the new batch?**  
> The champion (XGBoost v1) achieved 96.64% Accuracy, 50.28% Precision, 80.83% Recall, and 61.99% F1-Score at its tuned threshold of 0.3088. It caught 274 out of 339 failures, but missed 65 breakdowns.

**Q3: How was the Candidate model retrained?**  
> We combined the baseline 10,000 raw samples with the new 10,000 incoming samples (20,000 total). We applied the existing `ColumnTransformer` preprocessing pipeline, trained an XGBoost classifier with `scale_pos_weight=28.5`, optimized the decision threshold to 0.5022 using the validation $F_2$-score, logged the entire run to MLflow, and saved the candidate model artifact separately to `models/candidate.pkl`.

**Q4: What was the quality gate decision and why did you choose that metric?**  
> The quality gate compared both models on the incoming batch. We chose **Recall** and **F1-Score** because in predictive maintenance, False Negatives cause costly unplanned downtime, whereas Accuracy is deceptive due to 96.6% class imbalance. The Candidate achieved a +15.04% gain in Recall (95.87% vs 80.83%) and +11.29% gain in F1-score (73.28% vs 61.99%), reducing missed failures from 65 down to 14. It was marked `ELIGIBLE_FOR_PROMOTION`.

**Q5: Why was the Champion model not automatically overwritten?**  
> In production MLOps, a quality gate must never perform unrecorded or unconfirmed automatic promotions. The gate records the decision and metric audit in `quality_gate_decision.json`. Promotion requires explicit invocation (`--promote`), which backs up the previous champion before replacing the artifact.
