import { ArrowLeft, ClipboardPlus, Download, Factory, RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Badge, Card, Modal, PageHeader, Toast } from "../components/UI";
import { useAppData } from "../context/AppData";
import { downloadFile } from "../services/mockApi";
import type { WorkOrder } from "../types";

export function PredictionResult() {
  const { id } = useParams();
  const data = useAppData();
  const nav = useNavigate();
  const result = data.predictions.find((x) => x.id === id);
  const [work, setWork] = useState(false);
  const [toast, setToast] = useState("");
  if (!result)
    return (
      <div className="page">
        <p>Prediction not found.</p>
        <Link className="btn primary" to="/predictions">
          View history
        </Link>
      </div>
    );
  const machine = data.machines.find((x) => x.id === result.machineId);
  const save = () => {
    data.updatePrediction({ ...result, saved: true });
    setToast("Prediction report saved");
  };
  const download = () => {
    downloadFile(
      `${result.id}.txt`,
      `MachineMitra Prototype Prediction Report\n${JSON.stringify(result, null, 2)}`,
      "text/plain",
    );
    setToast("Report downloaded");
  };
  const createWork = () => {
    const item: WorkOrder = {
      id: `WO-${Date.now().toString().slice(-5)}`,
      title: result.action,
      machineId: result.machineId,
      technician: "Unassigned",
      priority: result.risk,
      status: "Pending",
      dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
      description: `Created from ${result.id}. ${result.action}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    data.saveWorkOrder(item);
    setWork(false);
    setToast("Maintenance work order created");
  };
  return (
    <div className="page">
      <button className="back-link" onClick={() => nav(-1)}>
        <ArrowLeft size={16} />
        Back
      </button>
      <PageHeader
        title="Prediction Results"
        description={`${result.id} · ${new Date(result.timestamp).toLocaleString()}`}
        actions={<Badge tone={result.risk}>{result.risk} RISK</Badge>}
      />
      <div className="result-hero">
        <div className={`result-decision ${result.failure ? "danger" : "safe"}`}>
          <span>FAILURE PREDICTION</span>
          <strong>{result.failure ? "YES" : "NO"}</strong>
          <small>Binary threshold: 65%</small>
        </div>
        <div>
          <span>FAILURE PROBABILITY</span>
          <strong>{Math.round(result.probability * 100)}%</strong>
          <small>Mock engine estimate</small>
        </div>
        <div>
          <span>RISK CATEGORY</span>
          <strong>{result.risk.toUpperCase()}</strong>
          <small>Based on configured thresholds</small>
        </div>
        <div>
          <span>RECOMMENDED ACTION</span>
          <strong className="action-text">{result.action}</strong>
          <small>
            {result.risk === "High" ? "Urgency: within 24 hours" : "Urgency: planned inspection"}
          </small>
        </div>
      </div>
      <div className="result-grid">
        <Card>
          <h2>Prediction context</h2>
          <dl className="details-list">
            <div>
              <dt>Machine</dt>
              <dd>{machine?.name || result.machineId}</dd>
            </div>
            <div>
              <dt>Machine ID</dt>
              <dd>{result.machineId}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{result.model}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{result.version}</dd>
            </div>
          </dl>
          <div className="risk-explain">
            <h3>Why this risk level?</h3>
            <p>
              The displayed probability is produced by the registered champion model using the submitted sensor features. Risk is categorized independently using the configured 30% and 70% boundaries. The model output is a statistical estimate, not a guarantee of machine failure.
            </p>
          </div>
        </Card>
        <Card>
          <h2>Sensor snapshot</h2>
          <div className="sensor-grid">
            {Object.entries(result.sensors).map(([k, v]) => (
              <div className="sensor" key={k}>
                <span>{k.replace(/([A-Z])/g, " $1")}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="action-strip">
        <button className="btn secondary" onClick={() => nav(`/machines/${result.machineId}`)}>
          <Factory size={16} />
          View Machine Details
        </button>
        <button className="btn secondary" onClick={save}>
          <Save size={16} />
          {result.saved ? "Saved" : "Save Prediction Report"}
        </button>
        <button className="btn secondary" onClick={download}>
          <Download size={16} />
          Download Report
        </button>
        <button
          className="btn secondary"
          onClick={() => nav(`/prediction?machine=${result.machineId}`)}
        >
          <RotateCcw size={16} />
          Run Another Prediction
        </button>
        <button className="btn primary" onClick={() => setWork(true)}>
          <ClipboardPlus size={16} />
          Add Maintenance Work Order
        </button>
      </div>
      {work && (
        <Modal title="Create work order from prediction" onClose={() => setWork(false)}>
          <p className="modal-copy">
            Create a {result.risk.toLowerCase()}-priority work order for {result.machineId} with the
            recommendation “{result.action}”?
          </p>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setWork(false)}>
              Cancel
            </button>
            <button className="btn primary" onClick={createWork}>
              Create Work Order
            </button>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
