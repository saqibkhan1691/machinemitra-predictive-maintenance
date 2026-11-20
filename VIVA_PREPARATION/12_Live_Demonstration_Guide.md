# MachineMitra — Phase 14: Practical Live Demonstration Guide

Follow this exact sequential script during your viva demonstration to present MachineMitra smoothly and professionally.

---

## 1. Startup & Verification Phase

### Step 1: Launch the Services
Open PowerShell and start MachineMitra:
```powershell
# For native Windows mode:
.\scripts\start_local.bat

# OR with Docker Desktop running:
docker compose up -d
```

### Step 2: Verify Service Health
Open a browser or terminal and show the examiner that all microservices are healthy:
- **FastAPI API Health:** Open `http://localhost:8000/api/health`
  - Expected JSON: `{"status": "healthy", "service": "machinemitra-api", "model_loaded": true, "mlflow_tracking_uri": "..."}`
- **Interactive Swagger Docs:** Open `http://localhost:8000/docs`
- **Frontend Dashboard:** Open `http://localhost:8080` (or `http://localhost:8443` in local mode).

---

## 2. Dashboard Tour & Executive Overview

1. **Login:** Log in with `operations@machinemitra.in` / `machinemitra`.
2. **Overview Page (`/overview`):**
   - Point out the **Fleet Health Score (81%)** and **Active Alerts (2)**.
   - Show the **Health Distribution Donut Chart** (6 Healthy, 2 Attention, 1 Critical, 1 Offline).
   - Point to the **Priority Machines Action List** (e.g., Conveyor Motor 18 at 64% Critical).
   - **What to say to the Examiner:** *"This executive view provides plant managers with instant fleet visibility, categorizing machine conditions into Healthy, Attention, and Critical."*

---

## 3. Live Inference Demo: Healthy vs. Breakdown Machine

Navigate to **AI Failure Prediction** (`/prediction`).

### Scenario 1: Normal Machine (Low Risk)
1. In the **Machine ID** dropdown, select `MM-CNC-004 — CNC Milling 04`.
2. Notice the form auto-fills:
   - Product Type: `H`
   - Air Temperature: `298.1 K`
   - Process Temperature: `308.2 K`
   - Rotational Speed: `1508 RPM`
   - Torque: `39.8 Nm`
   - Tool Wear: `32 min`
3. Click the blue button: **Predict Failure**.
4. **Expected Output on `/predictions/:id`:**
   - Failure Prediction: **NO** (Green badge)
   - Failure Probability: **< 1%** (e.g., 0.14%)
   - Risk Category: **LOW RISK** (Green)
   - Recommended Action: *"Continue normal operation. Maintain routine inspections and monitor sensor trends for changes."*
5. **What to say:** *"Here, operating temperatures and torque are within nominal limits, and tool wear is low. The model confirms the machine is safe."*

---

### Scenario 2: Stressed Machine Imminent Failure (High Risk)
1. Click **Run Another Prediction** (`/prediction`).
2. Click the **Load Sample Data** button.
3. Show the examiner the stressed inputs:
   - Machine ID: `MM-CNV-018`
   - Product Type: `L`
   - Air Temperature: `301.2 K`
   - Process Temperature: `312.7 K`
   - Rotational Speed: `1275 RPM` (Spindle slowing)
   - Torque: `59.4 Nm` (Mechanical strain)
   - Tool Wear: `218 min` (Critical tool degradation)
4. Click **Predict Failure**.
5. **Expected Output on `/predictions/:id`:**
   - Failure Prediction: **YES** (Red badge)
   - Failure Probability: **~84%**
   - Risk Category: **HIGH RISK** (Red)
   - Recommended Action: *"Urgent inspection: stop or safely isolate the machine if operating conditions are abnormal. Inspect temperature, torque, tool wear and lubrication before restart."*
6. **What to say:** *"The model detected that high tool wear (>200 min) combined with elevated torque and reduced speed creates an overstrain condition. The failure probability is 84%, crossing our 30.9% threshold."*

---

## 4. Closed-Loop Maintenance Dispatch

1. On the High-Risk prediction screen, click **Create Work Order**.
2. Show the modal:
   - Machine: `MM-CNV-018`
   - Title: Auto-filled with the model's action recommendation
   - Priority: `High`
3. Assign a technician (e.g., *"Amit Patil"*) and click **Create Work Order**.
4. Navigate to **Work Orders** (`/work-orders`) and show that the newly generated task (`WO-XXXXX`) is now tracked on the maintenance board.
5. **What to say:** *"This closes the loop from predictive detection to maintenance execution, ensuring no failure alert goes unaddressed."*

---

## 5. Model Performance & MLflow Governance Demo

1. Navigate to **Model Performance** (`/model-performance`).
2. Show the **Champion Model** badge (**XGBoost**) and explain the metrics:
   - PR-AUC: 71.8%
   - Recall: 82.4%
   - Precision: 56.0%
   - Optimal Decision Threshold: 30.9%
3. Show the **Validation Metric Comparison Bar Chart** comparing XGBoost against Random Forest.
4. Click the link **Open MLflow UI** (`http://localhost:5000`) and show the tracked runs and artifacts.
5. Click **Train Models / Compare Models** to demonstrate that retraining is dispatched asynchronously without freezing the UI!
