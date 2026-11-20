# MachineMitra — Phase 15: Technical Limitations, Assumptions & Future Roadmap

In a B.Tech viva, professors respect candidates who can candidly and accurately identify the boundaries and limitations of their system. Never claim your prototype is a finished industrial commercial product.

---

## 1. Technical Limitations & Gaps Analysis

### 1.1 Ingestion Mechanism: Batch REST vs. Real-Time Streaming
- **Current Reality:** Sensor telemetry is ingested via HTTP POST requests to `/api/predict` or manual UI form entry.
- **Limitation:** In an actual manufacturing plant, milling machines stream telemetry at high frequencies (10 Hz to 1 kHz) via industrial fieldbuses (Modbus, Profinet, OPC-UA).
- **Production Solution:** Deploy an **Apache Kafka** or **MQTT broker** (e.g., Eclipse Mosquitto) that ingests streaming telemetry, buffers surges, and feeds worker pools running inference.

### 1.2 Data Drift Detection: Descriptive vs. Continuous Statistical Testing
- **Current Reality:** In `backend/app/main.py` lines 126–132 (`/api/monitoring/summary`), the backend computes prediction counts and risk ratios, returning `'insufficient_data'` (<30 calls) or `'baseline_required'`. The UI displays simulated feature drift charts.
- **Limitation:** The system does not run automated two-sample statistical tests (e.g., Kolmogorov-Smirnov test or Population Stability Index) comparing production sensor distributions against the training reference.
- **Production Solution:** Integrate **Evidently AI** or **Great Expectations** to compute continuous drift metrics and automatically trigger retraining when $p$-values drop below $\alpha = 0.05$.

### 1.3 State Management Asymmetry (Dual Work Order Storage)
- **Current Reality:**
  - The backend maintains working SQLite endpoints (`GET`, `POST`, `PATCH /api/work-orders`).
  - The React frontend persists work orders client-side in `localStorage` via `AppDataProvider` (`src/context/AppData.tsx`).
- **Why this exists:** Built for offline prototype demonstration and immediate UI responsiveness.
- **Viva Defense:** *"Our backend exposes full CRUD REST endpoints for work orders backed by SQLite, while our React frontend currently maintains a responsive client-side state store. In production, we would bind the React state directly to the `/api/work-orders` API."*

### 1.4 Authentication & Identity Security
- **Current Reality:** [src/pages/Login.tsx](file:///d:/AiOPS/machinemitra-predictive-maintenance/src/pages/Login.tsx) performs client-side email/password validation and sets a boolean flag in browser `sessionStorage`. The FastAPI backend does not issue or verify cryptographic JWT tokens.
- **Limitation:** Any client can call `/api/predict` or `/api/train` directly without bearer tokens.
- **Production Solution:** Implement **OAuth 2.0 / OpenID Connect (OIDC)** using Keycloak, Auth0, or Azure Active Directory, enforcing Role-Based Access Control (RBAC) across Plant Managers, Reliability Engineers, and Technicians.

### 1.5 Synthetic Dataset Fidelity
- **Current Reality:** The AI4I 2020 dataset is synthetically generated from milling machine physics models.
- **Limitation:** Real-world machine telemetry contains non-deterministic vibration harmonics, ambient noise, irregular power surges, and human operational variances that synthetic datasets may not fully capture.
- **Production Solution:** Fine-tune the champion model using transfer learning or domain adaptation on physical machine sensor logs collected from real factory PLCs.

---

## 2. Code Quality & Defensive Improvements

| Issue / Boundary | Current State | Recommended Production Enhancement |
|---|---|---|
| **Model Deserialization** | Loaded via Python `pickle.load()` on each inference call. | In production, use high-throughput formats like **ONNX Runtime** or **Triton Inference Server** to prevent potential arbitrary code execution risks associated with unpickling untrusted files. |
| **Database Concurrency** | SQLite 3 embedded file (`data/machinemitra.db`). | Migrate to **PostgreSQL** or **TimescaleDB** (time-series optimized) with **SQLAlchemy** connection pooling to support hundreds of concurrent machine write streams. |
| **Subprocess Execution** | Retraining executes via `subprocess.run([sys.executable, str(script)])`. | For distributed production clusters, dispatch retraining jobs to a dedicated task queue using **Celery** with **Redis** or a **Kubernetes Job**. |
| **API Client Naming** | The frontend API client is named `mockApi.ts` even though it makes real REST calls. | Rename `src/services/mockApi.ts` to `apiService.ts` to reflect that it makes real HTTP fetch requests to FastAPI. |

---

## 3. How to Turn Limitations into High Marks During Viva

When asked: *"What are the limitations of your system?"*, use this winning answer:
> *"Respected Examiners, MachineMitra was engineered as a robust architectural prototype demonstrating the complete MLOps and predictive maintenance lifecycle. In evaluating its boundaries for enterprise factory deployment, we have identified three clear areas of progression:*
> *First, while our REST inference pipeline executes in 15 milliseconds, true factory IoT requires an asynchronous streaming message broker like Apache Kafka or MQTT to ingest high-frequency sensor streams.*
> *Second, while our monitoring endpoint tracks prediction volumes and risk distributions, full enterprise governance requires automated two-sample drift tests like Kolmogorov-Smirnov using tools like Evidently AI.*
> *Third, for enterprise security, we would replace our prototype session gate with OAuth 2.0 / OIDC and Role-Based Access Control.*
> *Demonstrating that we understand these industrial requirements and architectural trade-offs is a key part of our engineering education."*
