import { useState, useEffect } from "react";
import { sb, SUPABASE_URL } from "./supabaseClient.js";
import { LogOut, Plus, MapPin, Users, Package, ClipboardList, Building2 } from "lucide-react";

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

const inputStyle = { fontFamily: bodyFont, color: CHARCOAL, background: PAPER, border: `1px solid ${LINE}` };

function Card({ children }) {
  return <div className="rounded-lg p-4" style={{ background: CARD, border: `1px solid ${LINE}` }}>{children}</div>;
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md"
      style={{ background: active ? CHARCOAL : "transparent", color: active ? "#fff" : STEEL, fontFamily: bodyFont }}>
      <Icon size={16} /> {label}
    </button>
  );
}

export default function AdminPanel({ operative, onLogout }) {
  const [tab, setTab] = useState("customers");
  const [customers, setCustomers] = useState([]);
  const [skips, setSkips] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [operatives, setOperatives] = useState([]);
  const [visits, setVisits] = useState([]);
  const [visitFilter, setVisitFilter] = useState("");
  const [message, setMessage] = useState("");

  const loadAll = async () => {
    const [{ data: c }, { data: s }, { data: d }, { data: o }, { data: v }] = await Promise.all([
      sb.from("customers").select("*").order("name"),
      sb.from("skips").select("*, customers(name)").order("name"),
      sb.from("departments").select("*, customers(name)").order("name"),
      sb.from("operatives").select("*, customers(name)").order("name"),
      sb.from("visits").select("*, skips(name), customers(name)").order("created_at", { ascending: false }).limit(100),
    ]);
    setCustomers(c || []);
    setSkips(s || []);
    setDepartments(d || []);
    setOperatives(o || []);
    setVisits(v || []);
  };

  useEffect(() => { loadAll(); }, []);

  const flash = (msg) => { setMessage(msg); setTimeout(() => setMessage(""), 3000); };

  // ---- Customers ----
  const [newCustomerName, setNewCustomerName] = useState("");
  const addCustomer = async () => {
    if (!newCustomerName.trim()) return;
    const { error } = await sb.from("customers").insert({ name: newCustomerName.trim() });
    if (error) { flash(error.message); return; }
    setNewCustomerName("");
    await loadAll();
    flash("Customer added.");
  };

  // ---- Skips ----
  const [newSkipName, setNewSkipName] = useState("");
  const [newSkipCustomerId, setNewSkipCustomerId] = useState("");
  const [newSkipLat, setNewSkipLat] = useState("");
  const [newSkipLng, setNewSkipLng] = useState("");
  const [newSkipDeviceId, setNewSkipDeviceId] = useState("");
  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => { setNewSkipLat(pos.coords.latitude.toFixed(6)); setNewSkipLng(pos.coords.longitude.toFixed(6)); },
      () => flash("Could not get your location.")
    );
  };
  const addSkip = async () => {
    if (!newSkipName.trim() || !newSkipCustomerId || !newSkipLat || !newSkipLng || !newSkipDeviceId.trim()) {
      flash("Fill in all fields first."); return;
    }
    const { error } = await sb.from("skips").insert({
      name: newSkipName.trim(), customer_id: newSkipCustomerId,
      lat: Number(newSkipLat), lng: Number(newSkipLng), igloohome_device_id: newSkipDeviceId.trim(),
    });
    if (error) { flash(error.message); return; }
    setNewSkipName(""); setNewSkipCustomerId(""); setNewSkipLat(""); setNewSkipLng(""); setNewSkipDeviceId("");
    await loadAll();
    flash("Smart skip added.");
  };

  // ---- Departments ----
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCustomerId, setNewDeptCustomerId] = useState("");
  const addDepartment = async () => {
    if (!newDeptName.trim() || !newDeptCustomerId) { flash("Fill in both fields first."); return; }
    const { error } = await sb.from("departments").insert({ name: newDeptName.trim(), customer_id: newDeptCustomerId });
    if (error) { flash(error.message); return; }
    setNewDeptName(""); setNewDeptCustomerId("");
    await loadAll();
    flash("Department added.");
  };

  // ---- Operatives ----
  const [newOpName, setNewOpName] = useState("");
  const [newOpEmail, setNewOpEmail] = useState("");
  const [newOpCustomerId, setNewOpCustomerId] = useState("");
  const [creatingOp, setCreatingOp] = useState(false);
  const addOperative = async () => {
    if (!newOpName.trim() || !newOpEmail.trim() || !newOpCustomerId) { flash("Fill in all fields first."); return; }
    setCreatingOp(true);
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-operative`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: newOpName.trim(), email: newOpEmail.trim(), customerId: newOpCustomerId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) { flash(data.error || "Something went wrong."); return; }
      setNewOpName(""); setNewOpEmail(""); setNewOpCustomerId("");
      await loadAll();
      flash("Operative created — they'll get a welcome email to set up their password.");
    } finally {
      setCreatingOp(false);
    }
  };

  // ---- Visit photo viewing ----
  const [photoUrls, setPhotoUrls] = useState({});
  const viewPhoto = async (path) => {
    if (photoUrls[path]) return photoUrls[path];
    const { data } = await sb.storage.from("visit-photos").createSignedUrl(path, 3600);
    if (data) setPhotoUrls((p) => ({ ...p, [path]: data.signedUrl }));
    return data ? data.signedUrl : null;
  };

  const filteredVisits = visitFilter ? visits.filter((v) => v.customer_id === visitFilter) : visits;

  return (
    <div className="min-h-screen" style={{ background: PAPER }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
      `}</style>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl" style={{ fontFamily: displayFont, fontWeight: 700, color: CHARCOAL }}>Wascle Lockit — Admin</h1>
          <button onClick={onLogout} className="flex items-center gap-2 text-sm px-3 py-2 rounded-md" style={{ color: STEEL, fontFamily: bodyFont }}>
            <LogOut size={16} /> Log out
          </button>
        </div>

        {message && (
          <div className="mb-4 text-sm px-4 py-2 rounded-md" style={{ background: "#EAF4EB", color: MOSS, fontFamily: bodyFont }}>{message}</div>
        )}

        <div className="flex gap-1 mb-6 flex-wrap">
          <TabButton active={tab === "customers"} onClick={() => setTab("customers")} icon={Building2} label="Customers" />
          <TabButton active={tab === "skips"} onClick={() => setTab("skips")} icon={Package} label="Smart Skips" />
          <TabButton active={tab === "departments"} onClick={() => setTab("departments")} icon={ClipboardList} label="Departments" />
          <TabButton active={tab === "operatives"} onClick={() => setTab("operatives")} icon={Users} label="Operatives" />
          <TabButton active={tab === "visits"} onClick={() => setTab("visits")} icon={MapPin} label="Visits" />
        </div>

        {tab === "customers" && (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="text-sm font-medium mb-3" style={{ fontFamily: bodyFont, color: CHARCOAL }}>Add a customer</div>
              <div className="flex gap-2">
                <input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Housing association name" className="flex-1 text-sm rounded-md py-2 px-3" style={inputStyle}
                  onKeyDown={(e) => { if (e.key === "Enter") addCustomer(); }} />
                <button onClick={addCustomer} className="px-4 rounded-md text-sm font-medium flex items-center gap-1" style={{ background: AMBER, color: CHARCOAL, fontFamily: bodyFont }}>
                  <Plus size={16} /> Add
                </button>
              </div>
            </Card>
            {customers.map((c) => (
              <Card key={c.id}>
                <div className="text-sm font-medium" style={{ fontFamily: bodyFont, color: CHARCOAL }}>{c.name}</div>
                <div className="text-xs mt-1" style={{ color: STEEL, fontFamily: bodyFont }}>
                  {skips.filter((s) => s.customer_id === c.id).length} smart skip(s) · {operatives.filter((o) => o.customer_id === c.id).length} operative(s)
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === "skips" && (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="text-sm font-medium mb-3" style={{ fontFamily: bodyFont, color: CHARCOAL }}>Add a smart skip</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input value={newSkipName} onChange={(e) => setNewSkipName(e.target.value)} placeholder="Name (e.g. Site A skip)" className="text-sm rounded-md py-2 px-3 col-span-2" style={inputStyle} />
                <select value={newSkipCustomerId} onChange={(e) => setNewSkipCustomerId(e.target.value)} className="text-sm rounded-md py-2 px-3 col-span-2" style={inputStyle}>
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input value={newSkipDeviceId} onChange={(e) => setNewSkipDeviceId(e.target.value)} placeholder="igloohome Device ID" className="text-sm rounded-md py-2 px-3 col-span-2" style={inputStyle} />
                <input value={newSkipLat} onChange={(e) => setNewSkipLat(e.target.value)} placeholder="Latitude" className="text-sm rounded-md py-2 px-3" style={inputStyle} />
                <input value={newSkipLng} onChange={(e) => setNewSkipLng(e.target.value)} placeholder="Longitude" className="text-sm rounded-md py-2 px-3" style={inputStyle} />
              </div>
              <div className="flex gap-2">
                <button onClick={useMyLocation} className="flex-1 py-2 rounded-md text-sm font-medium" style={{ background: CARD, border: `1px solid ${LINE}`, color: CHARCOAL, fontFamily: bodyFont }}>
                  Use my current location
                </button>
                <button onClick={addSkip} className="flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1" style={{ background: AMBER, color: CHARCOAL, fontFamily: bodyFont }}>
                  <Plus size={16} /> Add smart skip
                </button>
              </div>
            </Card>
            {skips.map((s) => (
              <Card key={s.id}>
                <div className="text-sm font-medium" style={{ fontFamily: bodyFont, color: CHARCOAL }}>{s.name}</div>
                <div className="text-xs mt-1" style={{ color: STEEL, fontFamily: bodyFont }}>
                  {s.customers?.name || "No customer"} · {s.lat?.toFixed(5)}, {s.lng?.toFixed(5)} · Device: {s.igloohome_device_id}
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === "departments" && (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="text-sm font-medium mb-3" style={{ fontFamily: bodyFont, color: CHARCOAL }}>Add a department</div>
              <div className="flex gap-2">
                <select value={newDeptCustomerId} onChange={(e) => setNewDeptCustomerId(e.target.value)} className="text-sm rounded-md py-2 px-3" style={inputStyle}>
                  <option value="">Customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder="Department name" className="flex-1 text-sm rounded-md py-2 px-3" style={inputStyle}
                  onKeyDown={(e) => { if (e.key === "Enter") addDepartment(); }} />
                <button onClick={addDepartment} className="px-4 rounded-md text-sm font-medium flex items-center gap-1" style={{ background: AMBER, color: CHARCOAL, fontFamily: bodyFont }}>
                  <Plus size={16} /> Add
                </button>
              </div>
            </Card>
            {departments.map((d) => (
              <Card key={d.id}>
                <div className="text-sm font-medium" style={{ fontFamily: bodyFont, color: CHARCOAL }}>{d.name}</div>
                <div className="text-xs mt-1" style={{ color: STEEL, fontFamily: bodyFont }}>{d.customers?.name || "No customer"}</div>
              </Card>
            ))}
          </div>
        )}

        {tab === "operatives" && (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="text-sm font-medium mb-3" style={{ fontFamily: bodyFont, color: CHARCOAL }}>Add an operative</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input value={newOpName} onChange={(e) => setNewOpName(e.target.value)} placeholder="Full name" className="text-sm rounded-md py-2 px-3" style={inputStyle} />
                <input value={newOpEmail} onChange={(e) => setNewOpEmail(e.target.value)} placeholder="Email" className="text-sm rounded-md py-2 px-3" style={inputStyle} />
                <select value={newOpCustomerId} onChange={(e) => setNewOpCustomerId(e.target.value)} className="text-sm rounded-md py-2 px-3 col-span-2" style={inputStyle}>
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button onClick={addOperative} disabled={creatingOp} className="w-full py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50" style={{ background: AMBER, color: CHARCOAL, fontFamily: bodyFont }}>
                <Plus size={16} /> {creatingOp ? "Creating..." : "Create operative & send welcome email"}
              </button>
            </Card>
            {operatives.map((o) => (
              <Card key={o.id}>
                <div className="text-sm font-medium" style={{ fontFamily: bodyFont, color: CHARCOAL }}>{o.name} {o.role === "admin" && <span style={{ color: AMBER }}>(admin)</span>}</div>
                <div className="text-xs mt-1" style={{ color: STEEL, fontFamily: bodyFont }}>
                  {o.email} · {o.customers?.name || "No customer"} {o.must_reset_password ? "· hasn't set password yet" : ""}
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === "visits" && (
          <div className="flex flex-col gap-4">
            <select value={visitFilter} onChange={(e) => setVisitFilter(e.target.value)} className="text-sm rounded-md py-2 px-3" style={inputStyle}>
              <option value="">All customers</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {filteredVisits.length === 0 && (
              <div className="text-sm" style={{ color: STEEL, fontFamily: bodyFont }}>No visits yet.</div>
            )}
            {filteredVisits.map((v) => (
              <Card key={v.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium" style={{ fontFamily: bodyFont, color: CHARCOAL }}>
                      {v.employee_name || "Unknown"} · {v.skips?.name || "Unknown skip"}
                    </div>
                    <div className="text-xs mt-1" style={{ color: STEEL, fontFamily: bodyFont }}>
                      {v.customers?.name} · {v.department || "No department"} · {v.volume_yd3 != null ? `${v.volume_yd3} yd3` : "n/a"}
                    </div>
                    <div className="text-xs mt-1" style={{ color: STEEL, fontFamily: bodyFont }}>
                      {new Date(v.created_at).toLocaleString()} · {v.status}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {[["photo_waste_path", "Waste"], ["photo_opened_path", "Opened"], ["photo_after_path", "After"]].map(([field, label]) => (
                    v[field] && (
                      <button key={field} onClick={async () => {
                        const url = await viewPhoto(v[field]);
                        if (url) window.open(url, "_blank");
                      }} className="text-xs px-3 py-1.5 rounded-md" style={{ background: PAPER, border: `1px solid ${LINE}`, color: CHARCOAL, fontFamily: bodyFont }}>
                        View {label}
                      </button>
                    )
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
