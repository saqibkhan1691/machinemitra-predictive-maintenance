import { Activity, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import logo from "../assets/machinemitra-logo-transparent.png";
import { useAppData } from "../context/AppData";

export function Login() {
  const data = useAppData(),
    nav = useNavigate(),
    [email, setEmail] = useState("operations@machinemitra.in"),
    [password, setPassword] = useState("machinemitra"),
    [visible, setVisible] = useState(false),
    [remember, setRemember] = useState(true),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [loading, setLoading] = useState(false),
    [message, setMessage] = useState("");
  if (data.authenticated) return <Navigate to="/overview" replace />;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!email.includes("@")) er.email = "Enter a valid work email.";
    if (password.length < 6) er.password = "Password must contain at least 6 characters.";
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    setTimeout(() => {
      data.login();
      if (remember) localStorage.setItem("mm-remember-email", email);
      nav("/overview");
    }, 800);
  };
  return (
    <main className="login-page">
      <section className="login-visual">
        <img src={logo} alt="MachineMitra" />
        <div>
          <span>INTELLIGENT PREDICTIVE MAINTENANCE</span>
          <h1>Every machine tells a story. Now, you can hear it.</h1>
          <p>
            Predict failures, reduce unplanned downtime and keep your operations running
            confidently.
          </p>
        </div>
        <div className="login-benefits">
          <span>
            <ShieldCheck />
            Enterprise secure
          </span>
          <span>
            <Activity />
            Real-time monitoring
          </span>
          <span>
            <Sparkles />
            AI-ready architecture
          </span>
        </div>
      </section>
      <section className="login-panel">
        <div className="mobile-login-logo">
          <img src={logo} alt="MachineMitra" />
        </div>
        <form onSubmit={submit}>
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to MachineMitra</h2>
          <p>Use the pre-filled prototype credentials to explore the workspace.</p>
          <label>
            Work email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            {errors.email && <small>{errors.email}</small>}
          </label>
          <label>
            Password
            <div className="password-field">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={visible ? "text" : "password"}
              />
              <button type="button" onClick={() => setVisible(!visible)}>
                {visible ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.password && <small>{errors.password}</small>}
          </label>
          <div className="login-options">
            <label>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() =>
                setMessage("A prototype reset link has been simulated. No email was sent.")
              }
            >
              Forgot password?
            </button>
          </div>
          {message && <div className="login-message">{message}</div>}
          <button className="login-submit" disabled={loading}>
            <LockKeyhole size={17} />
            {loading ? "Signing in…" : "Sign in securely"}
          </button>
          <small className="prototype-note">
            Simulated authentication for the frontend prototype
          </small>
        </form>
      </section>
    </main>
  );
}
