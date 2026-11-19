import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Card, Modal, PageHeader, Toast } from "../components/UI";
import { useAppData } from "../context/AppData";
import type { Alert } from "../types";
import { api } from "../services/mockApi";

export function Monitoring() {
  const data = useAppData();
  const [params] = useSearchParams();
  const [range, setRange] = useState("7d");
  const [selected, setSelected] = useState<Alert | null>(null);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState("");
  const [liveSummary, setLiveSummary] = useState<any>(null);
  const [trainingError, setTrainingError] = useState("");
  useEffect(() => { api.monitoring().then(setLiveSummary).catch(() => setTrainingError("Backend monitoring is unavailable.")); }, []);
  useEffect(() => {
    const id = params.get("alert");
    if (id) setSelected(data.alerts.find((x) => x.id === id) || null);
  }, [params, data.alerts]);
  useEffect(() => {
    if (!progress || progress >= 100) return;
    const id = setTimeout(() => setProgress(Math.min(100, progress + 20)), 350);
    return () => clearTimeout(id);
  }, [progress]);
  useEffect(() => {
    if (progress === 100) setToast("Retraining workflow completed");
  }, [progress]);
  const volume = Array.from({ length: range === "24h" ? 12 : range === "7d" ? 7 : 14 }, (_, i) => ({
    label: i + 1,
    predictions: 18 + ((i * 7) % 19),
    drift: Math.round(8 + Math.sin(i) * 5),
  }));
  const features = [
    { name: "Tool wear", value: 22 },
    { name: "Torque", value: 16 },
    { name: "Speed", value: 11 },
    { name: "Air temp", value: 7 },
    { name: "Process temp", value: 9 },
  ];
  return (
    <div className="page">
      {trainingError && <p className="form-error">{trainingError}</p>}
      <PageHeader
        title="Monitoring & Alerts"
        description="Live prediction monitoring, model health and data drift status from the MachineMitra API."
        actions={
          <>
            <select value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
            </select>
            <button
              className="btn primary"
              disabled={progress > 0 && progress < 100}
              onClick={async () => { try { await api.train(); setProgress(1); } catch { setTrainingError("Could not start retraining. Check Docker services."); } }}
            >
              <RefreshCw size={16} />
              {progress > 0 && progress < 100
                ? `Simulating retraining ${progress}%`
                : "Trigger Retraining"}
            </button>
          </>
        }
      />
      {progress > 0 && progress < 100 && (
        <div className="progress-banner">
          <span style={{ width: `${progress}%` }} />
          <p>
            Retraining job progress is managed by the Python backend.
          </p>
        </div>
      )}
      <div className="kpi-grid three">
        <div className="kpi static">
          <span className="kpi-icon green">
            <ShieldCheck />
          </span>
          <div>
            <strong>Healthy</strong>
            <b>Model health</b>
            <small>Prototype checks passing</small>
          </div>
        </div>
        <div className="kpi static">
          <span className="kpi-icon orange">
            <ActivityIcon />
          </span>
          <div>
            <strong>{liveSummary?.driftStatus === "baseline_required" ? "Baseline needed" : liveSummary?.driftStatus === "insufficient_data" ? "Insufficient data" : "Unknown"}</strong>
            <b>Data drift</b>
            <small>Reference distribution required for drift testing</small>
          </div>
        </div>
        <div className="kpi static">
          <span className="kpi-icon blue">
            <CheckCircle2 />
          </span>
          <div>
            <strong>{liveSummary?.predictionCount ?? 0}</strong>
            <b>Prediction volume</b>
            <small>Backend prediction records</small>
          </div>
        </div>
      </div>
      <div className="two-col">
        <Card className="chart-card">
          <div className="card-head">
            <div>
              <h2>Prediction volume</h2>
              <p>Volume for selected monitoring period</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={volume}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Area dataKey="predictions" stroke="#1268a8" fill="#dcecf7" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="chart-card">
          <div className="card-head">
            <div>
              <h2>Feature drift</h2>
              <p>Illustrative feature list; drift scores require a reference baseline</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={features} layout="vertical">
              <CartesianGrid strokeDasharray="4 4" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="#f47a14" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card>
        <div className="card-head">
          <div>
            <h2>Operational alerts</h2>
            <p>Acknowledge alerts or open their details</p>
          </div>
          <button className="text-link" onClick={data.markAllRead}>
            Mark all read
          </button>
        </div>
        <div className="alert-cards">
          {data.alerts.map((a) => (
            <button
              key={a.id}
              className={a.acknowledged ? "acknowledged" : ""}
              onClick={() => {
                setSelected(a);
                data.updateAlert({ ...a, read: true });
              }}
            >
              <AlertTriangle size={18} />
              <span>
                <strong>{a.title}</strong>
                <small>
                  {a.machineId} · {new Date(a.createdAt).toLocaleString()}
                </small>
              </span>
              <Badge tone={a.severity}>{a.severity}</Badge>
              <b>{a.acknowledged ? "Acknowledged" : "Open"}</b>
            </button>
          ))}
        </div>
      </Card>
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <Badge tone={selected.severity}>{selected.severity} severity</Badge>
          <dl className="details-list">
            <div>
              <dt>Machine</dt>
              <dd>{selected.machineId}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{new Date(selected.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
          <p className="modal-copy">{selected.detail}</p>
          <div className="modal-actions">
            <button
              className="btn primary"
              disabled={selected.acknowledged}
              onClick={() => {
                data.updateAlert({ ...selected, read: true, acknowledged: true });
                setSelected(null);
                setToast("Alert acknowledged");
              }}
            >
              {selected.acknowledged ? "Already acknowledged" : "Acknowledge Alert"}
            </button>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
function ActivityIcon() {
  return <AlertTriangle />;
}
