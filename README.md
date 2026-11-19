# MachineMitra

MachineMitra is a Dockerized predictive maintenance application built around the supplied React + TypeScript UI and the AI4I 2020 Predictive Maintenance dataset. It includes a FastAPI service, Random Forest and XGBoost training, MLflow experiment tracking, champion model selection, SQLite persistence, prediction history and monitoring endpoints.

## Requirements

- Windows 10/11
- Docker Desktop with the WSL 2 backend enabled
- At least 8 GB RAM recommended
- Internet access for the first Docker build (images and Python/Node packages)

## Start the application

1. Extract the project folder.
2. Open Docker Desktop and wait until the engine is running.
3. Open PowerShell in the `MachineMitra` folder.
4. Run:

```powershell
docker compose up --build -d
```

Open:

- Frontend: http://localhost:8080
- Backend API documentation: http://localhost:8000/docs
- Backend health: http://localhost:8000/api/health
- MLflow: http://localhost:5000

The login screen is a local prototype login; use the UI's login flow. It is not production authentication.

## Train the models

Open Model Performance in the application and select **Train Models / Compare Models**, or run:

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/api/train
```

Check progress:

```powershell
Invoke-RestMethod http://localhost:8000/api/train/status
```

Training fits Random Forest and XGBoost on identical stratified data splits. It uses 70% training, 15% validation and 15% final test data. Model selection is based on validation PR-AUC, with Recall as the secondary criterion. The binary classification threshold is selected by validation F2-score. The final test split is held out from model selection. The selected champion is saved to the persistent model volume and tracked in MLflow.

The supplied AI4I data is class-imbalanced. Accuracy alone is not used to select the model. The model input excludes UDI, Product ID and failure-mode labels (TWF, HDF, PWF, OSF, RNF) to avoid identifier and target leakage.

## Prediction

After training finishes, use AI Insights / Failure Prediction. The API returns:

- Failure prediction YES/NO
- Failure probability
- Risk category: Low below 30%, Medium from 30% to below 70%, High at or above 70%
- Recommended maintenance action
- Champion model and version

Risk categorization is separate from the binary classification threshold. Recommendations are rule-based operational guidance, not model-generated maintenance diagnoses.

## Docker services and persistence

- `frontend`: Nginx-served React production build
- `backend`: FastAPI prediction and application API
- `mlflow`: MLflow tracking server with its own SQLite metadata store

Named Docker volumes persist application SQLite records, trained model artifacts, MLflow metadata and MLflow artifacts. The source dataset is bundled in `data/raw/ai4i2020.csv` and copied into the backend image.

Useful commands:

```powershell
docker compose ps
docker compose logs -f backend
docker compose logs -f mlflow
docker compose down
```

To remove containers and persistent volumes (this deletes saved local application data, model artifacts and MLflow runs):

```powershell
docker compose down -v
```

## API endpoints

- `GET /api/health`
- `POST /api/predict`
- `GET /api/predictions`
- `POST /api/train`
- `GET /api/train/status`
- `GET /api/model/status`
- `GET /api/model/metrics`
- `GET /api/monitoring/summary`
- `POST /api/data/upload`
- `GET /api/work-orders`
- `POST /api/work-orders`
- `PATCH /api/work-orders/{work_id}?status=Completed`

## Current implementation boundaries

- Fleet inventory in the supplied UI remains a sample/demo fleet; it is not a fleet inferred from AI4I records. Predictions submitted in the UI use the actual trained model.
- New labelled CSV uploads are stored in the incoming-data folder. They are not automatically mixed into training. A controlled schema validation and retraining process is required before using new labelled data.
- Drift summary reports that a baseline is required until enough production prediction records exist. A statistically meaningful drift detector requires a stored reference feature distribution and representative production data; this project does not fabricate a drift result.
- The UI's existing browser-side localStorage state remains for its demo fleet and some workflow screens. Prediction history and ML training records are persisted by the backend. This is a local academic project, not a hardened multi-user production system.
- Login is a prototype gate, not secure identity management. Do not expose this deployment publicly without authentication, authorization, secrets management and HTTPS.

## Development without Docker

Frontend:

```powershell
npm install
npm run dev
```

Backend local development requires Python 3.11 and dependencies from `backend/requirements.txt`. Set `MLFLOW_TRACKING_URI`, `APP_DB_PATH`, `MODEL_DIR`, `DATASET_PATH` and `PROJECT_DATA_DIR` for the local environment.

## Dataset reference

AI4I 2020 Predictive Maintenance Dataset, containing 10,000 records and the target column `Machine failure`. Keep the original dataset attribution and license information when redistributing the dataset separately.
