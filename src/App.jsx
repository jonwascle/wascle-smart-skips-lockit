import { useState, useEffect } from "react";
import { sb } from "./supabaseClient.js";
import Login from "./Login.jsx";
import OperativeApp from "./OperativeApp.jsx";
import AdminPanel from "./AdminPanel.jsx";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [operative, setOperative] = useState(null);

  const loadOperative = async (authUser) => {
    const { data } = await sb.from("operatives").select("*").eq("id", authUser.id).maybeSingle();
    setOperative(data || null);
    setUser(authUser);
  };

  useEffect(() => {
    (async () => {
      // A set-password link should always show the Login component's own
      // handling for that, regardless of any existing session.
      if (window.location.hash.match(/#set-password=/i)) {
        setLoading(false);
        return;
      }
      const { data } = await sb.auth.getSession();
      if (data && data.session && data.session.user) {
        await loadOperative(data.session.user);
      }
      setLoading(false);
    })();
  }, []);

  const handleLoggedIn = async (authUser) => {
    await loadOperative(authUser);
  };

  const handleLogout = async () => {
    await sb.auth.signOut();
    setUser(null);
    setOperative(null);
  };

  if (loading) return null;

  if (!user || !operative) {
    return <Login onLoggedIn={handleLoggedIn} />;
  }

  if (operative.role === "admin") {
    return <AdminPanel operative={operative} onLogout={handleLogout} />;
  }

  return <OperativeApp operative={operative} onLogout={handleLogout} />;
}
