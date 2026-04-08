import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "charlotte-vendor-db";

const CATEGORIES = ["All", "Venue", "AV / Production", "Catering", "Photography / Video", "Floral", "Staffing", "Transportation", "Entertainment", "Decor", "PR / Marketing", "Other"];
const BUDGET_TIERS = ["All", "Budget", "Mid", "Premium"];
const REHIRE_OPTIONS = ["Would Rehire", "On the Fence", "Wouldn't Rehire"];

const SAMPLE_DATA = [
  { id: "s1", name: "Stage Right Productions", category: "AV / Production", city: "New York", region: "Northeast", budget: "Premium", contacts: [{ name: "Marcus Lee", email: "marcus@stageright.com", phone: "212-555-0101" }], events: ["Bedrock Summit 2024", "OpenAI Dev Day"], rating: 5, rehire: "Would Rehire", notes: "Best crew in NYC. Marcus is responsive at all hours. Always bring backup equipment without being asked.", peerReviews: [{ author: "Jamie K.", text: "Flawless load-in, zero drama." }] },
  { id: "s2", name: "The Glasshouse", category: "Venue", city: "San Francisco", region: "West Coast", budget: "Premium", contacts: [{ name: "Diana Park", email: "diana@glasshouse.com", phone: "415-555-0202" }], events: ["Anthropic Offsite Q3"], rating: 4, rehire: "Would Rehire", notes: "Stunning space. Catering is in-house only which limits you. Book 6 months out minimum.", peerReviews: [] },
  { id: "s3", name: "Harvest & Co.", category: "Catering", city: "Los Angeles", region: "West Coast", budget: "Mid", contacts: [{ name: "Sofia Reyes", email: "sofia@harvestandco.com", phone: "310-555-0303" }], events: ["Revolut All Hands"], rating: 3, rehire: "On the Fence", notes: "Food is great, logistics are a mess. Need a dedicated point person on their end.", peerReviews: [{ author: "Event co. ref", text: "Showed up late. Food was excellent though." }] },
  { id: "s4", name: "Luminary Studios", category: "Photography / Video", city: "New York", region: "Northeast", budget: "Mid", contacts: [{ name: "Theo Walsh", email: "theo@luminary.co", phone: "917-555-0404" }], events: ["Bedrock CAB Q1", "Bedrock CAB Q2"], rating: 5, rehire: "Would Rehire", notes: "Theo gets the vibe instantly. Delivers edits in 48hrs. Don't let anyone else touch your content events.", peerReviews: [] },
];

const REHIRE_STYLES = {
  "Would Rehire": { bg: "#0d2b1a", border: "#1a5c35", color: "#4ade80", dot: "#4ade80" },
  "On the Fence": { bg: "#2b2400", border: "#5c4a00", color: "#facc15", dot: "#facc15" },
  "Wouldn't Rehire": { bg: "#2b0d0d", border: "#5c1a1a", color: "#f87171", dot: "#f87171" },
};

const StarRating = ({ rating, onRate, interactive = false }) => (
  <div style={{ display: "flex", gap: "2px" }}>
    {[1,2,3,4,5].map(s => (
      <span key={s} onClick={interactive ? () => onRate(s) : undefined}
        style={{ cursor: interactive ? "pointer" : "default", fontSize: "13px", color: s <= rating ? "#F5A623" : "#2a2a2a", transition: "color 0.15s" }}>★</span>
    ))}
  </div>
);

const RehireBadge = ({ status }) => {
  const st = REHIRE_STYLES[status] || {};
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", background: st.bg, border: `1px solid ${st.border}`, color: st.color, fontFamily: "inherit" }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: st.dot, display: "inline-block" }} />
      {status}
    </span>
  );
};

const parseCSV = (text) => {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line, i) => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] || ""; });
    return {
      id: `csv-${Date.now()}-${i}`,
      name: obj.name || obj.vendor || obj.company || "Unknown",
      category: obj.category || obj.type || "Other",
      city: obj.city || "",
      region: obj.region || "",
      budget: obj.budget || obj.budget_tier || "Mid",
      contacts: obj.contact_name ? [{ name: obj.contact_name, email: obj.contact_email || "", phone: obj.contact_phone || "" }] : [],
      events: obj.events ? obj.events.split("|") : [],
      rating: parseInt(obj.rating) || 0,
      rehire: REHIRE_OPTIONS.includes(obj.rehire) ? obj.rehire : "On the Fence",
      notes: obj.notes || "",
      peerReviews: [],
    };
  }).filter(r => r.name && r.name !== "Unknown");
};

const emptyVendor = () => ({ name: "", category: "AV / Production", city: "", region: "", budget: "Mid", contacts: [{ name: "", email: "", phone: "" }], events: [], rating: 0, rehire: "Would Rehire", notes: "", peerReviews: [] });

export default function VendorRolodex() {
  const [vendors, setVendors] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterBudget, setFilterBudget] = useState("All");
  const [filterRegion, setFilterRegion] = useState("All");
  const [filterRehire, setFilterRehire] = useState("All");
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [newVendor, setNewVendor] = useState(emptyVendor());
  const [importStatus, setImportStatus] = useState(null);
  const [newEvent, setNewEvent] = useState("");
  const [newReview, setNewReview] = useState({ author: "", text: "" });
  const fileRef = useRef();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setVendors(saved ? JSON.parse(saved) : SAMPLE_DATA);
    } catch { setVendors(SAMPLE_DATA); }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(vendors)); } catch {}
  }, [vendors, loaded]);

  const regions = ["All", ...Array.from(new Set(vendors.map(v => v.region).filter(Boolean))).sort()];

  const filtered = vendors.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.name?.toLowerCase().includes(q) || v.city?.toLowerCase().includes(q) || v.notes?.toLowerCase().includes(q) || v.contacts?.some(c => c.name?.toLowerCase().includes(q));
    return matchSearch &&
      (filterCat === "All" || v.category === filterCat) &&
      (filterBudget === "All" || v.budget === filterBudget) &&
      (filterRegion === "All" || v.region === filterRegion) &&
      (filterRehire === "All" || v.rehire === filterRehire);
  });

  const handleCSV = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (!parsed.length) { setImportStatus({ type: "error", msg: "No valid rows found." }); return; }
      setVendors(prev => {
        const names = new Set(prev.map(v => v.name.toLowerCase()));
        return [...prev, ...parsed.filter(v => !names.has(v.name.toLowerCase()))];
      });
      setImportStatus({ type: "success", msg: `Imported ${parsed.length} vendors` });
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const saveNew = () => {
    if (!newVendor.name) return;
    setVendors(prev => [...prev, { ...newVendor, id: `manual-${Date.now()}` }]);
    setNewVendor(emptyVendor());
    setView("list");
  };

  const updateSelected = (patch) => {
    const updated = { ...selected, ...patch };
    setSelected(updated);
    setVendors(prev => prev.map(v => v.id === selected.id ? updated : v));
  };

  const deleteVendor = (id) => { setVendors(prev => prev.filter(v => v.id !== id)); setView("list"); setSelected(null); };

  const addEvent = () => {
    if (!newEvent.trim()) return;
    updateSelected({ events: [...(selected.events || []), newEvent.trim()] });
    setNewEvent("");
  };

  const addReview = () => {
    if (!newReview.text.trim()) return;
    updateSelected({ peerReviews: [...(selected.peerReviews || []), { ...newReview, id: Date.now() }] });
    setNewReview({ author: "", text: "" });
  };

  const s = {
    app: { minHeight: "100vh", background: "#080c10", color: "#d4cfc7", fontFamily: "'Courier New', 'Courier', monospace", position: "relative" },
    header: { padding: "24px 36px 20px", borderBottom: "1px solid #141a20", display: "flex", alignItems: "center", justifyContent: "space-between" },
    wordmark: { fontSize: "20px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#d4cfc7", fontWeight: "700" },
    sub: { fontSize: "10px", letterSpacing: "0.3em", color: "#3a4a5a", textTransform: "uppercase", marginTop: "2px" },
    count: { fontSize: "11px", color: "#2a3a4a", letterSpacing: "0.1em" },
    toolbar: { padding: "16px 36px", borderBottom: "1px solid #0e1418", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" },
    input: { background: "#0d1318", border: "1px solid #1a2530", color: "#d4cfc7", padding: "8px 12px", fontSize: "12px", fontFamily: "inherit", outline: "none", flex: 1, minWidth: "180px" },
    select: { background: "#0d1318", border: "1px solid #1a2530", color: "#8a9aaa", padding: "8px 12px", fontSize: "11px", fontFamily: "inherit", outline: "none", cursor: "pointer", letterSpacing: "0.05em" },
    btn: { background: "transparent", border: "1px solid #1a2530", color: "#8a9aaa", padding: "8px 16px", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
    btnAccent: { background: "#F5A623", border: "1px solid #F5A623", color: "#080c10", padding: "8px 16px", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", fontWeight: "700", whiteSpace: "nowrap" },
    main: { padding: "0 36px 40px" },
    table: { width: "100%", borderCollapse: "collapse", marginTop: "20px" },
    th: { textAlign: "left", padding: "8px 14px", fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", color: "#2a3a4a", borderBottom: "1px solid #0e1418" },
    td: { padding: "13px 14px", borderBottom: "1px solid #0a0f14", fontSize: "12px", verticalAlign: "middle" },
    catBadge: { display: "inline-block", padding: "2px 8px", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", background: "#0d1318", border: "1px solid #1a2530", color: "#4a6a8a" },
    budgetBadge: { display: "inline-block", padding: "2px 8px", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", background: "#0d1318", border: "1px solid #1a2530", color: "#6a8a6a" },
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 100, padding: "20px", overflowY: "auto" },
    modalBox: { background: "#0a0e12", border: "1px solid #1a2530", width: "100%", maxWidth: "640px", padding: "36px", marginTop: "20px", marginBottom: "20px" },
    section: { marginTop: "28px", paddingTop: "20px", borderTop: "1px solid #0e1418" },
    sectionLabel: { fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", color: "#2a3a4a", marginBottom: "12px" },
    formInput: { width: "100%", background: "#0d1318", border: "1px solid #1a2530", color: "#d4cfc7", padding: "9px 12px", fontSize: "12px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
    formTextarea: { width: "100%", background: "#0d1318", border: "1px solid #1a2530", color: "#d4cfc7", padding: "9px 12px", fontSize: "12px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", resize: "vertical", minHeight: "80px" },
    label: { display: "block", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#3a4a5a", marginBottom: "5px" },
    formGroup: { marginBottom: "14px" },
    contactCard: { background: "#0d1318", border: "1px solid #1a2530", padding: "12px 14px", marginBottom: "8px" },
    eventTag: { display: "inline-block", padding: "3px 10px", fontSize: "10px", background: "#0d1318", border: "1px solid #1a2530", color: "#6a8aaa", marginRight: "6px", marginBottom: "6px", letterSpacing: "0.05em" },
    reviewCard: { background: "#0d1318", border: "1px solid #1a2530", padding: "12px 14px", marginBottom: "8px" },
    statusMsg: { padding: "10px 14px", fontSize: "11px", background: "#0d1318", borderLeft: "2px solid #F5A623", marginBottom: "10px", color: "#aaa", marginTop: "16px" },
  };

  if (!loaded) return <div style={{ ...s.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><span style={{ color: "#2a3a4a", letterSpacing: "0.3em", fontSize: "10px", textTransform: "uppercase" }}>Loading…</span></div>;

  return (
    <div style={s.app}>
      <div style={s.header}>
        <div>
          <div style={s.wordmark}>Back of House</div>
          <div style={s.sub}>The industry's back channel.</div>
        </div>
        <div style={s.count}>{vendors.length} partners · {Array.from(new Set(vendors.map(v => v.category))).length} categories</div>
      </div>

      <div style={s.toolbar}>
        <input style={s.input} placeholder="Search vendors, contacts, notes…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={s.select} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select style={s.select} value={filterBudget} onChange={e => setFilterBudget(e.target.value)}>
          {BUDGET_TIERS.map(b => <option key={b}>{b}</option>)}
        </select>
        <select style={s.select} value={filterRegion} onChange={e => setFilterRegion(e.target.value)}>
          {regions.map(r => <option key={r}>{r}</option>)}
        </select>
        <select style={s.select} value={filterRehire} onChange={e => setFilterRehire(e.target.value)}>
          <option value="All">All Status</option>
          {REHIRE_OPTIONS.map(r => <option key={r}>{r}</option>)}
        </select>
        <button style={s.btn} onClick={() => fileRef.current.click()}>Import CSV</button>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCSV} />
        <button style={s.btnAccent} onClick={() => { setNewVendor(emptyVendor()); setView("add"); }}>+ Add</button>
      </div>

      <div style={s.main}>
        {importStatus && <div style={{ ...s.statusMsg, borderColor: importStatus.type === "error" ? "#f87171" : "#F5A623" }}>{importStatus.msg}</div>}

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#2a3a4a" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase" }}>No vendors found</div>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Vendor / Venue</th>
                <th style={s.th}>Category</th>
                <th style={s.th}>Location</th>
                <th style={s.th}>Budget</th>
                <th style={s.th}>Rating</th>
                <th style={s.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} style={{ cursor: "pointer" }}
                  onClick={() => { setSelected(v); setView("detail"); }}
                  onMouseEnter={e => e.currentTarget.style.background = "#0a0e12"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ ...s.td, color: "#d4cfc7", fontWeight: "600" }}>
                    {v.name}
                    {v.contacts?.length > 0 && <div style={{ fontSize: "10px", color: "#3a4a5a", marginTop: "2px" }}>{v.contacts[0].name}</div>}
                  </td>
                  <td style={s.td}><span style={s.catBadge}>{v.category}</span></td>
                  <td style={{ ...s.td, color: "#4a6a8a", fontSize: "11px" }}>{[v.city, v.region].filter(Boolean).join(", ")}</td>
                  <td style={s.td}><span style={s.budgetBadge}>{v.budget}</span></td>
                  <td style={s.td}><StarRating rating={v.rating} /></td>
                  <td style={s.td}><RehireBadge status={v.rehire} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: "28px", padding: "14px 16px", background: "#0a0e12", border: "1px solid #0e1418" }}>
          <div style={{ fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", color: "#2a3a4a", marginBottom: "5px" }}>CSV Import Format</div>
          <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#2a3a4a" }}>name, category, city, region, budget, contact_name, contact_email, contact_phone, events (pipe-separated), rating, rehire, notes</div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {view === "detail" && selected && (
        <div style={s.modal} onClick={() => setView("list")}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
              <div style={{ fontSize: "20px", color: "#d4cfc7", letterSpacing: "0.05em", fontWeight: "700" }}>{selected.name}</div>
              <RehireBadge status={selected.rehire} />
            </div>
            <div style={{ fontSize: "10px", color: "#3a4a5a", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>
              {[selected.category, selected.city, selected.region, selected.budget + " tier"].filter(Boolean).join(" · ")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <StarRating rating={selected.rating} interactive onRate={r => updateSelected({ rating: r })} />
              <select style={{ ...s.select, fontSize: "10px" }} value={selected.rehire} onChange={e => updateSelected({ rehire: e.target.value })}>
                {REHIRE_OPTIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div style={s.section}>
              <div style={s.sectionLabel}>Notes & Intel</div>
              <textarea style={s.formTextarea} value={selected.notes} onChange={e => updateSelected({ notes: e.target.value })} placeholder="Your intel on this vendor…" />
            </div>

            <div style={s.section}>
              <div style={s.sectionLabel}>Contacts</div>
              {(selected.contacts || []).map((c, i) => (
                <div key={i} style={s.contactCard}>
                  <div style={{ fontSize: "12px", color: "#d4cfc7", fontWeight: "600" }}>{c.name || "—"}</div>
                  {c.email && <div style={{ fontSize: "11px", color: "#4a6a8a", marginTop: "2px" }}>{c.email}</div>}
                  {c.phone && <div style={{ fontSize: "11px", color: "#3a4a5a", marginTop: "1px" }}>{c.phone}</div>}
                </div>
              ))}
              <button style={{ ...s.btn, marginTop: "4px", fontSize: "9px" }} onClick={() => updateSelected({ contacts: [...(selected.contacts || []), { name: "", email: "", phone: "" }] })}>+ Add Contact</button>
            </div>

            <div style={s.section}>
              <div style={s.sectionLabel}>Events Worked</div>
              <div style={{ marginBottom: "10px" }}>
                {(selected.events || []).map((ev, i) => <span key={i} style={s.eventTag}>{ev}</span>)}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input style={{ ...s.formInput, flex: 1 }} placeholder="Add event name…" value={newEvent} onChange={e => setNewEvent(e.target.value)} onKeyDown={e => e.key === "Enter" && addEvent()} />
                <button style={s.btn} onClick={addEvent}>Add</button>
              </div>
            </div>

            <div style={s.section}>
              <div style={s.sectionLabel}>Peer Reviews</div>
              {(selected.peerReviews || []).map((r, i) => (
                <div key={i} style={s.reviewCard}>
                  {r.author && <div style={{ fontSize: "10px", color: "#3a4a5a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>{r.author}</div>}
                  <div style={{ fontSize: "12px", color: "#8a9aaa", lineHeight: 1.6 }}>"{r.text}"</div>
                </div>
              ))}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                <input style={s.formInput} placeholder="Reviewer name (optional)" value={newReview.author} onChange={e => setNewReview(p => ({ ...p, author: e.target.value }))} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <input style={{ ...s.formInput, flex: 1 }} placeholder="Review…" value={newReview.text} onChange={e => setNewReview(p => ({ ...p, text: e.target.value }))} onKeyDown={e => e.key === "Enter" && addReview()} />
                  <button style={s.btn} onClick={addReview}>Add</button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "24px", display: "flex", gap: "10px" }}>
              <button style={s.btn} onClick={() => setView("list")}>← Back</button>
              <button style={{ ...s.btn, borderColor: "#5a1a1a", color: "#f87171" }} onClick={() => deleteVendor(selected.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {view === "add" && (
        <div style={s.modal} onClick={() => setView("list")}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", color: "#3a4a5a", marginBottom: "24px" }}>Add Vendor / Venue</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[{ key: "name", label: "Name *", full: true }, { key: "city", label: "City" }, { key: "region", label: "Region" }].map(({ key, label, full }) => (
                <div key={key} style={{ ...s.formGroup, gridColumn: full ? "1 / -1" : "auto" }}>
                  <label style={s.label}>{label}</label>
                  <input style={s.formInput} value={newVendor[key]} onChange={e => setNewVendor(p => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
              <div style={s.formGroup}>
                <label style={s.label}>Category</label>
                <select style={{ ...s.formInput, cursor: "pointer" }} value={newVendor.category} onChange={e => setNewVendor(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.slice(1).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Budget Tier</label>
                <select style={{ ...s.formInput, cursor: "pointer" }} value={newVendor.budget} onChange={e => setNewVendor(p => ({ ...p, budget: e.target.value }))}>
                  {["Budget", "Mid", "Premium"].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Contact Name</label>
              <input style={s.formInput} value={newVendor.contacts[0]?.name || ""} onChange={e => setNewVendor(p => ({ ...p, contacts: [{ ...p.contacts[0], name: e.target.value }] }))} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={s.formGroup}>
                <label style={s.label}>Email</label>
                <input style={s.formInput} value={newVendor.contacts[0]?.email || ""} onChange={e => setNewVendor(p => ({ ...p, contacts: [{ ...p.contacts[0], email: e.target.value }] }))} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Phone</label>
                <input style={s.formInput} value={newVendor.contacts[0]?.phone || ""} onChange={e => setNewVendor(p => ({ ...p, contacts: [{ ...p.contacts[0], phone: e.target.value }] }))} />
              </div>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Notes</label>
              <textarea style={s.formTextarea} value={newVendor.notes} onChange={e => setNewVendor(p => ({ ...p, notes: e.target.value }))} placeholder="Your intel…" />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Rehire Status</label>
              <select style={{ ...s.formInput, cursor: "pointer" }} value={newVendor.rehire} onChange={e => setNewVendor(p => ({ ...p, rehire: e.target.value }))}>
                {REHIRE_OPTIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Rating</label>
              <StarRating rating={newVendor.rating} interactive onRate={r => setNewVendor(p => ({ ...p, rating: r }))} />
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button style={s.btnAccent} onClick={saveNew}>Add to Rolodex</button>
              <button style={s.btn} onClick={() => setView("list")}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
