# MachineMitra
### AI-Powered Predictive Maintenance and MLOps Platform

MachineMitra is an intelligent, Dockerized predictive maintenance platform designed to anticipate machine failures, evaluate equipment risk, and support proactive maintenance decisions. Built using the AI4I 2020 Predictive Maintenance Dataset, it integrates machine learning, model evaluation, experiment tracking, and prediction services into an end-to-end MLOps workflow.

The platform trains and compares Random Forest and XGBoost models, selects the best-performing model using validation PR-AUC, and provides machine failure predictions through a FastAPI backend and React-based interface.

---

## Key Features

- **Predictive Maintenance:** Predicts potential machine failures using operational sensor data.
- **Machine Learning:** Trains and evaluates Random Forest and XGBoost classifiers.
- **Model Comparison:** Compares models using classification and ranking metrics.
- **Champion Model Selection:** Selects the best model based on validation PR-AUC, with Recall as a secondary criterion.
- **MLOps Integration:** Tracks experiments, parameters, metrics, and model artifacts using MLflow.
- **Risk Assessment:** Categorizes equipment into Low, Medium, and High risk levels.
- **Prediction History:** Stores prediction records for subsequent analysis.
- **Maintenance Recommendations:** Provides rule-based maintenance guidance based on prediction results.
- **REST API:** Exposes prediction, training, monitoring, and work-order endpoints through FastAPI.
- **Containerized Deployment:** Uses Docker Compose to run the frontend, backend, and MLflow services.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript |
| Backend | Python, FastAPI |
| Machine Learning | Scikit-learn, XGBoost |
| Experiment Tracking | MLflow |
| Database | SQLite |
| Deployment | Docker, Docker Compose |
| Web Server | Nginx |
| Dataset | AI4I 2020 Predictive Maintenance Dataset |

---

## System Architecture

MachineMitra follows a containerized architecture consisting of three primary services:

1. **Frontend:** A React and TypeScript application served through Nginx.
2. **Backend:** A FastAPI service responsible for model training, predictions, application APIs, and data persistence.
3. **MLflow:** An experiment-tracking server that stores model parameters, evaluation metrics, and artifacts.

The services communicate through Docker's internal network, while their persistent data is maintained using named Docker volumes.

---

## Project Requirements

Before running the application, ensure that your system meets the following requirements:

- Windows 10 or Windows 11
- Docker Desktop installed
- WSL 2 backend enabled in Docker Desktop
- At least 8 GB RAM recommended
- Internet connection for the initial Docker build

---

## Getting Started

### 1. Clone the Repository

Open PowerShell and execute:

```powershell
git clone https://github.com/saqibkhan1691/machinemitra-predictive-maintenance.git
```

Navigate to the project directory:

```powershell
cd machinemitra-predictive-maintenance
```

### 2. Start Docker Desktop

Open Docker Desktop and wait until the Docker engine is running.

### 3. Build and Run the Application

From the project root directory, execute:

```powershell
docker compose up --build -d
```

Docker Compose will build the required images, create the application containers, and start the services.

### 4. Access the Application

Once all services have started, access the following URLs:

| Service | URL |
|---|---|
| MachineMitra Frontend | http://localhost:8080 |
| Backend API Documentation | http://localhost:8000/docs |
| Backend Health Check | http://localhost:8000/api/health |
| MLflow Tracking UI | http://localhost:5000 |

**Note:** The login screen currently uses a local prototype login flow. It is not production-grade authentication.

---

## Machine Learning Workflow

MachineMitra uses two machine learning algorithms:

- Random Forest Classifier
- XGBoost Classifier

Both models are trained and evaluated using identical stratified data splits to ensure a fair comparison.

### Dataset Splitting

The dataset is divided into three subsets:

| Dataset | Percentage | Purpose |
|---|---:|---|
| Training | 70% | Model training |
| Validation | 15% | Model comparison and threshold selection |
| Testing | 15% | Final model evaluation |

### Model Selection Strategy

The champion model is selected using the following evaluation strategy:

1. Train Random Forest and XGBoost using the same training data.
2. Evaluate both models on the validation dataset.
3. Compare their validation PR-AUC scores.
4. Use Recall as a secondary selection criterion.
5. Select the classification threshold using validation F2-score, prioritizing failure detection.
6. Evaluate the selected model on the held-out test dataset.

The final test dataset is not used for model selection or threshold optimization.

### Evaluation Metrics

The models are evaluated using:

- Accuracy
- Precision
- Recall
- F1-Score
- PR-AUC
- ROC-AUC
- Confusion Matrix

Since machine failure is a minority class in the supplied dataset, accuracy alone is not sufficient for evaluating model performance. PR-AUC and Recall are given particular importance.

### Data Leakage Prevention

The following columns are excluded from model training:

- UDI
- Product ID
- TWF
- HDF
- PWF
- OSF
- RNF

UDI and Product ID are identifiers, while the failure-mode columns contain information that could reveal the target. Excluding them helps prevent identifier and target leakage.

---

## Training the Models

Models can be trained directly through the application interface or using the backend API.

### Option 1: Through the Application

1. Open the MachineMitra frontend.
2. Navigate to **Model Performance**.
3. Select **Train Models / Compare Models**.
4. Wait for the training process to complete.

### Option 2: Through the REST API

Start the training process:

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/api/train
```

Check the training status:

```powershell
Invoke-RestMethod http://localhost:8000/api/train/status
```

The training process runs asynchronously. Poll the status endpoint until the job reports `completed` or `failed`.

After successful training, the selected champion model is saved to the persistent model volume and its experiment information is recorded in MLflow.

---

## Machine Failure Prediction

After the model training process is completed, navigate to **AI Insights / Failure Prediction** in the application.

The prediction service accepts machine operating parameters and returns:

- Predicted machine failure: YES or NO
- Failure probability
- Risk category
- Recommended maintenance action
- Champion model information and version

### Risk Classification

MachineMitra categorizes machine risk using the following probability ranges:

| Risk Category | Failure Probability |
|---|---|
| Low | Below 30% |
| Medium | 30% to below 70% |
| High | 70% or above |

**Important:** Risk categorization is independent of the binary classification threshold selected during validation. Maintenance recommendations are rule-based operational guidance, not model-generated diagnoses.

---

## Docker Services and Data Persistence

The application runs three primary Docker services:

| Service | Responsibility |
|---|---|
| `frontend` | Serves the React production build using Nginx |
| `backend` | Provides FastAPI endpoints and machine learning functionality |
| `mlflow` | Manages experiment tracking and model artifacts |

### Persistent Storage

Named Docker volumes are configured to preserve:

- Application SQLite records
- Trained model artifacts
- MLflow metadata
- MLflow artifacts

The original dataset is bundled in:

```text
data/raw/ai4i2020.csv
```

It is copied into the backend image during the Docker build.

### Useful Docker Commands

Check running containers:

```powershell
docker compose ps
```

View backend logs:

```powershell
docker compose logs -f backend
```

View MLflow logs:

```powershell
docker compose logs -f mlflow
```

Stop and remove containers:

```powershell
docker compose down
```

**Warning:** The following command removes containers and persistent volumes, including saved application records, trained models, and MLflow runs.

```powershell
docker compose down -v
```

Use it only when you intentionally want to reset the local application data.

---

## API Reference

The backend exposes the following REST API endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health status |
| POST | `/api/predict` | Generate a machine failure prediction |
| GET | `/api/predictions` | Retrieve prediction history |
| POST | `/api/train` | Start model training |
| GET | `/api/train/status` | Check training progress |
| GET | `/api/model/status` | Retrieve model status |
| GET | `/api/model/metrics` | Retrieve model evaluation metrics |
| GET | `/api/monitoring/summary` | Retrieve monitoring summary |
| POST | `/api/data/upload` | Upload incoming data |
| GET | `/api/work-orders` | Retrieve work orders |
| POST | `/api/work-orders` | Create a work order |
| PATCH | `/api/work-orders/{work_id}?status=Completed` | Update work-order status |

For interactive API testing, visit:

http://localhost:8000/docs

---

## Development Without Docker

Docker Compose is the recommended way to run the complete application. Individual components can also be started locally for development.

### Frontend

Install dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

### Backend

Backend development requires Python 3.11 and the dependencies listed in:

```text
backend/requirements.txt
```

Configure the following environment variables according to your local setup:

| Variable | Purpose |
|---|---|
| `MLFLOW_TRACKING_URI` | MLflow tracking server address |
| `APP_DB_PATH` | Application SQLite database location |
| `MODEL_DIR` | Trained model storage directory |
| `DATASET_PATH` | Dataset file location |
| `PROJECT_DATA_DIR` | Application data directory |

---

## Current Implementation Limitations

MachineMitra is an academic and development-stage project. The following implementation boundaries should be considered:

1. **Fleet Inventory:** The supplied UI uses sample/demo fleet data. It is not an actual fleet inferred from the AI4I dataset.
2. **CSV Uploads:** Uploaded labelled CSV files are stored in the incoming-data folder. They are not automatically merged into the training dataset. Schema validation and a controlled retraining workflow are required before using new data.
3. **Drift Monitoring:** The monitoring summary requires a reference baseline and sufficient production prediction records. A statistically meaningful drift detector requires stored reference feature distributions and representative production data.
4. **Frontend Persistence:** The existing browser-side localStorage state is still used for the demo fleet and some workflow screens. Prediction history and model training records are persisted through the backend.
5. **Authentication:** The current login flow is a prototype gate, not secure identity management.
6. **Production Readiness:** The application has not been hardened for public, multi-user production deployment.

Do not expose this deployment publicly without implementing authentication, authorization, secrets management, HTTPS, and appropriate production security controls.

---

## Dataset Information

**Dataset:** AI4I 2020 Predictive Maintenance Dataset

The dataset contains 10,000 records representing machine operating conditions and a binary target column:

```text
Machine failure
```

It includes operational parameters such as:

- Product type
- Air temperature
- Process temperature
- Rotational speed
- Torque
- Tool wear

The dataset is used to train and evaluate machine failure prediction models.

When redistributing the dataset separately, retain its original attribution and applicable license information.

---

## Project Objective

MachineMitra aims to demonstrate how machine learning and MLOps practices can be integrated into a practical predictive maintenance application.

By combining machine failure prediction, model comparison, experiment tracking, risk assessment, and maintenance workflows, the project provides an end-to-end foundation for exploring intelligent industrial maintenance systems.

---

**Developed as an academic machine learning and MLOps project.**