import { RotateCcw, Save } from "lucide-react";
import { FormEvent, useState } from "react";
import { Card, Confirm, PageHeader, Toast } from "../components/UI";
import { useAppData } from "../context/AppData";

export function SettingsPage() {
  const data = useAppData(),
    [form, setForm] = useState(data.settings),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [confirm, setConfirm] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.includes("@") || !form.plantName.trim()) {
      setError("Enter a valid name, email and plant name.");
      return;
    }
    data.saveSettings(form);
    setError("");
    setToast("Settings saved successfully");
  };
  return (
    <div className="page">
      <PageHeader
        title="Settings"
        description="Manage your profile, plant and application preferences."
      />
      <form onSubmit={submit} className="settings-grid">
        <Card>
          <h2>User profile</h2>
          <div className="stack-form">
            <label>
              Full name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Role
              <input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </label>
          </div>
        </Card>
        <Card>
          <h2>Plant information</h2>
          <div className="stack-form">
            <label>
              Plant name
              <input
                value={form.plantName}
                onChange={(e) => setForm({ ...form, plantName: e.target.value })}
              />
            </label>
            <label>
              Location
              <input
                value={form.plantLocation}
                onChange={(e) => setForm({ ...form, plantLocation: e.target.value })}
              />
            </label>
          </div>
        </Card>
        <Card>
          <h2>Notification preferences</h2>
          <div className="toggle-list">
            <Toggle
              label="Email notifications"
              checked={form.emailAlerts}
              onChange={(v) => setForm({ ...form, emailAlerts: v })}
            />
            <Toggle
              label="Critical alerts"
              checked={form.criticalAlerts}
              onChange={(v) => setForm({ ...form, criticalAlerts: v })}
            />
            <Toggle
              label="Weekly health digest"
              checked={form.weeklyDigest}
              onChange={(v) => setForm({ ...form, weeklyDigest: v })}
            />
          </div>
        </Card>
        <Card>
          <h2>Application preferences</h2>
          <div className="toggle-list">
            <Toggle
              label="Compact table density"
              checked={form.compactMode}
              onChange={(v) => setForm({ ...form, compactMode: v })}
            />
          </div>
          <div className="danger-zone">
            <strong>Reset prototype data</strong>
            <p>Restore all locally persisted records to the original sample dataset.</p>
            <button type="button" className="btn danger" onClick={() => setConfirm(true)}>
              <RotateCcw size={16} />
              Reset Demo Data
            </button>
          </div>
        </Card>
        {error && <p className="form-error span-2">{error}</p>}
        <div className="settings-actions">
          <button type="button" className="btn secondary" onClick={() => setForm(data.settings)}>
            Reset unsaved changes
          </button>
          <button className="btn primary">
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </form>
      {confirm && (
        <Confirm
          title="Reset all demo data?"
          text="This replaces all locally created records with the initial MachineMitra sample dataset."
          onClose={() => setConfirm(false)}
          onConfirm={() => {
            data.resetDemo();
            setForm(data.settings);
            setConfirm(false);
            setToast("Demo data reset");
          }}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i />
    </label>
  );
}
