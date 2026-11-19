import { Activity, AlertTriangle, CalendarClock, Factory, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, PageHeader, Badge } from "../components/UI";
import { useAppData } from "../context/AppData";

const trends = {
  "7d": [82, 84, 83, 86, 85, 88, 89],
  "30d": [77, 79, 78, 81, 80, 83, 85, 84, 87, 86, 89, 89],
  "90d": [72, 75, 73, 77, 80, 78, 82, 84, 83, 86, 88, 89],
};

export function Overview() {
  const data = useAppData();
  const nav = useNavigate();
  const [range, setRange] = useState<keyof typeof trends>("7d");
  const stats = useMemo(() => {
    const online = data.machines.filter((x) => x.status !== "Offline").length;
    const avg = Math.round(
      data.machines.reduce((s, x) => s + x.health, 0) / Math.max(1, data.machines.length),
    );
    return {
      online,
      avg,
      alerts: data.alerts.filter((x) => !x.acknowledged).length,
      due: data.maintenance.filter((x) => x.status !== "Completed" && x.status !== "Cancelled")
        .length,
    };
  }, [data]);
  const line = trends[range].map((health, i) => ({ label: `${i + 1}`, health }));
  const distribution = ["Healthy", "Attention", "Critical", "Offline"].map((name) => ({
    name,
    value: data.machines.filter((x) => x.status === name).length,
  }));
  return (
    <div className="page">
      <PageHeader
        title={`Namaste, ${data.settings.name.split(" ")[0]}`}
        description="Here’s what’s happening across your machines today."
        actions={
          <div className="tagline-mini">
            <Sparkles size={16} />
            Machine ki sehat, ab AI ki nazar mein!
          </div>
        }
      />
      <div className="kpi-grid">
        <Kpi
          icon={Factory}
          tone="blue"
          value={data.machines.length}
          label="Total Machines"
          sub={`${stats.online} currently online`}
          onClick={() => nav("/machines")}
        />
        <Kpi
          icon={Activity}
          tone="green"
          value={`${stats.avg}%`}
          label="Fleet Health Score"
          sub="Calculated from inventory"
          onClick={() => nav("/machines?status=Healthy")}
        />
        <Kpi
          icon={AlertTriangle}
          tone="orange"
          value={stats.alerts}
          label="Active Alerts"
          sub={`${data.alerts.filter((x) => x.severity === "High" && !x.acknowledged).length} require attention`}
          onClick={() => nav("/monitoring")}
        />
        <Kpi
          icon={CalendarClock}
          tone="navy"
          value={stats.due}
          label="Maintenance Due"
          sub="Open recommendations"
          onClick={() => nav("/maintenance")}
        />
      </div>
      <div className="overview-grid">
        <Card className="chart-card span-2">
          <div className="card-head">
            <div>
              <h2>Fleet health trend</h2>
              <p>Average machine health score across all plants</p>
            </div>
            <select value={range} onChange={(e) => setRange(e.target.value as keyof typeof trends)}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
          <div className="chart-number">
            <strong>{stats.avg}</strong>
            <span>+3.1 pts</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={line}>
              <defs>
                <linearGradient id="healthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#1268a8" stopOpacity=".3" />
                  <stop offset="1" stopColor="#1268a8" stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="label" tickLine={false} />
              <YAxis domain={[60, 100]} tickLine={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="health"
                stroke="#1268a8"
                strokeWidth={2.5}
                fill="url(#healthFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="chart-card">
          <div className="card-head">
            <div>
              <h2>Health distribution</h2>
              <p>Current machine condition</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={distribution}
                dataKey="value"
                innerRadius={52}
                outerRadius={72}
                paddingAngle={3}
              >
                {["#16a36a", "#f0a126", "#dc4c4c", "#8391a1"].map((c) => (
                  <Cell key={c} fill={c} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="legend">
            {distribution.map((x, i) => (
              <span key={x.name}>
                <i style={{ background: ["#16a36a", "#f0a126", "#dc4c4c", "#8391a1"][i] }} />
                {x.name} <b>{x.value}</b>
              </span>
            ))}
          </div>
        </Card>
        <Card className="span-2">
          <div className="card-head">
            <div>
              <h2>Priority machines</h2>
              <p>Assets requiring the closest attention</p>
            </div>
            <button className="text-link" onClick={() => nav("/machines")}>
              View all machines
            </button>
          </div>
          <div className="compact-table">
            {[...data.machines]
              .sort((a, b) => a.health - b.health)
              .slice(0, 4)
              .map((m) => (
                <button key={m.id} onClick={() => nav(`/machines/${m.id}`)}>
                  <span className="asset-symbol">
                    <Factory size={18} />
                  </span>
                  <span>
                    <strong>{m.name}</strong>
                    <small>
                      {m.id} · {m.location}
                    </small>
                  </span>
                  <Badge tone={m.status}>{m.status}</Badge>
                  <b>{m.health}%</b>
                </button>
              ))}
          </div>
        </Card>
        <Card>
          <div className="card-head">
            <div>
              <h2>Recent alerts</h2>
              <p>Latest fleet events</p>
            </div>
            <button className="text-link" onClick={() => nav("/monitoring")}>
              View all
            </button>
          </div>
          <div className="activity-list">
            {data.alerts.slice(0, 3).map((a) => (
              <button key={a.id} onClick={() => nav(`/monitoring?alert=${a.id}`)}>
                <AlertTriangle size={17} />
                <span>
                  <strong>{a.title}</strong>
                  <small>{a.machineId}</small>
                </span>
                <Badge tone={a.severity}>{a.severity}</Badge>
              </button>
            ))}
          </div>
        </Card>
        <Card className="ai-insight span-3">
          <div>
            <Sparkles />
            <span>
              <small>MACHINEMITRA MOCK AI INSIGHT</small>
              <h2>Prevent avoidable downtime</h2>
            </span>
          </div>
          <p>
            {data.predictions[0]?.machineId} shows the highest current failure probability at{" "}
            <strong>{Math.round((data.predictions[0]?.probability || 0) * 100)}%</strong>. Review
            the recommendation before the next production cycle.
          </p>
          <button onClick={() => nav(`/predictions/${data.predictions[0]?.id}`)}>
            Review prediction
          </button>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  tone,
  value,
  label,
  sub,
  onClick,
}: {
  icon: typeof Factory;
  tone: string;
  value: string | number;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button className="kpi" onClick={onClick}>
      <span className={`kpi-icon ${tone}`}>
        <Icon size={19} />
      </span>
      <div>
        <strong>{value}</strong>
        <b>{label}</b>
        <small>{sub}</small>
      </div>
    </button>
  );
}
