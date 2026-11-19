import { ArrowDownUp, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Badge, Confirm, Empty, Modal, PageHeader, Pagination, Toast } from "../components/UI";
import { useAppData } from "../context/AppData";
import type { Machine } from "../types";

const blank: Machine = {
  id: "",
  name: "",
  type: "M",
  category: "",
  plant: "Pune Plant",
  location: "",
  status: "Healthy",
  health: 90,
  sensors: {
    airTemperature: 298,
    processTemperature: 308,
    rotationalSpeed: 1500,
    torque: 40,
    toolWear: 20,
  },
  installed: new Date().toISOString().slice(0, 10),
  lastService: new Date().toISOString().slice(0, 10),
};

export function Machines() {
  const data = useAppData();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState(params.get("status") || "");
  const [sort, setSort] = useState<keyof Machine>("name");
  const [asc, setAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Machine | null>(null);
  const [deleting, setDeleting] = useState<Machine | null>(null);
  const [toast, setToast] = useState("");
  const filtered = useMemo(
    () =>
      data.machines
        .filter(
          (x) =>
            `${x.id} ${x.name}`.toLowerCase().includes(query.toLowerCase()) &&
            (!type || x.category === type) &&
            (!status || x.status === status),
        )
        .sort((a, b) => String(a[sort]).localeCompare(String(b[sort])) * (asc ? 1 : -1)),
    [data.machines, query, type, status, sort, asc],
  );
  const size = 6,
    pages = Math.ceil(filtered.length / size),
    rows = filtered.slice((page - 1) * size, page * size);
  const sortBy = (key: keyof Machine) => {
    if (sort === key) setAsc(!asc);
    else {
      setSort(key);
      setAsc(true);
    }
  };
  return (
    <div className="page">
      <PageHeader
        title="My Machines"
        description={`${data.machines.length} connected assets across your plants.`}
        actions={
          <button
            className="btn primary"
            onClick={() => setEditing({ ...blank, id: `MM-${Date.now().toString().slice(-5)}` })}
          >
            <Plus size={17} />
            Add Machine
          </button>
        }
      />
      <div className="filterbar">
        <div className="field-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by machine ID or name"
          />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {[...new Set(data.machines.map((x) => x.category))].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All health states</option>
          <option>Healthy</option>
          <option>Attention</option>
          <option>Critical</option>
          <option>Offline</option>
        </select>
        <button
          className="btn ghost"
          onClick={() => {
            setQuery("");
            setType("");
            setStatus("");
          }}
        >
          Clear filters
        </button>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <Th label="Machine" onClick={() => sortBy("name")} />
              <Th label="Type" onClick={() => sortBy("category")} />
              <th>Location</th>
              <Th label="Health" onClick={() => sortBy("health")} />
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td>
                  <button className="table-main" onClick={() => nav(`/machines/${m.id}`)}>
                    <strong>{m.name}</strong>
                    <small>{m.id}</small>
                  </button>
                </td>
                <td>
                  {m.category} · {m.type}
                </td>
                <td>
                  {m.plant}
                  <small>{m.location}</small>
                </td>
                <td>
                  <strong>{m.health}%</strong>
                  <span className="health-track">
                    <i style={{ width: `${m.health}%` }} />
                  </span>
                </td>
                <td>
                  <Badge tone={m.status}>{m.status}</Badge>
                </td>
                <td>
                  <div className="row-actions">
                    <button title="View details" onClick={() => nav(`/machines/${m.id}`)}>
                      <Eye size={16} />
                    </button>
                    <button title="Edit" onClick={() => setEditing(m)}>
                      <Pencil size={16} />
                    </button>
                    <button title="Delete" onClick={() => setDeleting(m)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <Empty title="No machines found" text="Try changing your filters or add a new machine." />
        )}
        <Pagination page={page} pages={pages} onChange={setPage} />
      </div>
      {editing && (
        <MachineForm
          machine={editing}
          exists={data.machines.some((x) => x.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={(m) => {
            data.machines.some((x) => x.id === m.id) ? data.updateMachine(m) : data.addMachine(m);
            setEditing(null);
            setToast("Machine inventory updated");
          }}
        />
      )}
      {deleting && (
        <Confirm
          title="Delete machine?"
          text={`Delete ${deleting.name} and its open related records? This cannot be undone.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            data.deleteMachine(deleting.id);
            setDeleting(null);
            setToast("Machine deleted");
          }}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
function Th({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <th>
      <button onClick={onClick}>
        {label}
        <ArrowDownUp size={13} />
      </button>
    </th>
  );
}
function MachineForm({
  machine,
  exists,
  onClose,
  onSave,
}: {
  machine: Machine;
  exists: boolean;
  onClose: () => void;
  onSave: (m: Machine) => void;
}) {
  const [form, setForm] = useState(machine);
  const [error, setError] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.id.trim() || !form.name.trim() || !form.category.trim() || !form.location.trim()) {
      setError("Complete all required fields.");
      return;
    }
    if (form.health < 0 || form.health > 100) {
      setError("Health score must be between 0 and 100.");
      return;
    }
    onSave(form);
  };
  return (
    <Modal title={exists ? "Edit Machine" : "Add Machine"} onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label>
            Machine ID *
            <input
              value={form.id}
              disabled={exists}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
            />
          </label>
          <label>
            Machine name *
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            Product type
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as Machine["type"] })}
            >
              <option>L</option>
              <option>M</option>
              <option>H</option>
            </select>
          </label>
          <label>
            Machine category *
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </label>
          <label>
            Location *
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </label>
          <label>
            Health status
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Machine["status"] })}
            >
              <option>Healthy</option>
              <option>Attention</option>
              <option>Critical</option>
              <option>Offline</option>
            </select>
          </label>
          <label>
            Health score
            <input
              type="number"
              value={form.health}
              onChange={(e) => setForm({ ...form, health: Number(e.target.value) })}
            />
          </label>
          <label>
            Plant
            <input
              value={form.plant}
              onChange={(e) => setForm({ ...form, plant: e.target.value })}
            />
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Save Machine</button>
        </div>
      </form>
    </Modal>
  );
}
