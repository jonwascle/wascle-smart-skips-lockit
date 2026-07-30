import { useState, useEffect } from "react";
import { sb, SUPABASE_URL } from "./supabaseClient.js";

const CHARCOAL = "#514F4C";
const AMBER = "#FCB817";
const PAPER = "#F6F5F2";
const CARD = "#FFFFFF";
const LINE = "#E4E1D9";
const STEEL = "#8A8884";
const RUST = "#B5533C";
const MOSS = "#4C8562";
const displayFont = "'Quicksand', sans-serif";
const bodyFont = "'Inter', sans-serif";

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <div className="text-xs mb-1" style={{ color: STEEL, fontFamily: bodyFont }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  fontFamily: bodyFont, color: CHARCOAL, background: PAPER, border: `1px solid ${LINE}`,
};

export default function Login({ onLoggedIn }) {
  const [mode, setMode] = useState("login"); // login | forgot | set-password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [setPasswordToken, setSetPasswordToken] = useState(null);
  const [setPasswordDone, setSetPasswordDone] = useState(false);

  useEffect(() => {
    const match = window.location.hash.match(/#set-password=([a-z0-9-]+)/i);
    if (match) {
      setSetPasswordToken(match[1]);
      setMode("set-password");
    }
  }, []);

  const doLogin = async () => {
    setError(""); setLoading(true);
    const { data, error: signInErr } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (signInErr) { setError(signInErr.message); return; }
    onLoggedIn(data.user);
  };

  const requestReset = async () => {
    setError(""); setMessage(""); setLoading(true);
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/operative-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_reset", email: email.trim() }),
      });
    } catch (e) { /* fall through to the same message either way */ }
    setMessage("If that email has an account, a reset link is on its way.");
    setLoading(false);
  };

  const submitSetPassword = async () => {
    setError("");
    if (!password || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/operative-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_password", token: setPasswordToken, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setError(data.error || "Could not set your password — the link may have expired.");
        setLoading(false);
        return;
      }
      setSetPasswordDone(true);
    } catch (e) {
      setError("Something went wrong — please check your connection and try again.");
    }
    setLoading(false);
  };

  return (
    <div className="w-full flex items-center justify-center min-h-screen" style={{ background: PAPER }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
      `}</style>
      <div className="rounded-2xl p-8 w-full" style={{ background: CARD, border: `1px solid ${LINE}`, maxWidth: 360 }}>
        <h1 className="text-2xl mb-1" style={{ fontFamily: displayFont, fontWeight: 700, color: CHARCOAL }}>Wascle Lockit</h1>

        {mode === "login" && (
          <>
            <p className="text-xs mb-5" style={{ color: STEEL, fontFamily: bodyFont }}>Sign in to request access to your smart skip.</p>
            <Field label="Email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
                className="w-full text-sm rounded-md py-2 px-3" style={inputStyle}
                onKeyDown={(e) => { if (e.key === "Enter") doLogin(); }} />
            </Field>
            <Field label="Password">
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password"
                className="w-full text-sm rounded-md py-2 px-3" style={inputStyle}
                onKeyDown={(e) => { if (e.key === "Enter") doLogin(); }} />
            </Field>
            {error && <div className="text-xs mb-3" style={{ color: RUST, fontFamily: bodyFont }}>{error}</div>}
            <button onClick={doLogin} disabled={loading}
              className="w-full py-3 rounded-md font-medium text-sm mb-3 disabled:opacity-50"
              style={{ background: CHARCOAL, color: "#fff", fontFamily: bodyFont }}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
            <button onClick={() => { setMode("forgot"); setError(""); setMessage(""); }}
              className="text-xs w-full text-center" style={{ color: STEEL, fontFamily: bodyFont }}>
              Forgot password?
            </button>
          </>
        )}

        {mode === "forgot" && (
          <>
            <p className="text-xs mb-5" style={{ color: STEEL, fontFamily: bodyFont }}>Enter your email and we'll send you a reset link.</p>
            <Field label="Email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
                className="w-full text-sm rounded-md py-2 px-3" style={inputStyle} />
            </Field>
            {message && <div className="text-xs mb-3" style={{ color: MOSS, fontFamily: bodyFont }}>{message}</div>}
            {error && <div className="text-xs mb-3" style={{ color: RUST, fontFamily: bodyFont }}>{error}</div>}
            <button onClick={requestReset} disabled={loading}
              className="w-full py-3 rounded-md font-medium text-sm mb-3 disabled:opacity-50"
              style={{ background: CHARCOAL, color: "#fff", fontFamily: bodyFont }}>
              {loading ? "Sending..." : "Send reset link"}
            </button>
            <button onClick={() => { setMode("login"); setError(""); setMessage(""); }}
              className="text-xs w-full text-center" style={{ color: STEEL, fontFamily: bodyFont }}>
              Back to sign in
            </button>
          </>
        )}

        {mode === "set-password" && !setPasswordDone && (
          <>
            <p className="text-xs mb-5" style={{ color: STEEL, fontFamily: bodyFont }}>Set your password to continue.</p>
            <Field label="New password">
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password"
                className="w-full text-sm rounded-md py-2 px-3" style={inputStyle} />
            </Field>
            <Field label="Confirm new password">
              <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password"
                className="w-full text-sm rounded-md py-2 px-3" style={inputStyle}
                onKeyDown={(e) => { if (e.key === "Enter") submitSetPassword(); }} />
            </Field>
            {error && <div className="text-xs mb-3" style={{ color: RUST, fontFamily: bodyFont }}>{error}</div>}
            <button onClick={submitSetPassword} disabled={loading}
              className="w-full py-3 rounded-md font-medium text-sm disabled:opacity-50"
              style={{ background: CHARCOAL, color: "#fff", fontFamily: bodyFont }}>
              {loading ? "Saving..." : "Set password"}
            </button>
          </>
        )}

        {mode === "set-password" && setPasswordDone && (
          <>
            <p className="text-sm mb-4" style={{ color: MOSS, fontFamily: bodyFont, fontWeight: 600 }}>Password set! You can now sign in.</p>
            <button onClick={() => { window.location.href = window.location.pathname; }}
              className="w-full py-3 rounded-md font-medium text-sm"
              style={{ background: CHARCOAL, color: "#fff", fontFamily: bodyFont }}>
              Go to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
