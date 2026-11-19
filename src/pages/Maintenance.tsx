import { Eye, Plus, Search } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Badge, Empty, Modal, PageHeader, Toast } from "../components/UI";
import { useAppData } from "../context/AppData";
import type { Maintenance, Risk, WorkStatus } from "../types";

export function MaintenancePage() {
  const data = useAppData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [editing, setEditing] = useState<Maintenance | null>(null);
  const [toast, setToast] = useState("");
  const rows = useMemo(
    () =>
      data.maintenance.filter(
        (x) =>
          `${x.id} ${x.title} ${x.machineId}`.toLowerCase().includes(query.toLowerCase()) &&
          (!status || x.status === status) &&
          (!priority || x.priority === priority),
      ),
    [data.maintenance, query, status, priority],
  );
  const create = (): Maintenance => ({
    id: `MT-${Date.now().toString().slice(-5)}`,
    machineId: data.machines[0]?.id || "",
    title: "",
    priority: "Medium",
    status: "Pending",
    assignee: "Unassigned",
    dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    source: "Manual recommendation",
  });
  return (
    <div className="page">
      <PageHeader
        title="Maintenance"
        description="Manage recommendations, assignments and completion status."
        actions={
          <button className="btn primary" onClick={() => setEditing(create())}>
            <Plus size={16} />
            Create Recommendation
          </button>
        }
      />
      <div className="filterbar">
        <div className="field-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search maintenance records"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {["Pending", "Assigned", "In Progress", "Completed", "Cancelled"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priorities</option>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Recommendation</th>
              <th>Machine</th>
              <th>Priority</th>
              <th>Assignee</th>
              <th>Due date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id}>
                <td>
                  <strong>{x.title}</strong>
                  <small>
                    {x.id} · {x.source}
                  </small>
                </td>
                <td>{x.machineId}</td>
                <td>
                  <Badge tone={x.priority}>{x.priority}</Badge>
                </td>
                <td>{x.assignee}</td>
                <td>{x.dueDate}</td>
                <td>
                  <Badge tone={x.status}>{x.status}</Badge>
                </td>
                <td>
                  <button className="icon-action" onClick={() => setEditing(x)}>
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <Empty
            title="No maintenance records"
            text="Create a recommendation or change your filters."
          />
        )}
      </div>
      {editing && (
        <MaintenanceForm
          item={editing}
          machines={data.machines.map((x) => x.id)}
          onClose={() => setEditing(null)}
          onSave={(x) => {
            data.saveMaintenance(x);
            setEditing(null);
            setToast(
              x.status === "Completed" ? "Maintenance marked complete" : "Maintenance updated",
            );
          }}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
function MaintenanceForm({
  item,
  machines,
  onClose,
  onSave,
}: {
  item: Maintenance;
  machines: string[];
  onClose: () => void;
  onSave: (x: Maintenance) => void;
}) {
  const [f, setF] = useState(item);
  const [error, setError] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!f.title || !f.assignee || !f.dueDate) {
      setError("Title, assignee and due date are required.");
      return;
    }
    onSave(f);
  };
  return (
    <Modal title="Maintenance Recommendation" onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label>
            Machine
            <select value={f.machineId} onChange={(e) => setF({ ...f, machineId: e.target.value })}>
              {machines.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Recommendation *
            <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </label>
          <label>
            Priority
            <select
              value={f.priority}
              onChange={(e) => setF({ ...f, priority: e.target.value as Risk })}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>
          <label>
            Assignee *
            <input value={f.assignee} onChange={(e) => setF({ ...f, assignee: e.target.value })} />
          </label>
          <label>
            Due date *
            <input
              type="date"
              value={f.dueDate}
              onChange={(e) => setF({ ...f, dueDate: e.target.value })}
            />
          </label>
          <label>
            Status
            <select
              value={f.status}
              onChange={(e) => setF({ ...f, status: e.target.value as WorkStatus })}
            >
              {["Pending", "Assigned", "In Progress", "Completed", "Cancelled"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Save Recommendation</button>
        </div>
      </form>
    </Modal>
  );
}
