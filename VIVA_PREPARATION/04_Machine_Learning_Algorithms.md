# MachineMitra — Phase 4: Machine Learning Concepts & Model Logic

## 1. Algorithmic Overview in MachineMitra

MachineMitra operates a **Champion-Challenger tournament** between two state-of-the-art ensemble paradigms:
1. **Challenger:** Random Forest Classifier (Bagging Ensemble)
2. **Champion:** XGBoost Classifier (Gradient Boosting Ensemble)

---

## 2. Deep Dive: Random Forest Classifier

### 2.1 What is it?
Random Forest is a bagging (Bootstrap Aggregating) ensemble composed of multiple independent decision trees. Each tree is trained on a random bootstrap sample with replacement from the training dataset, and feature splits are evaluated on a random subset of features.

### 2.2 Why it is used in MachineMitra
- Robust against overfitting due to variance reduction through averaging.
- Handles non-linear feature interactions (such as torque $\times$ speed $=$ power).
- Native support for sub-sample class weighting.

### 2.3 Hyperparameter Configuration in `ml_pipeline/train.py`
```python
RandomForestClassifier(
    n_estimators=350,
    max_depth=None,
    min_samples_leaf=2,
    class_weight='balanced_subsample',
    n_jobs=-1,
    random_state=42
)
```
- `n_estimators=350`: Builds 350 individual decision trees. Higher tree counts smooth the probability distribution.
- `max_depth=None`: Trees grow until leaves contain fewer than `min_samples_split` samples, allowing complex interaction modeling.
- `min_samples_leaf=2`: Ensures each terminal leaf has at least 2 samples, preventing single-outlier overfitting.
- `class_weight='balanced_subsample'`: Recalculates weights inversely proportional to class frequencies inside *each individual tree's bootstrap*, multiplying the loss for the rare 3.39% failure class.
- `n_jobs=-1`: Utilizes all available CPU cores for parallel tree training.

### 2.4 Internal Mathematical Mechanics
Each tree $t$ outputs a class probability $P_t(y=1 | x)$. The forest aggregates them via simple arithmetic mean:
$$P(y=1 | x) = \frac{1}{T} \sum_{t=1}^T P_t(y=1 | x)$$

---

## 3. Deep Dive: XGBoost Classifier (The Champion)

### 3.1 What is it?
XGBoost (Extreme Gradient Boosting) is an optimized distributed gradient boosting library. Unlike Random Forest, where trees are built independently in parallel, XGBoost builds shallow trees **sequentially**. Each tree fits to the negative gradient (pseudo-residuals) of the loss function calculated from all previous trees.

### 3.2 Why it is used in MachineMitra
- Systematically reduces bias while controlling variance via L2 leaf regularization.
- Exceptional handling of severe class imbalance via `scale_pos_weight`.
- Native optimization for Precision-Recall Area Under Curve (`eval_metric='aucpr'`).

### 3.3 Hyperparameter Configuration in `ml_pipeline/train.py`
```python
XGBClassifier(
    n_estimators=350,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.85,
    colsample_bytree=0.85,
    reg_lambda=2,
    scale_pos_weight=weight,  # ~28.53
    eval_metric='aucpr',
    n_jobs=-1,
    random_state=42
)
```
- `n_estimators=350`: Builds 350 sequential boosting rounds.
- `max_depth=5`: Limits each tree to depth 5 ($2^5 = 32$ leaves maximum), preventing individual trees from memorizing training noise.
- `learning_rate=0.05` ($\eta$): Shrinks the contribution of each newly added tree by 95%, requiring more trees to build the model smoothly.
- `subsample=0.85`: Uses 85% random subsample of training data per round, adding stochastic regularization.
- `colsample_bytree=0.85`: Randomly samples 85% of features per tree, preventing single dominant sensors from dictating all splits.
- `reg_lambda=2`: L2 ridge regularization penalty on leaf weights, discouraging extreme prediction logits.
- `scale_pos_weight = neg / pos` ($\approx 28.53$): Multiplies positive (failure) error gradients by 28.53, forcing the booster to prioritize detecting rare machine breakdowns.

### 3.4 Internal Mathematical Mechanics
At boosting round $m$, the prediction $\hat{y}_i^{(m)}$ is updated:
$$\hat{y}_i^{(m)} = \hat{y}_i^{(m-1)} + \eta \cdot f_m(x_i)$$
where $f_m(x)$ minimizes the second-order Taylor expansion objective:
$$\mathcal{L}^{(m)} = \sum_{i=1}^n \left[ g_i f_m(x_i) + \frac{1}{2} h_i f_m(x_i)^2 \right] + \gamma T + \frac{1}{2} \lambda \sum_{j=1}^T w_j^2$$
Here, $g_i$ and $h_i$ are the first and second order gradients of the logistic loss, and $w_j$ are the leaf weights penalized by $\lambda = 2$.

---

## 4. Fundamental Concept Distinctions for Viva

| Concept Pair | Core Theoretical Difference | How MachineMitra Implements It |
|---|---|---|
| **Supervised vs. Unsupervised** | Supervised learning learns mappings from labeled inputs $(X \rightarrow y)$. Unsupervised finds hidden patterns in unlabeled data ($X$). | MachineMitra is **Supervised Learning**: it trains on historical telemetry paired with true breakdown outcomes (`Machine failure`). |
| **Classification vs. Regression** | Classification predicts discrete categories or class probabilities. Regression predicts continuous numerical quantities. | MachineMitra is **Binary Classification**: it predicts the probability of a failure event ($y \in \{0, 1\}$) rather than Remaining Useful Life (RUL) in hours. |
| **Failure Prediction vs. Anomaly Detection** | Failure prediction classifies known breakdown patterns. Anomaly detection identifies deviations from nominal baselines without knowing failure modes. | Failure prediction is handled by the **XGBoost Classifier**. Telemetry anomaly detection is handled by **sensor threshold rules** in `action_for()`. |
| **Training vs. Inference** | Training fits weights on historical datasets (compute-heavy, offline). Inference executes forward passes on single instances (low-latency, real-time). | Training happens in `ml_pipeline/train.py` (duration: ~0.22s to 0.83s). Inference happens in `backend/app/main.py` (duration: ~15ms). |
| **Model Accuracy vs. Model Reliability** | Accuracy is simple percentage of correct predictions. Reliability measures consistent, cost-effective decision-making under severe class imbalance. | A dummy model achieves 96.6% accuracy but 0% reliability. MachineMitra prioritizes **PR-AUC (78.0%)** and **Recall (80.4%)** for operational reliability. |
