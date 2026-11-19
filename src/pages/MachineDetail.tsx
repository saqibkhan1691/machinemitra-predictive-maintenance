import { ArrowLeft, ClipboardList, Sparkles, Wrench } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Card, Empty, PageHeader } from "../components/UI";
import { useAppData } from "../context/AppData";

export function MachineDetail() {
  const { id } = useParams();
  const data = useAppData();
  const nav = useNavigate();
  const [range, setRange] = useState("24h");
  const machine = data.machines.find((x) => x.id === id);
  if (!machine)
    return (
      <div className="page">
        <Empty title="Machine not found" text="This machine may have been removed." />
        <button className="btn primary" onClick={() => nav("/machines")}>
          Back to machines
        </button>
      </div>
    );
  const points = range === "24h" ? 12 : range === "7d" ? 18 : 24;
  const chart = Array.from({ length: points }, (_, i) => ({
    time: i + 1,
    temp: Number((machine.sensors.processTemperature + Math.sin(i) * 2).toFixed(1)),
    torque: Number((machine.sensors.torque + Math.cos(i) * 3).toFixed(1)),
  }));
  const predictions = data.predictions.filter((x) => x.machineId === id);
  const maintenance = data.maintenance.filter((x) => x.machineId === id);
  return (
    <div className="page">
      <button className="back-link" onClick={() => nav(-1)}>
        <ArrowLeft size={16} />
        Back
      </button>
      <PageHeader
        title={machine.name}
        description={`${machine.id} · ${machine.category} · ${machine.plant}`}
        actions={
          <>
            <Badge tone={machine.status}>{machine.status}</Badge>
            <Link className="btn primary" to={`/prediction?machine=${machine.id}`}>
              <Sparkles size={16} />
              Run Prediction
            </Link>
          </>
        }
      />
      <div className="detail-grid">
        <Card className="asset-summary">
          <div className="asset-score">
            <strong>{machine.health}</strong>
            <span>Health score</span>
          </div>
          <dl>
            <div>
              <dt>Product Type</dt>
              <dd>{machine.type}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{machine.location}</dd>
            </div>
            <div>
              <dt>Installed</dt>
              <dd>{machine.installed}</dd>
            </div>
            <div>
              <dt>Last service</dt>
              <dd>{machine.lastService}</dd>
            </div>
          </dl>
        </Card>
        <Card className="span-2">
          <div className="card-head">
            <div>
              <h2>Live sensor readings</h2>
              <p>Latest telemetry from the machine</p>
            </div>
            <Badge tone="Healthy">Live</Badge>
          </div>
          <div className="sensor-grid">
            <Sensor
              label="Air temperature"
              value={`${machine.sensors.airTemperature.toFixed(1)} K`}
            />
            <Sensor
              label="Process temperature"
              value={`${machine.sensors.processTemperature.toFixed(1)} K`}
            />
            <Sensor label="Rotational speed" value={`${machine.sensors.rotationalSpeed} RPM`} />
            <Sensor label="Torque" value={`${machine.sensors.torque.toFixed(1)} Nm`} />
            <Sensor label="Tool wear" value={`${machine.sensors.toolWear} min`} />
          </div>
        </Card>
        <Card className="span-3 chart-card">
          <div className="card-head">
            <div>
              <h2>Sensor trends</h2>
              <p>Process temperature and torque history</p>
            </div>
            <select value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chart}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area dataKey="temp" stroke="#1268a8" fill="#dcecf7" />
              <Area dataKey="torque" stroke="#f47a14" fill="#fff0e2" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="span-2">
          <div className="card-head">
            <div>
              <h2>Prediction history</h2>
              <p>Latest mock engine results</p>
            </div>
            <Link className="text-link" to={`/predictions?machine=${id}`}>
              View all
            </Link>
          </div>
          <div className="activity-list">
            {predictions.length ? (
              predictions.slice(0, 4).map((x) => (
                <Link key={x.id} to={`/predictions/${x.id}`}>
                  <Sparkles size={17} />
                  <span>
                    <strong>
                      {x.id} · {Math.round(x.probability * 100)}% probability
                    </strong>
                    <small>{new Date(x.timestamp).toLocaleString()}</small>
                  </span>
                  <Badge tone={x.risk}>{x.risk}</Badge>
                </Link>
              ))
            ) : (
              <Empty title="No predictions yet" text="Run a prediction to create history." />
            )}
          </div>
        </Card>
        <Card>
          <div className="card-head">
            <div>
              <h2>Maintenance history</h2>
              <p>Recommendations and tasks</p>
            </div>
            <Link className="text-link" to="/maintenance">
              View all
            </Link>
          </div>
          <div className="activity-list">
            {maintenance.map((x) => (
              <Link key={x.id} to="/maintenance">
                <Wrench size={17} />
                <span>
                  <strong>{x.title}</strong>
                  <small>
                    {x.dueDate} · {x.assignee}
                  </small>
                </span>
                <Badge tone={x.status}>{x.status}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
function Sensor({ label, value }: { label: string; value: string }) {
  return (
    <div className="sensor">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>Within expected range</small>
    </div>
  );
}
