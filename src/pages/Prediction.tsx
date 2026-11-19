import { RotateCcw, Sparkles, TestTube2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Card, PageHeader } from "../components/UI";
import { useAppData } from "../context/AppData";
import { mockPredictionService } from "../services/mockApi";
import type { PredictionRequest } from "../types";

const empty: PredictionRequest = {
  machineId: "",
  productType: "M",
  airTemperature: 298,
  processTemperature: 308,
  rotationalSpeed: 1500,
  torque: 40,
  toolWear: 60,
};
export function PredictionForm() {
  const data = useAppData();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const initial = params.get("machine");
  const machine = data.machines.find((x) => x.id === initial);
  const [form, setForm] = useState<PredictionRequest>(
    machine
      ? { machineId: machine.id, productType: machine.type, ...machine.sensors }
      : { ...empty },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serviceError, setServiceError] = useState("");
  const set = (key: keyof PredictionRequest, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.machineId) e.machineId = "Select a machine.";
    (
      ["airTemperature", "processTemperature", "rotationalSpeed", "torque", "toolWear"] as const
    ).forEach((k) => {
      if (!Number.isFinite(form[k]) || form[k] < 0) e[k] = "Enter a valid positive number.";
    });
    if (form.rotationalSpeed < 100 || form.rotationalSpeed > 10000)
      e.rotationalSpeed = "Use a speed between 100 and 10,000 RPM.";
    return e;
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const valid = validate();
    setErrors(valid);
    if (Object.keys(valid).length) return;
    setLoading(true);
    setServiceError("");
    try {
      const result = await mockPredictionService.predict(form);
      data.addPrediction(result);
      nav(`/predictions/${result.id}`);
    } catch {
      setServiceError("Prediction could not be completed. Check that Docker services are running and a champion model has been trained.");
    } finally {
      setLoading(false);
    }
  };
  const loadSample = () =>
    setForm({
      machineId: data.machines[3]?.id || "MM-CNV-018",
      productType: "L",
      airTemperature: 301.2,
      processTemperature: 312.7,
      rotationalSpeed: 1275,
      torque: 59.4,
      toolWear: 218,
    });
  return (
    <div className="page">
      <PageHeader
        title="AI Failure Prediction"
        description="Evaluate machine operating conditions using the trained production model."
      />
      <div className="prediction-layout">
        <Card>
          <div className="prototype-banner">
            <TestTube2 size={18} />
            <div>
              <strong>Live model prediction</strong>
              <p>Predictions are processed by the champion model trained and registered through MLflow. Train the models from Model Performance if no model is available yet.</p>
            </div>
          </div>
          <form className="prediction-form" onSubmit={submit}>
            <div className="form-grid">
              <label>
                Machine ID *
                <select
                  value={form.machineId}
                  onChange={(e) => {
                    const m = data.machines.find((x) => x.id === e.target.value);
                    if (m) setForm({ machineId: m.id, productType: m.type, ...m.sensors });
                    else set("machineId", e.target.value);
                  }}
                >
                  <option value="">Select machine</option>
                  {data.machines.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.id} — {x.name}
                    </option>
                  ))}
                </select>
                {errors.machineId && <small className="error">{errors.machineId}</small>}
              </label>
              <label>
                Product Type
                <select
                  value={form.productType}
                  onChange={(e) => set("productType", e.target.value)}
                >
                  <option>L</option>
                  <option>M</option>
                  <option>H</option>
                </select>
              </label>
              <NumberField
                label="Air Temperature (K)"
                name="airTemperature"
                value={form.airTemperature}
                error={errors.airTemperature}
                onChange={set}
              />
              <NumberField
                label="Process Temperature (K)"
                name="processTemperature"
                value={form.processTemperature}
                error={errors.processTemperature}
                onChange={set}
              />
              <NumberField
                label="Rotational Speed (RPM)"
                name="rotationalSpeed"
                value={form.rotationalSpeed}
                error={errors.rotationalSpeed}
                onChange={set}
              />
              <NumberField
                label="Torque (Nm)"
                name="torque"
                value={form.torque}
                error={errors.torque}
                onChange={set}
              />
              <NumberField
                label="Tool Wear (min)"
                name="toolWear"
                value={form.toolWear}
                error={errors.toolWear}
                onChange={set}
              />
            </div>
            {serviceError && <p className="form-error">{serviceError}</p>}
            <div className="form-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setForm({ ...empty });
                  setErrors({});
                }}
              >
                <RotateCcw size={16} />
                Reset
              </button>
              <button type="button" className="btn secondary" onClick={loadSample}>
                <TestTube2 size={16} />
                Load Sample Data
              </button>
              <button className="btn primary" disabled={loading}>
                <Sparkles size={16} />
                {loading ? "Evaluating machine…" : "Predict Failure"}
              </button>
            </div>
          </form>
        </Card>
        <Card className="prediction-help">
          <h2>How to use this prototype</h2>
          <ol>
            <li>Select a connected machine or load sample values.</li>
            <li>Review and adjust its latest sensor readings.</li>
            <li>Run the mock engine to generate a risk result.</li>
            <li>Save the result or create a work order.</li>
          </ol>
          <p>
            Risk thresholds: <b>Low &lt;30%</b>, <b>Medium 30–69.99%</b>, <b>High ≥70%</b>. Binary failure uses a separately validated F2 threshold.
          </p>
        </Card>
      </div>
    </div>
  );
}
function NumberField({
  label,
  name,
  value,
  error,
  onChange,
}: {
  label: string;
  name: keyof PredictionRequest;
  value: number;
  error?: string;
  onChange: (k: keyof PredictionRequest, v: number) => void;
}) {
  return (
    <label>
      {label} *
      <input
        type="number"
        step="0.1"
        value={value}
        onChange={(e) => onChange(name, e.target.value === "" ? NaN : Number(e.target.value))}
      />
      {error && <small className="error">{error}</small>}
    </label>
  );
}
