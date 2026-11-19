import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Badge, Confirm, Empty, Modal, PageHeader, Toast } from "../components/UI";
import { useAppData } from "../context/AppData";
import type { Risk, WorkOrder, WorkStatus } from "../types";

export function WorkOrders() {
  const data = useAppData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [view, setView] = useState<WorkOrder | null>(null);
  const [deleting, setDeleting] = useState<WorkOrder | null>(null);
  const [toast, setToast] = useState("");
  const rows = useMemo(
    () =>
      data.workOrders.filter(
        (x) =>
          `${x.id} ${x.title} ${x.machineId}`.toLowerCase().includes(query.toLowerCase()) &&
          (!status || x.status === status) &&
          (!priority || x.priority === priority),
      ),
    [data.workOrders, query, status, priority],
  );
  const blank = (): WorkOrder => ({
    id: `WO-${Date.now().toString().slice(-5)}`,
    title: "",
    machineId: data.machines[0]?.id || "",
    technician: "Unassigned",
    priority: "Medium",
    status: "Pending",
    dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    description: "",
    createdAt: new Date().toISOString().slice(0, 10),
  });
  return (
    <div className="page">
      <PageHeader
        title="Work Orders"
        description="Plan, assign and track maintenance execution."
        actions={
          <button className="btn primary" onClick={() => setEditing(blank())}>
            <Plus size={16} />
            Create Work Order
          </button>
        }
      />
      <div className="filterbar">
        <div className="field-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search work orders"
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
              <th>Work order</th>
              <th>Machine</th>
              <th>Technician</th>
              <th>Priority</th>
              <th>Due date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id}>
                <td>
                  <strong>{x.title}</strong>
                  <small>{x.id}</small>
                </td>
                <td>{x.machineId}</td>
                <td>{x.technician}</td>
                <td>
                  <Badge tone={x.priority}>{x.priority}</Badge>
                </td>
                <td>{x.dueDate}</td>
                <td>
                  <select
                    className="inline-select"
                    value={x.status}
                    onChange={(e) =>
                      data.saveWorkOrder({ ...x, status: e.target.value as WorkStatus })
                    }
                  >
                    {["Pending", "Assigned", "In Progress", "Completed", "Cancelled"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="row-actions">
                    <button onClick={() => setView(x)}>
                      <Eye size={16} />
                    </button>
                    <button onClick={() => setEditing(x)}>
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleting(x)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <Empty title="No work orders" text="Create a work order or change your filters." />
        )}
      </div>
      {editing && (
        <WorkForm
          item={editing}
          machines={data.machines.map((x) => x.id)}
          onClose={() => setEditing(null)}
          onSave={(x) => {
            data.saveWorkOrder(x);
            setEditing(null);
            setToast("Work order saved");
          }}
        />
      )}
      {view && (
        <Modal title={`${view.id} — ${view.title}`} onClose={() => setView(null)}>
          <dl className="details-list">
            <div>
              <dt>Machine</dt>
              <dd>{view.machineId}</dd>
            </div>
            <div>
              <dt>Technician</dt>
              <dd>{view.technician}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{view.status}</dd>
            </div>
            <div>
              <dt>Due</dt>
              <dd>{view.dueDate}</dd>
            </div>
          </dl>
          <p className="modal-copy">{view.description}</p>
          <div className="modal-actions">
            <button
              className="btn primary"
              onClick={() => {
                setEditing(view);
                setView(null);
              }}
            >
              Edit Work Order
            </button>
          </div>
        </Modal>
      )}
      {deleting && (
        <Confirm
          title="Delete work order?"
          text={`Delete ${deleting.id}?`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            data.deleteWorkOrder(deleting.id);
            setDeleting(null);
            setToast("Work order deleted");
          }}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
function WorkForm({
  item,
  machines,
  onClose,
  onSave,
}: {
  item: WorkOrder;
  machines: string[];
  onClose: () => void;
  onSave: (x: WorkOrder) => void;
}) {
  const [f, setF] = useState(item);
  const [error, setError] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!f.title || !f.technician || !f.dueDate) {
      setError("Title, technician and due date are required.");
      return;
    }
    onSave(f);
  };
  return (
    <Modal title="Work Order" onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label>
            Title *<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </label>
          <label>
            Machine
            <select value={f.machineId} onChange={(e) => setF({ ...f, machineId: e.target.value })}>
              {machines.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Technician *
            <input
              value={f.technician}
              onChange={(e) => setF({ ...f, technician: e.target.value })}
            />
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
          <label className="full">
            Description
            <textarea
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Save Work Order</button>
        </div>
      </form>
    </Modal>
  );
}
