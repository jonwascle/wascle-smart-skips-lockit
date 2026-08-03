import { useState, useEffect } from "react";
import { sb, SUPABASE_URL } from "./supabaseClient.js";
import { LogOut, Plus, MapPin, Users, Package, ClipboardList, Building2, Trash2, Pencil, X, Link2 } from "lucide-react";

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
  const [housingAssociations, setHousingAssociations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [skips, setSkips] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [operatives, setOperatives] = useState([]);
  const [links, setLinks] = useState([]);
  const [visits, setVisits] = useState([]);
  const [visitFilter, setVisitFilter] = useState("");
  const [message, setMessage] = useState("");

  const loadAll = async () => {
    const [{ data: c }, { data: ha }, { data: ct }, { data: s }, { data: d }, { data: o }, { data: l }, { data: v }] = await Promise.all([
      sb.from("customers").select("*").order("name"),
      sb.from("housing_associations").select("*, customers(name)").order("name"),
      sb.from("housing_association_contacts").select("*, housing_associations(name)").order("name"),
      sb.from("skips").select("*, housing_associations(name, customers(name))").order("name"),
      sb.from("departments").select("*, housing_associations(name)").order("name"),
      sb.from("operatives").select("*").order("name"),
      sb.from("operative_housing_associations").select("*, housing_associations(name, customers(name)), departments(name)"),
      sb.from("visits").select("*, skips(name), housing_associations(name)").order("created_at", { ascending: false }).limit(100),
    ]);
    setCustomers(c || []);
    setHousingAssociations(ha || []);
    setContacts(ct || []);
    setSkips(s || []);
    setDepartments(d || []);
    setOperatives(o || []);
    setLinks(l || []);
    setVisits(v || []);
  };

  useEffect(() => { loadAll(); }, []);

  const flash = (msg) => { setMessage(msg); setTimeout(() => setMessage(""), 3500); };

  const callFn = async (payload) => {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-operative`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
      body: JSON.stringify(payload),
    });
    return { res, data: await res.json().catch(() => ({})) };
  };

  // ---- Customers ----
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPrice, setNewCustomerPrice] = useState("");
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editingCustomerName, setEditingCustomerName] = useState("");
  const [editingCustomerPrice, setEditingCustomerPrice] = useState("");

  const addCustomer = async () => {
    if (!newCustomerName.trim()) return;
    const { error } = await sb.from("customers").insert({ name: newCustomerName.trim(), price_per_yard: newCustomerPrice ? Number(newCustomerPrice) : null });
    if (error) { flash(error.message); return; }
    setNewCustomerName(""); setNewCustomerPrice("");
    await loadAll();
    flash("Customer added.");
  };
  const startEditCustomer = (c) => { setEditingCustomerId(c.id); setEditingCustomerName(c.name); setEditingCustomerPrice(c.price_per_yard ?? ""); };
  const saveEditCustomer = async () => {
    const { error } = await sb.from("customers").update({ name: editingCustomerName.trim(), price_per_yard: editingCustomerPrice ? Number(editingCustomerPrice) : null }).eq("id", editingCustomerId);
    if (error) { flash(error.message); return; }
    setEditingCustomerId(null);
    await loadAll();
    flash("Customer updated.");
  };
  const deleteCustomer = async (c) => {
    const dependents = housingAssociations.filter((h) => h.customer_id === c.id).length;
    if (dependents > 0) { flash(`Can't delete — this customer still has ${dependents} housing association(s) linked. Remove those first.`); return; }
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    const { error } = await sb.from("customers").delete().eq("id", c.id);
    if (error) { flash(error.message); return; }
    await loadAll();
    flash("Customer deleted.");
  };

  // ---- Housing associations ----
  const [newHAName, setNewHAName] = useState("");
  const [newHACustomerId, setNewHACustomerId] = useState("");
  const [editingHAId, setEditingHAId] = useState(null);
  const [editingHAName, setEditingHAName] = useState("");
  const [editingHACustomerId, setEditingHACustomerId] = useState("");

  const addHA = async () => {
    if (!newHAName.trim() || !newHACustomerId) { flash("Fill in both fields first."); return; }
    const { error } = await sb.from("housing_associations").insert({ name: newHAName.trim(), customer_id: newHACustomerId });
    if (error) { flash(error.message); return; }
    setNewHAName(""); setNewHACustomerId("");
    await loadAll();
    flash("Housing association added.");
  };
  const startEditHA = (h) => { setEditingHAId(h.id); setEditingHAName(h.name); setEditingHACustomerId(h.customer_id); };
  const saveEditHA = async () => {
    const { error } = await sb.from("housing_associations").update({ name: editingHAName.trim(), customer_id: editingHACustomerId }).eq("id", editingHAId);
    if (error) { flash(error.message); return; }
    setEditingHAId(null);
    await loadAll();
    flash("Housing association updated.");
  };
  const deleteHA = async (h) => {
    const dependents = skips.filter((s) => s.housing_association_id === h.id).length + links.filter((l) => l.housing_association_id === h.id).length;
    if (dependents > 0) { flash(`Can't delete — this still has ${dependents} smart skip(s) or operative link(s). Remove those first.`); return; }
    if (!confirm(`Delete "${h.name}"? This cannot be undone.`)) return;
    const { error } = await sb.from("housing_associations").delete().eq("id", h.id);
    if (error) { flash(error.message); return; }
    await loadAll();
    flash("Housing association deleted.");
  };

  // ---- Contacts ----
  const [newContactHAId, setNewContactHAId] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactAccess, setNewContactAccess] = useState(false);

  const addContact = async () => {
    if (!newContactHAId || !newContactName.trim()) { flash("Housing association and name are required."); return; }
    const { error } = await sb.from("housing_association_contacts").insert({
      housing_association_id: newContactHAId, name: newContactName.trim(), email: newContactEmail.trim() || null,
      phone: newContactPhone.trim() || null, has_lockit_access: newContactAccess,
    });
    if (error) { flash(error.message); return; }
    setNewContactHAId(""); setNewContactName(""); setNewContactEmail(""); setNewContactPhone(""); setNewContactAccess(false);
    await loadAll();
    flash("Contact added.");
  };
  const deleteContact = async (id) => {
    if (!confirm("Delete this contact?")) return;
    const { error } = await sb.from("housing_association_contacts").delete().eq("id", id);
    if (error) { flash(error.message); return; }
    await loadAll();
    flash("Contact deleted.");
  };

  // ---- Skips ----
  const [newSkipName, setNewSkipName] = useState("");
  const [newSkipHAId, setNewSkipHAId] = useState("");
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
    if (!newSkipName.trim() || !newSkipHAId || !newSkipLat || !newSkipLng || !newSkipDeviceId.trim()) { flash("Fill in all fields first."); return; }
    const { error } = await sb.from("skips").insert({
      name: newSkipName.trim(), housing_association_id: newSkipHAId,
      lat: Number(newSkipLat), lng: Number(newSkipLng), igloohome_device_id: newSkipDeviceId.trim(),
    });
    if (error) { flash(error.message); return; }
    setNewSkipName(""); setNewSkipHAId(""); setNewSkipLat(""); setNewSkipLng(""); setNewSkipDeviceId("");
    await loadAll();
    flash("Smart skip added.");
  };
  const deleteSkip = async (s) => {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    const { error } = await sb.from("skips").delete().eq("id", s.id);
    if (error) { flash(error.message); return; }
    await loadAll();
    flash("Smart skip deleted.");
  };

  // ---- Departments ----
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptHAId, setNewDeptHAId] = useState("");
  const addDepartment = async () => {
    if (!newDeptName.trim() || !newDeptHAId) { flash("Fill in both fields first."); return; }
    const { error } = await sb.from("departments").insert({ name: newDeptName.trim(), housing_association_id: newDeptHAId });
    if (error) { flash(error.message); return; }
    setNewDeptName(""); setNewDeptHAId("");
    await loadAll();
    flash("Department added.");
  };
  const deleteDepartment = async (id) => {
    if (!confirm("Delete this department?")) return;
    const { error } = await sb.from("departments").delete().eq("id", id);
    if (error) { flash(error.message); return; }
    await loadAll();
    flash("Department deleted.");
  };

  // ---- Operatives ----
  const [newOpName, setNewOpName] = useState("");
  const [newOpEmail, setNewOpEmail] = useState("");
  const [newOpHAId, setNewOpHAId] = useState("");
  const [newOpDeptId, setNewOpDeptId] = useState("");
  const [creatingOp, setCreatingOp] = useState(false);

  const addOperative = async () => {
    if (!newOpName.trim() || !newOpEmail.trim() || !newOpHAId) { flash("Fill in name, email, and housing association first."); return; }
    setCreatingOp(true);
    try {
      const { res, data } = await callFn({ action: "create", name: newOpName.trim(), email: newOpEmail.trim(), housingAssociationId: newOpHAId, departmentId: newOpDeptId || null });
      if (!res.ok || data.error) { flash(data.error || "Something went wrong."); return; }
      setNewOpName(""); setNewOpEmail(""); setNewOpHAId(""); setNewOpDeptId("");
      await loadAll();
      flash(data.merged ? `Linked to ${data.existingName}'s existing Lockit account.` : "Operative created — they'll get a welcome email to set up their password.");
    } finally {
      setCreatingOp(false);
    }
  };

  const [addingLinkForOp, setAddingLinkForOp] = useState(null);
  const [newLinkHAId, setNewLinkHAId] = useState("");
  const [newLinkDeptId, setNewLinkDeptId] = useState("");
  const addLinkToOperative = async (operativeId) => {
    if (!newLinkHAId) { flash("Pick a housing association first."); return; }
    const { res, data } = await callFn({ action: "add_link", operativeId, housingAssociationId: newLinkHAId, departmentId: newLinkDeptId || null });
    if (!res.ok || data.error) { flash(data.error || "Something went wrong."); return; }
    setAddingLinkForOp(null); setNewLinkHAId(""); setNewLinkDeptId("");
    await loadAll();
    flash("Link added.");
  };
  const removeLink = async (linkId) => {
    if (!confirm("Remove this operative's access to this housing association?")) return;
    const { res, data } = await callFn({ action: "remove_link", linkId });
    if (!res.ok || data.error) { flash(data.error || "Something went wrong."); return; }
    await loadAll();
    flash("Link removed.");
  };

  const [editingOpId, setEditingOpId] = useState(null);
  const [editOpName, setEditOpName] = useState("");
  const startEditOperative = (o) => { setEditingOpId(o.id); setEditOpName(o.name); };
  const saveEditOperative = async () => {
    const { res, data } = await callFn({ action: "update", operativeId: editingOpId, name: editOpName.trim() });
    if (!res.ok || data.error) { flash(data.error || "Something went wrong."); return; }
    setEditingOpId(null);
    await loadAll();
    flash("Operative updated.");
  };
  const deleteOperative = async (o) => {
    if (!confirm(`Delete "${o.name}"'s login permanently? This cannot be undone — they'll immediately lose access, and their email will be free to reuse.`)) return;
    const { res, data } = await callFn({ action: "delete", operativeId: o.id });
    if (!res.ok || data.error) { flash(data.error || "Something went wrong."); return; }
    await loadAll();
    flash("Operative deleted.");
  };

  // ---- Visit photo viewing ----
  const [photoUrls, setPhotoUrls] = useState({});
  const viewPhoto = async (path) => {
    if (photoUrls[path]) return photoUrls[path];
    const { data } = await sb.storage.from("visit-photos").createSignedUrl(path, 3600);
    if (data) setPhotoUrls((p) => ({ ...p, [path]: data.signedUrl }));
    return data ? data.signedUrl : null;
  };

  const filteredVisits = visitFilter ? visits.filter((v) => v.housing_association_id === visitFilter) : visits;

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
          <TabButton active={tab === "housing"} onClick={() => setTab("housing")} icon={Building2} label="Housing Associations" />
          <TabButton active={tab === "contacts"} onClick={() => setTab("contacts")} icon={Users} label="Contacts" />
          <TabButton active={tab === "skips"} onClick={() => setTab("skips")} icon={Package} label="Smart Skips" />
          <TabButton active={tab === "departments"} onClick={() => setTab("departments")} icon={ClipboardList} label="Departments" />
          <TabButton active={tab === "operatives"} onClick={() => setTab("operatives")} icon={Link2} label="Operatives" />
          <TabButton active={tab === "visits"} onClick={() => setTab("visits")} icon={MapPin} label="Visits" />
        </div>

        {/* ---------------- CUSTOMERS ---------------- */}
        {tab === "customers" && (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="text-sm font-medium mb-3" style={{ fontFamily: bodyFont, color: CHARCOAL }}>Add a customer</div>
              <p className="text-xs mb-2" style={{ color: STEEL, fontFamily: bodyFont }}>The actual billed relationship — Travis Perkins, Bradfords, or a housing association billed direct.</p>
              <div className="flex gap-2">
                <input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Customer name" className="flex-1 text-sm rounded-md py-2 px-3" style={inputStyle} />
                <input value={newCustomerPrice} onChange={(e) => setNewCustomerPrice(e.target.value)} placeholder="£ per yard" type="number" step="0.01" className="w-32 text-sm rounded-md py-2 px-3" style={inputStyle} />
                <button onClick={addCustomer} className="px-4 rounded-md text-sm font-medium flex items-center gap-1" style={{ background: AMBER, color: CHARCOAL, fontFamily: bodyFont }}>
                  <Plus size={16} /> Add
                </button>
              </div>
            </Card>
            {customers.map((c) => (
              <Card key={c.id}>
                {editingCustomerId === c.id ? (
                  <div className="flex gap-2">
                    <input value={editingCustomerName} onChange={(e) => setEditingCustomerName(e.target.value)} className="flex-1 text-sm rounded-md py-2 px-3" style={inputStyle} />
                    <input value={editingCustomerPrice} onChange={(e) => setEditingCustomerPrice(e.target.value)} type="number" step="0.01" className="w-32 text-sm rounded-md py-2 px-3" style={inputStyle} />
                    <button onClick={saveEditCustomer} className="px-3 rounded-md text-sm" style={{ background: AMBER, color: CHARCOAL, fontFamily: bodyFont }}>Save</button>
                    <button onClick={() => setEditingCustomerId(null)} className="px-3 rounded-md text-sm" style={{ background: PAPER, border: `1px solid ${LINE}`, color: STEEL }}><X size={14} /></button>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium" style={{ fontFamily: bodyFont, color: CHARCOAL }}>{c.name}</div>
                      <div className="text-xs mt-1" style={{ color: STEEL, fontFamily: bodyFont }}>
                        {housingAssociations.filter((h) => h.customer_id === c.id).length} housing association(s) {c.price_per_yard != null ? `· £${c.price_per_yard}/yard` : "· no price set"}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEditCustomer(c)} className="p-1.5 rounded-md" style={{ color: STEEL }}><Pencil size={14} /></button>
                      <button onClick={() => deleteCustomer(c)} className="p-1.5 rounded-md" style={{ color: RUST }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* ---------------- HOUSING ASSOCIATIONS ---------------- */}
        {tab === "housing" && (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="text-sm font-medium mb-3" style={{ fontFamily: bodyFont, color: CHARCOAL }}>Add a housing association</div>
              <p className="text-xs mb-2" style={{ color: STEEL, fontFamily: bodyFont }}>The same real housing association can appear more than once here, if they're supplied via more than one billing route (e.g. via a builders merchant, and separately direct).</p>
              <div className="flex gap-2">
                <select value={newHACustomerId} onChange={(e) => setNewHACustomerId(e.target.value)} className="text-sm rounded-md py-2 px-3" style={inputStyle}>
                  <option value="">Customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input value={newHAName} onChange={(e) => setNewHAName(e.target.value)} placeholder="Housing association name" className="flex-1 text-sm rounded-md py-2 px-3" style={inputStyle} />
                <button onClick={addHA} className="px-4 rounded-md text-sm font-medium flex items-center gap-1" style={{ background: AMBER, color: CHARCOAL, fontFamily: bodyFont }}>
                  <Plus size={16} /> Add
                </button>
              </div>
            </Card>
            {housingAssociations.map((h) => (
              <Card key={h.id}>
                {editingHAId === h.id ? (
                  <div className="flex gap-2">
                    <select value={editingHACustomerId} onChange={(e) => setEditingHACustomerId(e.target.value)} className="text-sm rounded-md py-2 px-3" style={inputStyle}>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input value={editingHAName} onChange={(e) => setEditingHAName(e.target.value)} className="flex-1 text-sm rounded-md py-2 px-3" style={inputStyle} />
                    <button onClick={saveEditHA} className="px-3 rounded-md text-sm" style={{ background: AMBER, color: CHARCOAL, fontFamily: bodyFont }}>Save</button>
                    <button onClick={() => setEditingHAId(null)} className="px-3 rounded-md text-sm" style={{ background: PAPER, border: `1px solid ${LINE}`, color: STEEL }}><X size={14} /></button>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium" style={{ fontFamily: bodyFont, color: CHARCOAL }}>{h.name}</div>
                      <div className="text-xs mt-1" style={{ color: STEEL, fontFamily: bodyFont }}>
                        via {h.customers?.name || "unknown customer"} · {skips.filter((s) => s.housing_association_id === h.id).length} smart skip(s)
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEditHA(h)} className="p-1.5 rounded-md" style={{ color: STEEL }}><Pencil size={14} /></button>
                      <button onClick={() => deleteHA(h)} className="p-1.5 rounded-md" style={{ color: RUST }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* ---------------- CONTACTS ---------------- */}
        {tab === "contacts" && (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="text-sm font-medium mb-3" style={{ fontFamily: bodyFont, color: CHARCOAL }}>Add a contact</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <select value={newContactHAId} onChange={(e) => setNewContactHAId(e.target.value)} className="text-sm rounded-md py-2 px-3 col-span-2" style={inputStyle}>
                  <option value="">Select housing association</option>
                  {housingAssociations.map((h) => <option key={h.id} value={h.id}>{h.name} (via {h.customers?.name})</option>)}
                </select>
                <input value={newContactName} onChange={(e) => setNewContactName(e.target.value)} placeholder="Full name" className="text-sm rounded-md py-2 px-3" style={inputStyle} />
                <input value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} placeholder="Email" className="text-sm rounded-md py-2 px-3" style={inputStyle} />
                <input value={newContactPhone} onChange={(e) => setNewContactPhone(e.target.value)} placeholder="Phone" className="text-sm rounded-md py-2 px-3 col-span-2" style={inputStyle} />
              </div>
              <label className="flex items-center gap-2 text-sm mb-2" style={{ color: CHARCOAL, fontFamily: bodyFont }}>
                <input type="checkbox" checked={newContactAccess} onChange={(e) => setNewContactAccess(e.target.checked)} />
                This person needs Lockit access to the smart skips
              </label>
              <button onClick={addContact} className="w-full py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1" style={{ background: AMBER, color: CHARCOAL, fontFamily: bodyFont }}>
                <Plus size={16} /> Add contact
              </button>
            </Card>
            {contacts.map((c) => (
              <Card key={c.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium" style={{ fontFamily: bodyFont, color: CHARCOAL }}>{c.name} {c.has_lockit_access && <span style={{ color: MOSS }}>· needs Lockit access</span>}</div>
                    <div className="text-xs mt-1" style={{ color: STEEL, fontFamily: bodyFont }}>
                      {c.housing_associations?.name} · {[c.email, c.phone].filter(Boolean).join(" · ") || "no contact details"}
                    </div>
                  </div>
                  <button onClick={() => deleteContact(c.id)} className="p-1.5 rounded-md" style={{ color: RUST }}><Trash2 size={14} /></button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ---------------- SKIPS ---------------- */}
        {tab === "skips" && (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="text-sm font-medium mb-3" style={{ fontFamily: bodyFont, color: CHARCOAL }}>Add a smart skip</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input value={newSkipName} onChange={(e) => setNewSkipName(e.target.value)} placeholder="Name (e.g. Site A skip)" className="text-sm rounded-md py-2 px-3 col-span-2" style={inputStyle} />
                <select value={newSkipHAId} onChange={(e) => setNewSkipHAId(e.target.value)} className="text-sm rounded-md py-2 px-3 col-span-2" style={inputStyle}>
                  <option value="">Select housing association</option>
                  {housingAssociations.map((h) => <option key={h.id} value={h.id}>{h.name} (via {h.customers?.name})</option>)}
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
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium" style={{ fontFamily: bodyFont, color: CHARCOAL }}>{s.name}</div>
                    <div className="text-xs mt-1" style={{ color: STEEL, fontFamily: bodyFont }}>
                      {s.housing_associations?.name || "No housing association"} (via {s.housing_associations?.customers?.name || "unknown"}) · {s.lat?.toFixed(5)}, {s.lng?.toFixed(5)} · Device: {s.igloohome_device_id}
                    </div>
                  </div>
                  <button onClick={() => deleteSkip(s)} className="p-1.5 rounded-md" style={{ color: RUST }}><Trash2 size={14} /></button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ---------------- DEPARTMENTS ---------------- */}
        {tab === "departments" && (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="text-sm font-medium mb-3" style={{ fontFamily: bodyFont, color: CHARCOAL }}>Add a department</div>
              <div className="flex gap-2">
                <select value={newDeptHAId} onChange={(e) => setNewDeptHAId(e.target.value)} className="text-sm rounded-md py-2 px-3" style={inputStyle}>
                  <option value="">Housing association</option>
                  {housingAssociations.map((h) => <option key={h.id} value={h.id}>{h.name} (via {h.customers?.name})</option>)}
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
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium" style={{ fontFamily: bodyFont, color: CHARCOAL }}>{d.name}</div>
                    <div className="text-xs mt-1" style={{ color: STEEL, fontFamily: bodyFont }}>{d.housing_associations?.name || "No housing association"}</div>
                  </div>
                  <button onClick={() => deleteDepartment(d.id)} className="p-1.5 rounded-md" style={{ color: RUST }}><Trash2 size={14} /></button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ---------------- OPERATIVES ---------------- */}
        {tab === "operatives" && (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="text-sm font-medium mb-3" style={{ fontFamily: bodyFont, color: CHARCOAL }}>Add an operative</div>
              <p className="text-xs mb-2" style={{ color: STEEL, fontFamily: bodyFont }}>If this email already has a Lockit login, this just adds a new housing association link to their existing account instead of creating a duplicate.</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input value={newOpName} onChange={(e) => setNewOpName(e.target.value)} placeholder="Full name" className="text-sm rounded-md py-2 px-3" style={inputStyle} />
                <input value={newOpEmail} onChange={(e) => setNewOpEmail(e.target.value)} placeholder="Email" className="text-sm rounded-md py-2 px-3" style={inputStyle} />
                <select value={newOpHAId} onChange={(e) => { setNewOpHAId(e.target.value); setNewOpDeptId(""); }} className="text-sm rounded-md py-2 px-3 col-span-2" style={inputStyle}>
                  <option value="">Select housing association</option>
                  {housingAssociations.map((h) => <option key={h.id} value={h.id}>{h.name} (via {h.customers?.name})</option>)}
                </select>
                <select value={newOpDeptId} onChange={(e) => setNewOpDeptId(e.target.value)} disabled={!newOpHAId} className="text-sm rounded-md py-2 px-3 col-span-2" style={inputStyle}>
                  <option value="">Select department (optional)</option>
                  {departments.filter((d) => d.housing_association_id === newOpHAId).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <button onClick={addOperative} disabled={creatingOp} className="w-full py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50" style={{ background: AMBER, color: CHARCOAL, fontFamily: bodyFont }}>
                <Plus size={16} /> {creatingOp ? "Saving..." : "Add operative"}
              </button>
            </Card>
            {operatives.map((o) => {
              const opLinks = links.filter((l) => l.operative_id === o.id);
              return (
                <Card key={o.id}>
                  {editingOpId === o.id ? (
                    <div className="flex gap-2 mb-3">
                      <input value={editOpName} onChange={(e) => setEditOpName(e.target.value)} className="flex-1 text-sm rounded-md py-2 px-3" style={inputStyle} />
                      <button onClick={saveEditOperative} className="px-3 rounded-md text-sm" style={{ background: AMBER, color: CHARCOAL, fontFamily: bodyFont }}>Save</button>
                      <button onClick={() => setEditingOpId(null)} className="px-3 rounded-md text-sm" style={{ background: PAPER, border: `1px solid ${LINE}`, color: STEEL }}><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-sm font-medium" style={{ fontFamily: bodyFont, color: CHARCOAL }}>{o.name} {o.role === "admin" && <span style={{ color: AMBER }}>(admin)</span>}</div>
                        <div className="text-xs mt-1" style={{ color: STEEL, fontFamily: bodyFont }}>{o.email} {o.must_reset_password ? "· hasn't set password yet" : ""}</div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEditOperative(o)} className="p-1.5 rounded-md" style={{ color: STEEL }}><Pencil size={14} /></button>
                        <button onClick={() => deleteOperative(o)} className="p-1.5 rounded-md" style={{ color: RUST }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )}
                  <div className="pl-3 border-l-2" style={{ borderColor: LINE }}>
                    {opLinks.length === 0 && <div className="text-xs" style={{ color: STEEL, fontFamily: bodyFont }}>No housing associations linked.</div>}
                    {opLinks.map((l) => (
                      <div key={l.id} className="flex justify-between items-center text-xs py-1" style={{ color: CHARCOAL, fontFamily: bodyFont }}>
                        <span>{l.housing_associations?.name} (via {l.housing_associations?.customers?.name}) {l.departments?.name ? `· ${l.departments.name}` : ""}</span>
                        <button onClick={() => removeLink(l.id)} style={{ color: RUST }}><X size={13} /></button>
                      </div>
                    ))}
                    {addingLinkForOp === o.id ? (
                      <div className="flex flex-col gap-2 mt-2">
                        <select value={newLinkHAId} onChange={(e) => { setNewLinkHAId(e.target.value); setNewLinkDeptId(""); }} className="text-xs rounded-md py-1.5 px-2" style={inputStyle}>
                          <option value="">Select housing association</option>
                          {housingAssociations.map((h) => <option key={h.id} value={h.id}>{h.name} (via {h.customers?.name})</option>)}
                        </select>
                        <select value={newLinkDeptId} onChange={(e) => setNewLinkDeptId(e.target.value)} disabled={!newLinkHAId} className="text-xs rounded-md py-1.5 px-2" style={inputStyle}>
                          <option value="">Department (optional)</option>
                          {departments.filter((d) => d.housing_association_id === newLinkHAId).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => addLinkToOperative(o.id)} className="flex-1 py-1.5 rounded-md text-xs" style={{ background: AMBER, color: CHARCOAL, fontFamily: bodyFont }}>Add link</button>
                          <button onClick={() => setAddingLinkForOp(null)} className="px-3 rounded-md text-xs" style={{ background: PAPER, border: `1px solid ${LINE}`, color: STEEL }}><X size={13} /></button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingLinkForOp(o.id)} className="text-xs mt-2 flex items-center gap-1" style={{ color: AMBER === "#FCB817" ? "#946200" : AMBER, fontFamily: bodyFont }}>
                        <Plus size={12} /> Add another housing association
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ---------------- VISITS ---------------- */}
        {tab === "visits" && (
          <div className="flex flex-col gap-4">
            <select value={visitFilter} onChange={(e) => setVisitFilter(e.target.value)} className="text-sm rounded-md py-2 px-3" style={inputStyle}>
              <option value="">All housing associations</option>
              {housingAssociations.map((h) => <option key={h.id} value={h.id}>{h.name} (via {h.customers?.name})</option>)}
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
                      {v.housing_associations?.name} · {v.department || "No department"} · {v.volume_yd3 != null ? `${v.volume_yd3} yd3` : "n/a"}
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
