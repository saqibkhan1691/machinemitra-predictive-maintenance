# MachineMitra — Phase 12: Master Viva Question Bank (100 Questions)

This question bank is divided into 16 thematic categories (A through P). Every entry provides a concise viva response, deep technical background, connection to MachineMitra, and likely follow-up questions.

---

## Category A: Project Introduction & Objectives

### Q1: What is MachineMitra in one sentence?
- **Viva Answer:** "MachineMitra is an industrial AI and MLOps platform that predicts equipment breakdowns before they occur using machine learning pipelines, calibrates decision thresholds via the $F_2$-score to minimize missed failures, and automates maintenance work orders."
- **Technical Context:** Full-stack architecture connecting React 19, FastAPI, MLflow, and SQLite.
- **MachineMitra Anchor:** [README.md](file:///d:/AiOPS/machinemitra-predictive-maintenance/README.md) lines 5–24.
- **Follow-up:** *"What specific industrial machines does it model?"* $\rightarrow$ Milling and CNC machining centers characterized by rotational speed, torque, cutting tool wear, and thermal dissipation.

### Q2: What was the primary motivation behind building this project?
- **Viva Answer:** "Unplanned industrial downtime costs manufacturing plants millions of dollars and creates safety hazards. Traditional calendar maintenance either replaces healthy parts too early or reacts after expensive catastrophic breakdowns occur. MachineMitra implements condition-based predictive maintenance."
- **Technical Context:** Shifting from reactive/preventive maintenance to predictive/prescriptive maintenance.
- **MachineMitra Anchor:** [src/pages/Overview.tsx](file:///d:/AiOPS/machinemitra-predictive-maintenance/src/pages/Overview.tsx).
- **Follow-up:** *"What is the difference between preventive and predictive maintenance?"* $\rightarrow$ Preventive follows static calendar intervals; predictive acts dynamically based on real-time sensor degradation.

---

## Category B: Problem Statement & Domain Knowledge

### Q3: What physical sensor parameters are monitored in MachineMitra?
- **Viva Answer:** "We monitor six core parameters: Product Type (L, M, H), Air Temperature (K), Process Temperature (K), Spindle Rotational Speed (RPM), Motor Torque (Nm), and Cumulative Tool Wear (minutes)."
- **Technical Context:** Physical properties capturing thermal load, mechanical stress, electrical power draw, and physical blade wear.
- **MachineMitra Anchor:** `FEATURES` in [ml_pipeline/train.py](file:///d:/AiOPS/machinemitra-predictive-maintenance/ml_pipeline/train.py#L42) and [backend/app/schemas.py](file:///d:/AiOPS/machinemitra-predictive-maintenance/backend/app/schemas.py).
- **Follow-up:** *"Why are both Air Temperature and Process Temperature required?"* $\rightarrow$ The thermal differential ($\Delta T = T_{\text{process}} - T_{\text{air}}$) measures heat dissipation efficiency. If $\Delta T$ drops below safe margins at high speeds, heat dissipation failure (HDF) occurs.

### Q4: What are the primary mechanical failure modes in milling machines?
- **Viva Answer:** "Milling machines primarily experience Tool Wear Failure (TWF), Heat Dissipation Failure (HDF), Power Failure (PWF), Overstrain Failure (OSF), and Random Failure (RNF)."
- **Technical Context:** In the raw dataset, these are detailed in columns 10–14.
- **MachineMitra Anchor:** [data/raw/ai4i2020.csv](file:///d:/AiOPS/machinemitra-predictive-maintenance/data/raw/ai4i2020.csv).
- **Follow-up:** *"Did you include these five failure modes in your model input features?"* $\rightarrow$ **NO!** That would cause severe target data leakage, as those modes are only known *after* failure occurs.

---

## Category C: System Architecture & Data Flow

### Q5: Describe the overall architecture of MachineMitra.
- **Viva Answer:** "MachineMitra is structured as a decoupled 3-tier microservice architecture: a React 19 presentation tier served via an Nginx reverse proxy on port 8080, an asynchronous FastAPI backend on port 8000 with an embedded SQLite database, and an experimentation tier running an MLflow tracking server on port 5000."
- **Technical Context:** Containerized via Docker Compose connected by a private bridge network.
- **MachineMitra Anchor:** [docker-compose.yml](file:///d:/AiOPS/machinemitra-predictive-maintenance/docker-compose.yml).
- **Follow-up:** *"How does Nginx help in this architecture?"* $\rightarrow$ Nginx serves compiled static frontend assets and reverse-proxies `/api/*` to the FastAPI backend, eliminating CORS errors and exposing a single port to clients.

### Q6: How does data flow from the UI to the backend and back?
- **Viva Answer:** "The operator inputs sensor values into the React UI (`Prediction.tsx`). The form validates values and dispatches an HTTP POST request to `/api/predict`. FastAPI validates the payload against Pydantic's `SensorInput` schema, passes it to the Scikit-Learn/XGBoost pipeline, computes failure probability and risk tiers, persists the record into SQLite, and returns JSON. The UI then navigates to `PredictionResult.tsx`."
- **MachineMitra Anchor:** [src/services/mockApi.ts](file:///d:/AiOPS/machinemitra-predictive-maintenance/src/services/mockApi.ts#L13-L19) and [backend/app/main.py](file:///d:/AiOPS/machinemitra-predictive-maintenance/backend/app/main.py#L60-L77).

---

## Category D: Dataset & Preprocessing

### Q7: What dataset did you use, and how many records does it contain?
- **Viva Answer:** "We used the AI4I 2020 Predictive Maintenance Dataset from the UCI Machine Learning Repository, containing exactly 10,000 records of synthetic industrial milling machine telemetry."
- **MachineMitra Anchor:** [data/raw/ai4i2020.csv](file:///d:/AiOPS/machinemitra-predictive-maintenance/data/raw/ai4i2020.csv).
- **Follow-up:** *"What is the class distribution in this dataset?"* $\rightarrow$ Exactly 9,661 normal operations (96.61%) and 339 machine failures (3.39%), an imbalance ratio of ~28.5 to 1.

### Q8: What preprocessing steps were executed on numeric features?
- **Viva Answer:** "Numeric features pass through a Scikit-Learn `Pipeline` containing `SimpleImputer(strategy='median')` to handle missing sensor values robustly without outlier distortion, followed by `StandardScaler()` to standardize values to zero mean and unit variance."
- **MachineMitra Anchor:** [ml_pipeline/train.py](file:///d:/AiOPS/machinemitra-predictive-maintenance/ml_pipeline/train.py#L46).
- **Follow-up:** *"Why use median imputation instead of mean?"* $\rightarrow$ Sensor spikes and torque surges represent extreme physical values that distort the arithmetic mean, while the median represents the true central tendency.

### Q9: How was the categorical feature 'Type' preprocessed?
- **Viva Answer:** "The product variant `Type` (`L`, `M`, `H`) was encoded using `OneHotEncoder(handle_unknown='ignore')` inside a `ColumnTransformer`, generating binary indicator columns."
- **MachineMitra Anchor:** [ml_pipeline/train.py](file:///d:/AiOPS/machinemitra-predictive-maintenance/ml_pipeline/train.py#L46).
- **Follow-up:** *"What does `handle_unknown='ignore'` do?"* $\rightarrow$ If an unlisted product type appears in production, the encoder outputs zeros across all dummy columns rather than crashing with an exception.

### Q10: How did you partition the dataset, and why?
- **Viva Answer:** "We executed a 3-way stratified split: 70% for training (7,000 samples), 15% for validation (1,500 samples), and 15% for held-out testing (1,500 samples)."
- **MachineMitra Anchor:** [ml_pipeline/train.py](file:///d:/AiOPS/machinemitra-predictive-maintenance/ml_pipeline/train.py#L78-L79).
- **Follow-up:** *"Why use a 3-way split instead of a standard 80/20 train/test split?"* $\rightarrow$ Hyperparameter comparison and decision threshold optimization were performed on the validation split, keeping the test split completely untouched for unbiased final evaluation.

---

## Category E: Python Libraries & Development Tools

### Q11: What Python libraries power MachineMitra?
- **Viva Answer:** "FastAPI and Uvicorn for asynchronous REST services, Pydantic for validation, Scikit-Learn and XGBoost for machine learning, Pandas and NumPy for numerical operations, MLflow for experiment tracking, and Pytest for unit testing."
- **MachineMitra Anchor:** [backend/requirements.txt](file:///d:/AiOPS/machinemitra-predictive-maintenance/backend/requirements.txt).

### Q12: Why did you choose Vite over Create-React-App?
- **Viva Answer:** "Vite leverages native ES modules in the browser and uses Esbuild for bundling, providing instant Hot Module Replacement (HMR) and significantly faster build times compared to Webpack-based Create-React-App."
- **MachineMitra Anchor:** [vite.config.ts](file:///d:/AiOPS/machinemitra-predictive-maintenance/vite.config.ts) and [package.json](file:///d:/AiOPS/machinemitra-predictive-maintenance/package.json).

---

## Category F: Machine Learning Fundamentals

### Q13: What is the difference between bias and variance?
- **Viva Answer:** "Bias is error introduced by approximating complex real-world physics with an overly simplistic model (underfitting). Variance is error introduced by excessive sensitivity to small fluctuations and noise in the training set (overfitting)."
- **Connection to MachineMitra:** Random Forest controls variance through bagging; XGBoost minimizes bias through sequential gradient boosting while penalizing leaf weights via L2 regularization (`reg_lambda=2`).

### Q14: Explain the Accuracy Paradox under class imbalance.
- **Viva Answer:** "In a dataset with 96.61% negative cases, a trivial model predicting 'No Failure' for every machine achieves 96.61% accuracy while catching zero failures. Accuracy measures overall correctness, not minority detection."
- **Connection to MachineMitra:** That is why PR-AUC and Recall are our primary evaluation criteria.

---

## Category G: Machine Learning Algorithms Used

### Q15: How does Random Forest work, and what are its hyperparameters in your project?
- **Viva Answer:** "Random Forest builds 350 decision trees in parallel using bootstrap samples. In our project, it uses `n_estimators=350`, `min_samples_leaf=2`, and `class_weight='balanced_subsample'`."
- **MachineMitra Anchor:** [ml_pipeline/train.py](file:///d:/AiOPS/machinemitra-predictive-maintenance/ml_pipeline/train.py#L85).

### Q16: How does XGBoost work, and why was it crowned Champion?
- **Viva Answer:** "XGBoost trains 350 sequential trees where each tree fits to the negative gradient of the loss function. It achieved a validation PR-AUC of 0.7184 (vs Random Forest's 0.6589) and Recall of 82.35% (vs 78.43%), training four times faster."
- **MachineMitra Anchor:** [ml_pipeline/train.py](file:///d:/AiOPS/machinemitra-predictive-maintenance/ml_pipeline/train.py#L86, L132) and [models/metrics.json](file:///d:/AiOPS/machinemitra-predictive-maintenance/models/metrics.json).

### Q17: What does `scale_pos_weight` do in XGBoost?
- **Viva Answer:** "It scales the gradient of the loss function for positive samples. We set it to $\frac{\text{negative}}{\text{positive}} \approx 28.53$, penalizing false negative errors ~28.5 times more heavily than false alarms."
- **MachineMitra Anchor:** [ml_pipeline/train.py](file:///d:/AiOPS/machinemitra-predictive-maintenance/ml_pipeline/train.py#L82, L86).

---

## Category H: Prediction & Risk Stratification

### Q18: What is your optimal decision threshold, and how was it calculated?
- **Viva Answer:** "Our optimal decision threshold is $\theta^* = 0.3088$ (30.88%). It was calculated by evaluating candidate thresholds across the Precision-Recall curve on the validation set to maximize the $F_2$-score."
- **MachineMitra Anchor:** [ml_pipeline/train.py](file:///d:/AiOPS/machinemitra-predictive-maintenance/ml_pipeline/train.py#L49-L55).

### Q19: What are the risk boundaries in MachineMitra?
- **Viva Answer:** "Low Risk is $< 30\%$, Medium Risk is $30\%$ to $69.99\%$, and High Risk is $\ge 70\%$."
- **MachineMitra Anchor:** `risk_for()` in [backend/app/main.py](file:///d:/AiOPS/machinemitra-predictive-maintenance/backend/app/main.py#L43-L46).

---

## Category I: Anomaly Detection Reality

### Q20: How does MachineMitra perform anomaly detection?
- **Viva Answer:** "Through prescriptive rule-based sensor thresholding inside `action_for()`. For medium-risk machines, it evaluates whether Tool Wear $\ge 150$ min, Torque $\ge 50$ Nm, or Air Temp $\ge 303$ K to identify the anomalous driver."
- **MachineMitra Anchor:** [backend/app/main.py](file:///d:/AiOPS/machinemitra-predictive-maintenance/backend/app/main.py#L51-L57).

---

## Category J: AIOps & Continuous Monitoring

### Q21: What does `/api/monitoring/summary` do?
- **Viva Answer:** "It queries the last 500 predictions from SQLite, calculating total count, high-risk counts, failure counts, and average probability, returning `'insufficient_data'` when records are $<30$ and `'baseline_required'` when volume allows drift analysis."
- **MachineMitra Anchor:** [backend/app/main.py](file:///d:/AiOPS/machinemitra-predictive-maintenance/backend/app/main.py#L126-L132).

### Q22: How does the retraining workflow function?
- **Viva Answer:** "The user triggers `POST /api/train`. FastAPI queues the task, updates `training_status.json`, executes `train.py` in a background subprocess, logs new metrics to MLflow, and replaces `champion.pkl` on completion."
- **MachineMitra Anchor:** [backend/app/main.py](file:///d:/AiOPS/machinemitra-predictive-maintenance/backend/app/main.py#L84-L105).

---

## Category K: Dashboard & Frontend Architecture

### Q23: How does the frontend communicate with the backend?
- **Viva Answer:** "Through `src/services/mockApi.ts`, which uses standard browser `fetch` to dispatch HTTP requests to `http://localhost:8000/api` (or `/api` via Nginx reverse proxy)."
- **MachineMitra Anchor:** [src/services/mockApi.ts](file:///d:/AiOPS/machinemitra-predictive-maintenance/src/services/mockApi.ts).

### Q24: What charting library powers the telemetry graphs?
- **Viva Answer:** "Recharts (v3.11), which renders responsive SVG charts for area trend lines, condition distribution donuts, and model metric comparison bar charts."
- **MachineMitra Anchor:** [src/pages/Overview.tsx](file:///d:/AiOPS/machinemitra-predictive-maintenance/src/pages/Overview.tsx) and [src/pages/ModelPerformance.tsx](file:///d:/AiOPS/machinemitra-predictive-maintenance/src/pages/ModelPerformance.tsx).

---

## Category L: Database & Storage

### Q25: What tables exist in `machinemitra.db`?
- **Viva Answer:** "Three tables: `predictions` (inference logs), `machines` (asset registry), and `work_orders` (maintenance tasks)."
- **MachineMitra Anchor:** [backend/app/db.py](file:///d:/AiOPS/machinemitra-predictive-maintenance/backend/app/db.py).

---

## Category M: Model Evaluation & Performance

### Q26: What were your champion model's final test metrics?
- **Viva Answer:** "On the held-out 15% test set (1,500 samples), XGBoost achieved a PR-AUC of 78.00%, Recall of 80.39%, Precision of 49.40%, F1 of 61.19%, and Accuracy of 96.53%, catching 41 out of 51 true breakdowns."
- **MachineMitra Anchor:** [models/metrics.json](file:///d:/AiOPS/machinemitra-predictive-maintenance/models/metrics.json).

---

## Category N: Limitations & Future Scope

### Q27: What are the main limitations of MachineMitra today?
- **Viva Answer:** "Telemetry is ingested via batch REST requests rather than high-frequency IoT streaming (Kafka/MQTT), drift detection is descriptive rather than automated via KS-tests, and authentication is a prototype session gate rather than enterprise OAuth2/RBAC."
- **MachineMitra Anchor:** [README.md](file:///d:/AiOPS/machinemitra-predictive-maintenance/README.md) lines 552–560.

---

## Category O: Practical Implementation & Debugging

### Q28: How do you verify the backend is running properly?
- **Viva Answer:** "By curling `http://localhost:8000/api/health`, which returns JSON confirming `status: healthy`, `model_loaded: true`, and the MLflow tracking URI."
- **MachineMitra Anchor:** [backend/app/main.py](file:///d:/AiOPS/machinemitra-predictive-maintenance/backend/app/main.py#L31-L33).

---

## Category P: Technical Justification & Trade-offs

### Q29: Why not use a Deep Learning model like LSTM or Transformer?
- **Viva Answer:** "Tabular industrial telemetry benchmarks demonstrate that gradient-boosted decision trees (XGBoost) consistently outperform deep neural networks on tabular data without requiring massive datasets. XGBoost trains in 0.22 seconds, offers clear feature splits, and runs low-latency inference on standard CPU servers."

### Q30: Why is $F_2$-score better than $F_1$-score in this domain?
- **Viva Answer:** "Because $F_2$ sets $\beta=2$, giving twice the mathematical weight to Recall over Precision. In predictive maintenance, an undetected machine failure costs tens of thousands in downtime, whereas an inspection false alarm costs minimal technician time."
