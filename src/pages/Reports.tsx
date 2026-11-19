import { Download, Eye, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, Modal, PageHeader, Toast } from "../components/UI";
import { useAppData } from "../context/AppData";
import { downloadFile } from "../services/mockApi";

const reportTypes = ["Machine Health", "Prediction", "Maintenance", "Model Performance"];
export function Reports() {
  const data = useAppData();
  const [type, setType] = useState(reportTypes[0]);
  const [from, setFrom] = useState("2025-06-01");
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [preview, setPreview] = useState(false);
  const [toast, setToast] = useState("");
  const rows = useMemo(
    () =>
      type === "Machine Health"
        ? data.machines.map((x) => [x.id, x.name, x.status, `${x.health}%`])
        : type === "Prediction"
          ? data.predictions
              .filter((x) => x.timestamp.slice(0, 10) >= from && x.timestamp.slice(0, 10) <= to)
              .map((x) => [x.id, x.machineId, x.risk, `${Math.round(x.probability * 100)}%`])
          : type === "Maintenance"
            ? data.maintenance
                .filter((x) => x.dueDate >= from && x.dueDate <= to)
                .map((x) => [x.id, x.machineId, x.status, x.dueDate])
            : [
                ["Random Forest", "demo-rf-2.3", "91%", "Demonstration"],
                ["XGBoost", "demo-xgb-2.4", "92%", "Demonstration"],
              ],
    [data, type, from, to],
  );
  const exportReport = (format: "csv" | "txt") => {
    const content = [
      `${type} Report`,
      `Date range: ${from} to ${to}`,
      ...rows.map((x) => x.join(",")),
    ].join("\n");
    downloadFile(
      `machinemitra-${type.toLowerCase().replace(" ", "-")}.${format}`,
      content,
      format === "csv" ? "text/csv" : "text/plain",
    );
    setToast(`${format.toUpperCase()} report downloaded`);
  };
  return (
    <div className="page">
      <PageHeader
        title="Reports"
        description="Generate previews and exports from the currently selected persisted data."
      />
      <Card>
        <div className="report-controls">
          <label>
            Report type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {reportTypes.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button className="btn secondary" onClick={() => setPreview(true)}>
            <Eye size={16} />
            Preview
          </button>
          <button className="btn primary" onClick={() => exportReport("csv")}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </Card>
      <div className="report-grid">
        {reportTypes.map((x) => (
          <Card key={x} className={x === type ? "selected-report" : ""}>
            <span className="report-icon">
              <FileText />
            </span>
            <h2>{x} Report</h2>
            <p>
              {x === "Machine Health"
                ? "Inventory health and current operating state."
                : x === "Prediction"
                  ? "Risk outcomes and probability history."
                  : x === "Maintenance"
                    ? "Recommendations, assignees and status."
                    : "Demonstration model comparison metrics."}
            </p>
            <button
              className="text-link"
              onClick={() => {
                setType(x);
                setPreview(true);
              }}
            >
              Preview report
            </button>
          </Card>
        ))}
      </div>
      {preview && (
        <Modal title={`${type} Report Preview`} onClose={() => setPreview(false)} wide>
          <div className="report-preview">
            <div>
              <strong>MachineMitra</strong>
              <span>Machine ki sehat, ab AI ki nazar mein!</span>
            </div>
            <p>
              Reporting period: {from} to {to}
            </p>
            <table>
              <tbody>
                {rows.slice(0, 10).map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p>No data in this date range.</p>}
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => exportReport("txt")}>
              <Download size={16} />
              Download Report
            </button>
            <button className="btn primary" onClick={() => exportReport("csv")}>
              Export CSV
            </button>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
