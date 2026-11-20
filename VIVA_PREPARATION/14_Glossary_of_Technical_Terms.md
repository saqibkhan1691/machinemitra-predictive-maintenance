# MachineMitra — Phase 14: Comprehensive Technical Glossary

An A-to-Z reference guide of all terms, acronyms, and concepts relevant to MachineMitra.

---

### A
- **AIOps (Artificial Intelligence for IT/Industrial Operations):** Applying artificial intelligence and machine learning to operational monitoring, automated incident triage, and predictive maintenance workflows.
- **Accuracy Paradox:** The phenomenon where high classification accuracy is achieved by a naive model on imbalanced data simply by always predicting the majority class, while failing to detect the minority class of interest.
- **ASGI (Asynchronous Server Gateway Interface):** The modern Python specification (implemented by Uvicorn) allowing asynchronous frameworks like FastAPI to handle concurrent HTTP connections without blocking.

### B
- **Bagging (Bootstrap Aggregating):** An ensemble technique (used by Random Forest) where multiple independent decision trees are trained on random bootstrap samples with replacement, and their predictions are averaged to reduce model variance.
- **Boosting:** An ensemble technique (used by XGBoost) where models are trained sequentially, with each subsequent model fitting to the pseudo-residuals of earlier models to minimize bias.

### C
- **Calibration (Probability):** The degree to which predicted probabilities match real-world failure frequencies (e.g., if a model predicts 80% failure risk for 100 machines, approximately 80 of them should actually fail).
- **Champion-Challenger:** An MLOps governance pattern where a newly trained candidate model (Challenger) must outperform the currently deployed model (Champion) on validation metrics before being promoted to production.
- **ColumnTransformer:** A Scikit-Learn utility allowing different preprocessing pipelines to be applied to different subsets of columns (e.g., `OneHotEncoder` for strings and `StandardScaler` for numeric values).
- **Condition-Based Maintenance (CBM):** Maintenance triggered by real-time indicator thresholds (e.g., high vibration or elevated tool wear) rather than calendar schedules.
- **Confusion Matrix:** A $2 \times 2$ contingency table summarizing model classification performance: True Positives (TP), False Positives (FP), False Negatives (FN), and True Negatives (TN).
- **CORS (Cross-Origin Resource Sharing):** A browser security protocol governing how web applications loaded on one origin/port interact with resources hosted on a different origin/port.

### D
- **Data Drift (Covariate Shift):** A change in the input feature distribution $P(X)$ over time while the conditional probability of failure $P(Y|X)$ remains constant.
- **Data Leakage:** An error where information from outside the training partition (or information that would not be available at inference time) contaminates the model training process, leading to unrealistically optimistic validation results that fail in production.

### F
- **F1-Score:** The harmonic mean of Precision and Recall, weighting both equally: $F_1 = 2 \cdot \frac{P \cdot R}{P + R}$.
- **F2-Score:** A parameterized $F_\beta$ metric with $\beta = 2$, weighting Recall twice as heavily as Precision: $F_2 = 5 \cdot \frac{P \cdot R}{4P + R}$.
- **FastAPI:** A high-performance asynchronous web framework for Python based on standard type hints, Starlette, and Pydantic.
- **False Negative (Type II Error):** When a failing machine is incorrectly predicted as healthy. In predictive maintenance, this is the most costly error because it causes unplanned downtime.
- **False Positive (Type I Error):** When a healthy machine is incorrectly predicted as failing, causing an unnecessary technician inspection.

### M
- **MLflow:** An open-source platform for managing the end-to-end machine learning lifecycle, including experiment tracking, parameter logging, metric evaluation, and artifact storage.
- **MLOps:** Software engineering and operational practices aimed at deploying and maintaining machine learning models in production reliably and efficiently.

### O
- **OneHotEncoder:** A preprocessing transformer that converts categorical variables with $k$ categories into $k$ binary dummy indicators.
- **Optimal Decision Threshold ($\theta^*$):** The specific probability cutoff (e.g., $0.3088$) that maximizes a chosen business utility function ($F_2$-score) rather than defaulting to $0.5$.

### P
- **Pydantic:** A data validation library for Python using standard type annotations to enforce schema contracts and physical value bounds.
- **PR-AUC (Precision-Recall Area Under Curve):** The area under the Precision-Recall curve, representing model detection performance across the minority positive class without being inflated by large numbers of true negatives.
- **Precision:** The proportion of predicted failure alarms that are genuine breakdowns: $\text{Precision} = \frac{TP}{TP + FP}$.

### R
- **Recall (Sensitivity / True Positive Rate):** The proportion of actual machine failures that the model successfully catches: $\text{Recall} = \frac{TP}{TP + FN}$.
- **ROC-AUC (Receiver Operating Characteristic Area Under Curve):** The area under the True Positive Rate vs. False Positive Rate curve. Can be misleadingly optimistic on heavily imbalanced datasets.

### S
- **StandardScaler:** A transformer that standardizes numerical features to zero mean ($\mu = 0$) and unit variance ($\sigma = 1$): $z = \frac{x - \mu}{\sigma}$.
- **Stratified Split:** A sampling technique that preserves the exact class distribution ratio (e.g., 3.39% failures) across train, validation, and test partitions.
- **Subprocess:** A separate operating system process spawned by a parent process (e.g., FastAPI launching `ml_pipeline/train.py` asynchronously).

### T
- **Tool Wear:** The cumulative physical erosion of a cutting tool or machining insert, measured in operational minutes.
- **Torque:** The rotational force exerted by a machine's motor spindle, measured in Newton-meters ($Nm$).

### X
- **XGBoost:** Extreme Gradient Boosting, a scalable and optimized gradient tree boosting library with L2 leaf regularization and native class weight handling (`scale_pos_weight`).
