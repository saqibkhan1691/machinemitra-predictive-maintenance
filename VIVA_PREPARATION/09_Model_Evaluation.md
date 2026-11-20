# MachineMitra — Phase 9 & 11: Model Evaluation & Results Deep-Dive

## 1. Actual Evaluation Metrics from `models/metrics.json`

| Metric | Validation Set: Random Forest | Validation Set: XGBoost (Champion) | Held-Out 15% Test Set: XGBoost (Champion) |
|---|---|---|---|
| **PR-AUC** | 0.6589 (65.89%) | **0.7184 (71.84%)** | **0.7800 (78.00%)** |
| **Recall** | 0.7843 (78.43%) | **0.8235 (82.35%)** | **0.8039 (80.39%)** |
| **Precision** | 0.5195 (51.95%) | **0.5600 (56.00%)** | **0.4940 (49.40%)** |
| **F1-Score** | 0.6250 (62.50%) | **0.6667 (66.67%)** | **0.6119 (61.19%)** |
| **ROC-AUC** | 0.9673 (96.73%) | **0.9799 (97.99%)** | **0.9708 (97.08%)** |
| **Accuracy** | 0.9680 (96.80%) | **0.9720 (97.20%)** | **0.9653 (96.53%)** |
| **Decision Threshold ($\theta^*$)** | **0.2339** | **0.3088** | **0.3088** |
| **Training Latency** | 0.834 seconds | **0.223 seconds** | Evaluated on 1,500 samples |

---

## 2. Confusion Matrix Deep Dive (Held-Out Test Set: $N=1,500$)

The actual test confusion matrix for the Champion XGBoost model:
$$\begin{pmatrix} 1407 & 42 \\ 10 & 41 \end{pmatrix}$$

```text
                        PREDICTED NEGATIVE (0)       PREDICTED POSITIVE (1)
ACTUAL NORMAL (0)        TN = 1407 (97.10%)            FP = 42 (2.90%)
ACTUAL FAILURE (1)       FN = 10 (19.61%)              TP = 41 (80.39%)
```

### The 4 Operational Quadrants:
1. **True Negative (TN = 1,407):**
   - Healthy machines correctly predicted as healthy.
   - Result: Continued uninterrupted production with zero false maintenance cost.
2. **False Positive (FP = 42):**
   - Healthy machines flagged as potential failures (Type I Error).
   - Result: A technician visits the machine and inspects the spindle and tool wear (~15 minutes inspection cost). No catastrophic loss.
3. **False Negative (FN = 10):**
   - Failing machines incorrectly predicted as healthy (Type II Error).
   - Result: The machine breaks unexpectedly during production, requiring emergency repair and causing downtime.
4. **True Positive (TP = 41):**
   - Failing machines correctly caught before breakdown occurs.
   - Result: Planned preventive maintenance replaces the damaged tool or bearings, saving tens of thousands of dollars in downtime.

---

## 3. Mathematical Metric Formulations & Calculations

Using the exact test confusion matrix ($TP=41, FP=42, FN=10, TN=1407$):

### 1. Recall (Sensitivity / True Positive Rate)
$$\text{Recall} = \frac{TP}{TP + FN} = \frac{41}{41 + 10} = \frac{41}{51} \approx \mathbf{80.39\%}$$
- **Operational Meaning:** Out of 51 machines that were actually about to break down, MachineMitra successfully detected **41 of them** before failure occurred!

### 2. Precision (Positive Predictive Value)
$$\text{Precision} = \frac{TP}{TP + FP} = \frac{41}{41 + 42} = \frac{41}{83} \approx \mathbf{49.40\%}$$
- **Operational Meaning:** When the model sounds an alarm, there is a ~49.4% chance of immediate failure and a ~50.6% chance of a precautionary inspection. In heavy industry, this trade-off is highly desirable because inspection costs are trivial compared to downtime.

### 3. $F_1$-Score (Harmonic Mean of Precision and Recall)
$$F_1 = 2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}} = 2 \cdot \frac{0.494 \cdot 0.8039}{0.494 + 0.8039} \approx \mathbf{61.19\%}$$

### 4. Overall Accuracy
$$\text{Accuracy} = \frac{TP + TN}{TP + TN + FP + FN} = \frac{41 + 1407}{1500} = \frac{1448}{1500} \approx \mathbf{96.53\%}$$
- **Viva Warning:** Remind the examiner that accuracy is dominated by the 1,407 True Negatives, which is why PR-AUC and Recall are the true benchmarks of model health.
