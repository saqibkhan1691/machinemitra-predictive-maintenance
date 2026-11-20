# MachineMitra — Phase 5: Code-by-Code Explanation

This document breaks down every critical source file line-by-line, explaining the engineering mechanics in the standard format:
**Code $\rightarrow$ Meaning $\rightarrow$ Why Needed $\rightarrow$ How It Works $\rightarrow$ Example Output**.

---

## 1. `ml_pipeline/train.py` (The ML Training Engine)

### 1.1 Imports & Environmental Detection
```python
import os, json, pickle, time
from pathlib import Path
import numpy as np, pandas as pd, mlflow, mlflow.sklearn
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.metrics import (average_precision_score, recall_score, precision_score, f1_score, roc_auc_score, accuracy_score, confusion_matrix, precision_recall_curve)
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
```
- **Meaning:** Ingests standard libraries, scientific computing packages, MLflow for experiment tracking, Scikit-Learn transformers and metrics, and model estimators.
- **Why Needed:** Provides all primitives required for pipeline construction, cross-validation, and metrics tracking.

Lines 16–40 dynamically detect paths:
```python
BASE_DIR = Path(__file__).resolve().parent.parent
env_data = os.getenv('DATASET_PATH')
...
TRACKING = os.getenv('MLFLOW_TRACKING_URI', default_tracking)
```
- **Why Needed:** Ensures the script works identically inside Docker containers (where data is at `/app/data`) and on host Windows workstations (where data is at `BASE_DIR / 'data'`).

---

### 1.2 Pipeline Builder (`build_pipeline`)
```python
def build_pipeline(model):
    prep = ColumnTransformer([
        ('type', OneHotEncoder(handle_unknown='ignore'), ['Type']),
        ('numeric', Pipeline([
            ('imputer', SimpleImputer(strategy='median')),
            ('scale', StandardScaler())
        ]), NUM)
    ])
    return Pipeline([('preprocess', prep), ('classifier', model)])
```
- **Code:** `build_pipeline(model)`
- **Meaning:** Constructs a composite Scikit-Learn `Pipeline`.
- **Why Needed:** Prevents data leakage by ensuring all transformations (imputation medians and scaling parameters) are calculated only when `fit()` is called on training partitions.
- **How It Works:** Ingests the candidate classifier (`model`). Numeric features undergo median imputation followed by unit-variance scaling. Categorical feature `Type` is one-hot encoded.

---

### 1.3 Threshold Optimization (`best_threshold`)
```python
def best_threshold(y, p):
    precision, recall, thresholds = precision_recall_curve(y, p)
    if len(thresholds) == 0:
        return 0.5
    f2 = (5 * precision[:-1] * recall[:-1]) / (4 * precision[:-1] + recall[:-1] + 1e-12)
    return float(thresholds[int(np.nanargmax(f2))])
```
- **Code:** `best_threshold(y, p)`
- **Meaning:** Computes the probability cutoff that maximizes the $F_2$-score on validation data.
- **Why Needed:** In predictive maintenance, missing a breakdown (False Negative) is far worse than an inspection alarm (False Positive). $F_2$ gives twice the weight to Recall over Precision.
- **How It Works:** Generates the Precision-Recall curve across all candidate thresholds. Computes $F_2$ for each step. `np.nanargmax(f2)` finds the index of the highest $F_2$ score and returns that threshold float.
- **Example Output:** `0.30884313583374023` (for XGBoost).

---

### 1.4 Comprehensive Evaluator (`evaluate`)
```python
def evaluate(y, p, threshold):
    pred = (p >= threshold).astype(int)
    return {
        'accuracy': float(accuracy_score(y, pred)),
        'precision': float(precision_score(y, pred, zero_division=0)),
        'recall': float(recall_score(y, pred, zero_division=0)),
        'f1': float(f1_score(y, pred, zero_division=0)),
        'pr_auc': float(average_precision_score(y, p)),
        'roc_auc': float(roc_auc_score(y, p)),
        'threshold': float(threshold),
        'confusion_matrix': confusion_matrix(y, pred).tolist()
    }
```
- **Code:** `evaluate(y, p, threshold)`
- **Meaning:** Converts continuous probability vector `p` into binary decisions based on `threshold` and computes full evaluation metrics.
- **Why Needed:** Provides multi-dimensional assessment: threshold-independent metrics (PR-AUC, ROC-AUC) and threshold-dependent operational metrics (Recall, Precision, F1, Accuracy, Confusion Matrix).

---

### 1.5 Execution Controller (`main`)
```python
# 1. Ingestion & Column Check
df = pd.read_csv(DATA, encoding='utf-8-sig')
df = df[FEATURES + ['Machine failure']].dropna().copy()

# 2. Stratified 3-way Split
x_train, x_hold, y_train, y_hold = train_test_split(X, y, test_size=0.30, random_state=42, stratify=y)
x_val, x_test, y_val, y_test = train_test_split(x_hold, y_hold, test_size=0.50, random_state=42, stratify=y_hold)

# 3. Class Weight Calculation for XGBoost
neg = int((y_train == 0).sum())
pos = int((y_train == 1).sum())
weight = neg / max(pos, 1)

# 4. Tournament Loop & MLflow Logging
for name, model in candidates.items():
    pipe.fit(x_train, y_train)
    val_prob = pipe.predict_proba(x_val)[:, 1]
    threshold = best_threshold(y_val, val_prob)
    metrics = evaluate(y_val, val_prob, threshold)
    mlflow.log_params(...)
    mlflow.log_metrics(...)
    mlflow.sklearn.log_model(pipe, 'model')

# 5. Champion Crown & Serialization
champion = max(results, key=lambda r: (r['metrics']['pr_auc'], r['metrics']['recall']))
test_prob = pipe.predict_proba(x_test)[:, 1]
test_metrics = evaluate(y_test, test_prob, threshold)
pickle.dump(bundle, open(MODEL_DIR / 'champion.pkl', 'wb'))
```

---

## 2. `backend/app/main.py` (FastAPI Application Server)

### 2.1 Lifespan & Initialization
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title='MachineMitra API', version='1.0.0', lifespan=lifespan)
```
- **Meaning:** Modern FastAPI lifespan event handler replacing deprecated `@app.on_event("startup")`.
- **Why Needed:** Guarantees that SQLite tables exist before any request is processed.

---

### 2.2 Operational Logic Functions
```python
def risk_for(p):
    if p < 0.30: return 'Low'
    if p < 0.70: return 'Medium'
    return 'High'
```
- **Meaning:** Maps continuous probability to operational risk boundaries.

```python
def action_for(risk, sensors):
    if risk == 'High':
        return 'Urgent inspection: stop or safely isolate the machine if operating conditions are abnormal. Inspect temperature, torque, tool wear and lubrication before restart.'
    if risk == 'Medium':
        checks=[]
        if sensors['toolWear'] >= 150: checks.append('tool wear')
        if sensors['torque'] >= 50: checks.append('torque')
        if sensors['airTemperature'] >= 303: checks.append('air temperature')
        detail=', '.join(checks) if checks else 'sensor trends and operating conditions'
        return f'Schedule a maintenance inspection and review {detail}. Recheck readings during the next operating cycle.'
    return 'Continue normal operation. Maintain routine inspections and monitor sensor trends for changes.'
```
- **Meaning:** Prescriptive diagnostic engine. Examines individual sensor telemetry to explain root causes for medium-risk conditions.

---

### 2.3 Live Inference Endpoint (`POST /api/predict`)
```python
@app.post('/api/predict')
def predict(payload: SensorInput):
    if not MODEL_PATH.exists(): raise HTTPException(503, 'No trained model is available.')
    with MODEL_PATH.open('rb') as f: bundle = pickle.load(f)
    row = pd.DataFrame([{
        'Type': payload.productType,
        'Air temperature [K]': payload.airTemperature,
        'Process temperature [K]': payload.processTemperature,
        'Rotational speed [rpm]': payload.rotationalSpeed,
        'Torque [Nm]': payload.torque,
        'Tool wear [min]': payload.toolWear
    }], columns=FEATURES)
    probability = float(bundle['pipeline'].predict_proba(row)[0,1])
    threshold = float(bundle.get('threshold', 0.5))
    failure = probability >= threshold
    risk = risk_for(probability)
    ...
    with connect() as con:
        con.execute('INSERT INTO predictions VALUES (?,?,?,?,?,?,?,?,?,?)', (...))
    return result
```
- **Meaning:** Executes live model inference, computes risk, generates prescriptive action, persists to SQLite, and returns JSON.

---

### 2.4 Asynchronous Background Retraining
```python
@app.post('/api/train')
def train(background_tasks: BackgroundTasks):
    status_file = ROOT / 'training_status.json'
    status_file.write_text(json.dumps({'status':'queued', 'startedAt': datetime.now(timezone.utc).isoformat()}))
    background_tasks.add_task(run_training)
    return {'status':'queued', 'message':'Training job started. Poll /api/train/status.'}

def run_training():
    ...
    result = subprocess.run([sys.executable, str(script)], capture_output=True, text=True, timeout=3600, env=env)
    status_file.write_text(json.dumps({
        'status': 'completed' if result.returncode == 0 else 'failed',
        'finishedAt': datetime.now(timezone.utc).isoformat(),
        'output': result.stdout[-5000:],
        'error': result.stderr[-5000:]
    }))
```
- **Meaning:** Uses non-blocking FastAPI `BackgroundTasks` to spawn `ml_pipeline/train.py` in an OS subprocess without freezing the server.
