import { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BrainCircuit,
  ChevronDown,
  ClipboardList,
  Factory,
  FileClock,
  FileText,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  User,
  Wrench,
  X,
} from "lucide-react";
import logo from "../assets/machinemitra-logo-transparent.png";
import { useAppData } from "../context/AppData";

const groups = [
  {
    label: "WORKSPACE",
    items: [
      ["/overview", "Overview", LayoutDashboard],
      ["/machines", "My Machines", Factory],
      ["/prediction", "AI Failure Prediction", Sparkles],
      ["/predictions", "Prediction History", FileClock],
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      ["/maintenance", "Maintenance", Wrench],
      ["/work-orders", "Work Orders", ClipboardList],
      ["/monitoring", "Monitoring & Alerts", AlertTriangle],
      ["/reports", "Reports", FileText],
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      ["/model-performance", "Model Performance", BarChart3],
      ["/settings", "Settings", Settings],
    ],
  },
] as const;

export function AppLayout() {
  const data = useAppData();
  const nav = useNavigate();
  const location = useLocation();
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const unread = data.alerts.filter((a) => !a.read).length;
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return [
      ...data.machines
        .filter((x) => `${x.id} ${x.name}`.toLowerCase().includes(q))
        .map((x) => ({ label: x.name, sub: x.id, to: `/machines/${x.id}` })),
      ...data.predictions
        .filter((x) => x.id.toLowerCase().includes(q) || x.machineId.toLowerCase().includes(q))
        .map((x) => ({
          label: x.id,
          sub: `Prediction · ${x.machineId}`,
          to: `/predictions/${x.id}`,
        })),
      ...data.workOrders
        .filter((x) => `${x.id} ${x.title}`.toLowerCase().includes(q))
        .map((x) => ({ label: x.title, sub: x.id, to: "/work-orders" })),
    ].slice(0, 7);
  }, [query, data]);
  const crumbs = location.pathname.split("/").filter(Boolean);

  return (
    <div className="app-shell">
      {mobile && <button className="sidebar-scrim" onClick={() => setMobile(false)} />}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="sidebar-brand">
          <img src={logo} alt="MachineMitra" />
          <button onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>
        <div className="sidebar-tagline">Machine ki sehat, ab AI ki nazar mein!</div>
        <nav>
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map(([to, label, Icon]) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobile(false)}
                  className={({ isActive }) => (isActive ? "active" : "")}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {to === "/monitoring" && unread > 0 && <b>{unread}</b>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-user">
          <span>
            {data.settings.name
              .split(" ")
              .map((x) => x[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div>
            <strong>{data.settings.name}</strong>
            <small>{data.settings.role}</small>
          </div>
          <button
            onClick={() => {
              data.logout();
              nav("/login");
            }}
            title="Sign out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <main className="content-shell">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <div className="global-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search machines, predictions, work orders…"
            />
            {query && (
              <div className="search-results">
                {results.length ? (
                  results.map((r) => (
                    <Link key={`${r.to}${r.label}`} to={r.to} onClick={() => setQuery("")}>
                      <strong>{r.label}</strong>
                      <small>{r.sub}</small>
                    </Link>
                  ))
                ) : (
                  <p>No matching records</p>
                )}
              </div>
            )}
          </div>
          <div className="top-actions">
            <button className="plant-chip">
              <Factory size={16} />
              <span>{data.settings.plantName}</span>
              <ChevronDown size={14} />
            </button>
            <button
              className="icon-btn"
              onClick={() => {
                setNoticeOpen(!noticeOpen);
                setProfileOpen(false);
              }}
            >
              <Bell size={19} />
              {unread > 0 && <i>{unread}</i>}
            </button>
            <button
              className="profile-button"
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNoticeOpen(false);
              }}
            >
              <span>RK</span>
              <ChevronDown size={14} />
            </button>
          </div>
          {noticeOpen && (
            <div className="popover notifications">
              <div className="popover-head">
                <strong>Notifications</strong>
                <button onClick={data.markAllRead}>Mark all read</button>
              </div>
              {data.alerts.slice(0, 4).map((a) => (
                <button
                  className={`notification ${a.read ? "" : "unread"}`}
                  key={a.id}
                  onClick={() => {
                    data.updateAlert({ ...a, read: true });
                    setNoticeOpen(false);
                    nav(`/monitoring?alert=${a.id}`);
                  }}
                >
                  <AlertTriangle size={17} />
                  <span>
                    <strong>{a.title}</strong>
                    <small>{a.machineId}</small>
                  </span>
                </button>
              ))}
              <Link to="/monitoring" onClick={() => setNoticeOpen(false)}>
                View all alerts
              </Link>
            </div>
          )}
          {profileOpen && (
            <div className="popover profile-menu">
              <Link to="/settings" onClick={() => setProfileOpen(false)}>
                <User size={16} />
                Profile settings
              </Link>
              <Link to="/model-performance" onClick={() => setProfileOpen(false)}>
                <Gauge size={16} />
                Model performance
              </Link>
              <button
                onClick={() => {
                  data.logout();
                  nav("/login");
                }}
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          )}
        </header>
        <div className="breadcrumb">
          <Link to="/overview">MachineMitra</Link>
          {crumbs.map((c, i) => (
            <span key={`${c}${i}`}>
              / <b>{c.replace(/-/g, " ")}</b>
            </span>
          ))}
        </div>
        <Outlet />
      </main>
    </div>
  );
}
