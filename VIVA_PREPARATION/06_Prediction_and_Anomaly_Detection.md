# MachineMitra — Phase 6 & 7: Prediction Logic & Anomaly Detection

## 1. Input Collection & Validation Pipeline

When an operator inputs sensor values or a connected system dispatches telemetry to `POST /api/predict`:
1. **Schema Validation:** In `backend/app/schemas.py`, Pydantic checks types and enforces physically valid operating boundaries:
   ```python
   class SensorInput(BaseModel):
       machineId: str = Field(min_length=1, max_length=80)
       productType: Literal['L','M','H']
       airTemperature: float = Field(ge=250, le=400)      # 250 K (-23°C) to 400 K (127°C)
       processTemperature: float = Field(ge=250, le=450)  # 250 K to 450 K (177°C)
       rotationalSpeed: float = Field(ge=0, le=10000)     # 0 to 10,000 RPM
       torque: float = Field(ge=0, le=200)                # 0 to 200 Nm
       toolWear: float = Field(ge=0, le=500)              # 0 to 500 runtime minutes
   ```
2. **DataFrame Formatting:** The validated Pydantic object is converted into a single-row Pandas DataFrame matching the exact feature order of the training set:
   ```python
   row = pd.DataFrame([{
       'Type': payload.productType,
       'Air temperature [K]': payload.airTemperature,
       'Process temperature [K]': payload.processTemperature,
       'Rotational speed [rpm]': payload.rotationalSpeed,
       'Torque [Nm]': payload.torque,
       'Tool wear [min]': payload.toolWear
   }], columns=FEATURES)
   ```

---

## 2. Key Distinctions: The 4 Tiers of Prediction

In your viva, professors will test whether you understand the difference between raw model outputs, operational categories, and health indices.

| Concept | What It Is in MachineMitra | Where Defined & Exact Values |
|---|---|---|
| **1. Failure Probability ($p$)** | Continuous mathematical estimate ($0.0 \le p \le 1.0$) produced by the champion XGBoost pipeline indicating likelihood of breakdown. | Produced by `pipeline.predict_proba(row)[0, 1]`. |
| **2. Model Prediction (`failure`)** | Binary decision boolean (`True` or `False`). Determined by comparing probability against optimal $F_2$ cutoff. | In `predict()`: `failure = probability >= threshold`. Threshold is **$\theta^* = 0.3088$** (30.88%). |
| **3. Operational Risk Tier (`risk`)** | 3-tier operational categorization communicating urgency to human plant personnel. | Defined in `risk_for()`:<br/>- **Low:** $p < 0.30$<br/>- **Medium:** $0.30 \le p < 0.70$<br/>- **High:** $p \ge 0.70$ |
| **4. Machine Health Score** | Composite health percentage (0–100%) tracking overall machine condition in plant inventory. | Seeded in `src/data/seed.ts` (e.g., CNC Milling 04: 96% Healthy; Conveyor Motor 18: 64% Critical). |

---

## 3. Three Realistic Inference Scenarios

### Scenario A: Nominal Machine Operation (Healthy / Low Risk)
- **Input Parameters:**
  - Machine ID: `MM-CNC-004`
  - Product Type: `H`
  - Air Temp: `298.1 K` (~25°C)
  - Process Temp: `308.2 K` (~35°C)
  - Rotational Speed: `1508 RPM`
  - Torque: `39.8 Nm`
  - Tool Wear: `32 min`
- **Output:**
  - `probability`: `0.001415` (0.14%)
  - `threshold`: `0.308843`
  - `failure`: `False` ($0.0014 < 0.3088$)
  - `risk`: `'Low'`
  - `action`: *"Continue normal operation. Maintain routine inspections and monitor sensor trends for changes."*

### Scenario B: Elevated Mechanical Wear (Warning / Medium Risk)
- **Input Parameters:**
  - Machine ID: `MM-PRS-012`
  - Product Type: `M`
  - Air Temp: `300.5 K`
  - Process Temp: `311.0 K`
  - Rotational Speed: `1380 RPM`
  - Torque: `54.2 Nm` (Elevated torque load)
  - Tool Wear: `168 min` (Worn cutting blade)
- **Output:**
  - `probability`: `0.482010` (48.2%)
  - `threshold`: `0.308843`
  - `failure`: `True` ($0.4820 \ge 0.3088$)
  - `risk`: `'Medium'`
  - `action`: *"Schedule a maintenance inspection and review tool wear, torque. Recheck readings during the next operating cycle."*

### Scenario C: Critical Overstrain Condition (Breakdown Imminent / High Risk)
- **Input Parameters:**
  - Machine ID: `MM-CNV-018`
  - Product Type: `L`
  - Air Temp: `301.2 K`
  - Process Temp: `312.7 K`
  - Rotational Speed: `1275 RPM` (Spindle slowing under resistance)
  - Torque: `59.4 Nm` (Severe torque spike)
  - Tool Wear: `218 min` (Blade past safe 200 min lifespan)
- **Output:**
  - `probability`: `0.841285` (84.1%)
  - `threshold`: `0.308843`
  - `failure`: `True` ($0.8412 \ge 0.3088$)
  - `risk`: `'High'`
  - `action`: *"Urgent inspection: stop or safely isolate the machine if operating conditions are abnormal. Inspect temperature, torque, tool wear and lubrication before restart."*

---

## 4. Phase 7: Anomaly Detection Reality in MachineMitra

### 4.1 What Anomaly Detection Means
Anomaly detection identifies data points that deviate significantly from standard operating envelopes, without necessarily having prior training examples of failures.

### 4.2 How MachineMitra Implements It
MachineMitra implements **Prescriptive Rule-Based Telemetry Anomaly Isolation** inside `action_for()`:
```python
if risk == 'Medium':
    checks = []
    if sensors['toolWear'] >= 150: checks.append('tool wear')
    if sensors['torque'] >= 50: checks.append('torque')
    if sensors['airTemperature'] >= 303: checks.append('air temperature')
    detail = ', '.join(checks) if checks else 'sensor trends and operating conditions'
    return f'Schedule a maintenance inspection and review {detail}. Recheck readings during the next operating cycle.'
```

### 4.3 Why Rule-Based Anomaly Isolation Over Unsupervised ML?
- **Viva Defense Point:** When asked why Isolation Forest or One-Class SVM was not used, answer:
  > *"Because our dataset provides verified historical failure labels, supervised ensemble learning (XGBoost) achieves significantly higher recall (80.4%) than unsupervised clustering. We complement the supervised probability with rule-based sensor thresholding to provide explainable diagnostic attribution, telling the technician exactly which sensor breached safety limits."*
