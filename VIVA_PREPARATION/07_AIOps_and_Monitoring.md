# MachineMitra — Phase 8: AIOps & Continuous Model Monitoring

## 1. MLOps vs. AIOps: The Critical Distinction

In your viva, examiners will ask: *"What makes MachineMitra an AIOps project rather than just an MLOps or ML classification project?"*

| Dimension | MLOps (Machine Learning Operations) | AIOps (Artificial Intelligence for IT/Industrial Operations) |
|---|---|---|
| **Primary Scope** | Operationalizing the machine learning lifecycle: data pipelines, model training, parameter logging, artifact versioning, and endpoint serving. | Using machine learning and operational telemetry to automate system health diagnostics, incident management, alerting, and IT/industrial workflows. |
| **How MachineMitra Implements It** | Automated training pipeline (`train.py`), experiment tracking with parameters/metrics in MLflow, model serialization into `champion.pkl`, and versioning. | Real-time sensor anomaly root-cause isolation (`action_for`), automated risk stratification (Low/Medium/High), and closed-loop creation and dispatch of maintenance work orders (`WO-XXXXX`). |

---

## 2. AIOps Feature Implementation Audit

| Feature | Implementation Status | Exact Code Reference & Explanation |
|---|---|---|
| **Prediction Logging** | **IMPLEMENTED** | In `backend/app/main.py` lines 73–74: Every prediction is written to the SQLite `predictions` table with a UUID, machine ID, ISO timestamp, probability, failure boolean, risk tier, action, and JSON sensors payload. |
| **Model Performance Tracking** | **IMPLEMENTED** | In `ml_pipeline/train.py` lines 118–127 and `backend/app/main.py` lines 112–116 (`/api/model/metrics`): Logs PR-AUC, Recall, Precision, F1, Accuracy, ROC-AUC, and duration to MLflow and caches metrics in `metrics.json`. |
| **Model Versioning** | **IMPLEMENTED** | In `ml_pipeline/train.py` line 141: Bundle includes explicit `version: "1"`, displayed on UI cards and stored alongside each prediction in the database. |
| **Pre-Deployment Gate** | **IMPLEMENTED** | In `ml_pipeline/train.py` lines 132–136: Tournament selection selects the Champion on Validation PR-AUC/Recall before evaluating once on the held-out test set and exporting `champion.pkl`. |
| **Alert Generation** | **IMPLEMENTED** | In `backend/app/main.py` lines 48–58 (`action_for()`): Automatically classifies risk into Low, Medium, and High, outputting urgent inspection directives for high-risk equipment. |
| **Retraining Workflow** | **IMPLEMENTED** | In `backend/app/main.py` lines 84–105: `POST /api/train` spawns a background subprocess executing `ml_pipeline/train.py`, updating status in `training_status.json`. |
| **Data Ingestion Staging** | **PARTIALLY IMPLEMENTED** | In `backend/app/main.py` lines 118–124: `POST /api/data/upload` accepts CSV files and stages them inside `data/incoming/` with a UUID prefix for future retraining. |
| **Data Drift Detection** | **PARTIALLY IMPLEMENTED** | In `backend/app/main.py` lines 126–132: `GET /api/monitoring/summary` tracks prediction volume and risk ratios, returning `'insufficient_data'` (<30 calls) or `'baseline_required'`. Formal statistical drift testing (KS-test) is planned. |
| **Automated Retraining Trigger** | **NOT IMPLEMENTED (Manual Trigger Implemented)** | Retraining is triggered manually via the UI button or `POST /api/train`. Automatic triggers based on scheduled cron jobs or drift threshold breaches are part of future scope. |
| **High-Frequency Streaming (Kafka/MQTT)** | **NOT IMPLEMENTED** | Machine telemetry is currently ingested via batch REST requests. Apache Kafka or MQTT message brokers are planned for factory-wide deployments. |

---

## 3. The Monitoring & Drift Endpoint Breakdown

Inside `backend/app/main.py`:
```python
@app.get('/api/monitoring/summary')
def monitoring_summary():
    with connect() as con:
        rows = con.execute('SELECT probability,risk,failure,timestamp FROM predictions ORDER BY timestamp DESC LIMIT 500').fetchall()
    vals = [r['probability'] for r in rows]
    return {
        'predictionCount': len(rows),
        'highRiskCount': sum(r['risk'] == 'High' for r in rows),
        'failureCount': sum(r['failure'] for r in rows),
        'averageProbability': round(float(np.mean(vals)), 2) if vals else 0,
        'lastPrediction': rows[0]['timestamp'] if rows else None,
        'driftStatus': 'insufficient_data' if len(rows) < 30 else 'baseline_required'
    }
```
- **Engineering Logic:** Analyzes the last 500 inference calls from the embedded SQLite database.
- If fewer than 30 predictions exist, statistical sample size is insufficient to compute meaningful drift metrics.
- Once 30+ predictions are collected, the endpoint returns `'baseline_required'`, communicating to the AIOps engineer that a formal baseline reference distribution is required to execute statistical tests like Kolmogorov-Smirnov (KS) or Population Stability Index (PSI).
