import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL;
const GREEN = "#3d6e01";
const DARK_GREEN = "#2c4a1e";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";
const WHITE = "#ffffff";

// ── Acquisition — form to add a new book ──────────────────────────────────────
const ACQ_FIELDS = [
  { key: "accession_no", label: "Accession No." },
  { key: "isbn", label: "ISBN" },
  { key: "copy_no", label: "Copy No." },
  { key: "title", label: "Title", required: true },
  { key: "author", label: "Author" },
  { key: "edition", label: "Edition" },
  { key: "no_of_title", label: "No. of Title" },
  { key: "copyright_year", label: "Copyright" },
  { key: "publisher", label: "Publisher" },
  { key: "place_of_publication", label: "Place of Publication" },
  { key: "mode_of_acquisition", label: "Mode of Acquisition", options: ["Purchased", "Donation"] },
  { key: "price", label: "Price" },
  { key: "subject", label: "Subject" },
];

export function Acquisition() {
  const empty = Object.fromEntries(ACQ_FIELDS.map(f => [f.key, ""]));
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { type, text }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.title.trim()) { setMsg({ type: "error", text: "Title is required." }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/erd/library-books`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setForm(empty);
      setMsg({ type: "success", text: "Book saved to the catalog." });
    } catch { setMsg({ type: "error", text: "Failed to save. Is the backend running?" }); }
    finally { setSaving(false); }
  };

  const inputStyle = { width: "100%", padding: "8px 10px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 12.5, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DARK_GREEN }}>Acquisition</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: GRAY }}>Add a new book to the library catalog.</p>
      </div>

      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px 16px" }}>
          {ACQ_FIELDS.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 11, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: 0.3 }}>
                {f.label} {f.required && <span style={{ color: "#DC2626" }}>*</span>}
              </label>
              {f.options ? (
                <select value={form[f.key]} onChange={set(f.key)} style={{ ...inputStyle, marginTop: 4, background: WHITE }}>
                  <option value="">— Select —</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input value={form[f.key]} onChange={set(f.key)} placeholder={f.label} style={{ ...inputStyle, marginTop: 4 }} />
              )}
            </div>
          ))}
        </div>

        {msg && (
          <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: msg.type === "success" ? "#166534" : "#DC2626" }}>{msg.text}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={save} disabled={saving}
            style={{ padding: "10px 26px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "💾 Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Circulation — borrow records with a "Borrow Books" form ───────────────────
const CIRC_FIELDS = [
  { key: "date_borrowed", label: "Date Borrowed", type: "date" },
  { key: "borrower_type", label: "Who's Borrowing?", options: ["Students", "Faculty", "Others"] },
  { key: "fullname", label: "Fullname", required: true },
  { key: "accession_no", label: "Accession No." },
  { key: "author_title", label: "Author Title" },
  { key: "copy_no", label: "Copy No." },
  { key: "no_of_books", label: "No. of Books" },
  { key: "due_date", label: "Due Date", type: "date" },
];

export function Circulation({ canDelete = true }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const empty = Object.fromEntries(CIRC_FIELDS.map(f => [f.key, ""]));
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [people, setPeople] = useState([]);   // fetched student/faculty list
  const [pickOpen, setPickOpen] = useState(false);
  const pickRef = useRef(null);
  const [bookOpen, setBookOpen] = useState(false);   // book search overlay
  const [libBooks, setLibBooks] = useState([]);
  const [bookQ, setBookQ] = useState("");
  const [bookChosen, setBookChosen] = useState(false); // reveals the 3 book fields

  // Close the search dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!pickOpen) return;
    const onDoc = (e) => { if (pickRef.current && !pickRef.current.contains(e.target)) setPickOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [pickOpen]);

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/erd/circulation?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const nameOf = (p) => [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

  // When the borrower type changes, load the matching list and reset the name.
  const onType = (e) => {
    const v = e.target.value;
    setForm(f => ({ ...f, borrower_type: v, fullname: "" }));
    setPickOpen(false); setPeople([]);
    if (v === "Students" || v === "Faculty") {
      const url = v === "Students" ? "/api/erd/students" : "/api/erd/faculty";
      fetch(`${API}${url}?t=${Date.now()}`, { cache: "no-store" })
        .then(r => r.ok ? r.json() : [])
        .then(d => setPeople(Array.isArray(d) ? d : []))
        .catch(() => setPeople([]));
    }
  };
  const isPickable = form.borrower_type === "Students" || form.borrower_type === "Faculty";
  const matches = form.fullname.trim()
    ? people.filter(p => nameOf(p).toLowerCase().includes(form.fullname.trim().toLowerCase()))
    : [];

  const openBookSearch = () => {
    setBookOpen(true); setBookQ("");
    fetch(`${API}/api/erd/library-books?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setLibBooks(Array.isArray(d) ? d : []))
      .catch(() => setLibBooks([]));
  };
  const chooseBook = (b) => {
    setForm(f => ({
      ...f,
      accession_no: b.accession_no || "",
      author_title: [b.title, b.author].filter(Boolean).join(" — "),
      copy_no: b.copy_no || "",
    }));
    setBookChosen(true); setBookOpen(false);
  };
  const bookMatches = bookQ.trim()
    ? libBooks.filter(b => `${b.title || ""} ${b.author || ""} ${b.accession_no || ""} ${b.isbn || ""}`.toLowerCase().includes(bookQ.trim().toLowerCase()))
    : libBooks;

  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const openBorrow = () => { setMsg(null); setForm({ ...empty, date_borrowed: today() }); setBookChosen(false); setPeople([]); setOpen(true); };

  const save = async () => {
    if (!form.fullname.trim()) { setMsg({ type: "error", text: "Fullname is required." }); return; }
    // For Students/Faculty, the name must be picked from the list — not free-typed.
    if (isPickable && !people.some(p => nameOf(p).toLowerCase() === form.fullname.trim().toLowerCase())) {
      setMsg({ type: "error", text: `Please select a ${form.borrower_type.toLowerCase().replace(/s$/, "")} from the search list.` });
      return;
    }
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/erd/circulation`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setForm(empty); setBookChosen(false); setOpen(false); load();
    } catch { setMsg({ type: "error", text: "Failed to save. Is the backend running?" }); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this borrow record?")) return;
    try {
      const res = await fetch(`${API}/api/erd/circulation/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows(rs => rs.filter(r => r.id !== id));
    } catch { alert("Failed to delete. Is the backend running?"); }
  };

  const inputStyle = { width: "100%", padding: "8px 10px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 12.5, outline: "none", boxSizing: "border-box" };
  const cols = ["date_borrowed", "borrower_type", "fullname", "accession_no", "author_title", "copy_no", "no_of_books", "due_date"];

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 130px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DARK_GREEN }}>Circulation</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: GRAY }}>Book borrowing and returns.</p>
        </div>
        <button onClick={openBorrow}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Borrow Books
        </button>
      </div>

      <div style={{ flex: 1, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", minWidth: 1170 }}>
          <colgroup>
            {[120, 130, 220, 110, 240, 90, 100, 120, 80].map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>
          <thead>
            <tr>
              {["Date Borrowed", "Who's Borrowing?", "Fullname", "Accession No.", "Author Title", "Copy No.", "No. of Books", "Due Date", "Actions"].map(h => (
                <th key={h} style={{ padding: "8px 8px", textAlign: "center", verticalAlign: "middle", fontSize: 10.5, fontWeight: 700, color: WHITE, background: GREEN, border: "1px solid #6b8f3a", whiteSpace: "normal", wordBreak: "break-word" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: GRAY, fontSize: 12.5, border: `1px solid ${BORDER}` }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: GRAY, fontSize: 12.5, border: `1px solid ${BORDER}` }}>No borrow records yet.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                {cols.map(c => <td key={c} style={LIB_CELL}>{r[c] != null && r[c] !== "" ? r[c] : "—"}</td>)}
                <td style={{ ...LIB_CELL, textAlign: "center" }}>
                  {canDelete ? (
                    <button onClick={() => remove(r.id)} title="Delete"
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", borderRadius: 6, cursor: "pointer" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                    </button>
                  ) : <span style={{ color: "#D1D5DB" }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: WHITE, borderRadius: 14, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "14px 18px", background: GREEN, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: WHITE }}>Borrow Books</div>
              <button onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: WHITE, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px 16px" }}>
                {CIRC_FIELDS.map(f => {
                  // The three book fields stay hidden until a book is chosen.
                  if (["accession_no", "author_title", "copy_no"].includes(f.key) && !bookChosen) return null;
                  const cell = (
                  <div key={f.key} ref={f.key === "fullname" && isPickable ? pickRef : undefined} style={f.key === "fullname" && isPickable ? { position: "relative" } : undefined}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: 0.3 }}>
                      {f.label} {f.required && <span style={{ color: "#DC2626" }}>*</span>}
                    </label>
                    {f.key === "borrower_type" ? (
                      <select value={form.borrower_type} onChange={onType} style={{ ...inputStyle, marginTop: 4, background: WHITE }}>
                        <option value="">— Select —</option>
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.key === "fullname" && isPickable ? (
                      <>
                        <div style={{ position: "relative", marginTop: 4 }}>
                          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: GRAY, display: "flex", pointerEvents: "none" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                          </span>
                          <input
                            value={form.fullname}
                            onChange={e => { setForm(ff => ({ ...ff, fullname: e.target.value })); setPickOpen(true); }}
                            placeholder={`Search ${form.borrower_type.toLowerCase()}…`}
                            style={{ ...inputStyle, paddingLeft: 28 }}
                          />
                        </div>
                        {pickOpen && form.fullname.trim() && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, marginTop: 2, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: "0 8px 20px rgba(0,0,0,0.14)", maxHeight: 190, overflow: "auto" }}>
                            {matches.length === 0 ? (
                              <div style={{ padding: "10px 12px", fontSize: 12, color: GRAY }}>No match.</div>
                            ) : matches.map(p => (
                              <div key={p.id}
                                onClick={() => { setForm(ff => ({ ...ff, fullname: nameOf(p) })); setPickOpen(false); }}
                                style={{ padding: "8px 12px", fontSize: 12.5, cursor: "pointer", borderBottom: `1px solid #F1F1F1` }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#F3F7EE")}
                                onMouseLeave={e => (e.currentTarget.style.background = WHITE)}>
                                {nameOf(p)}{p.student_number ? <span style={{ color: GRAY }}> · {p.student_number}</span> : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <input type={f.type || "text"} value={form[f.key]} onChange={set(f.key)} placeholder={f.type === "date" ? "" : f.label} style={{ ...inputStyle, marginTop: 4 }} />
                    )}
                  </div>
                  );
                  if (f.key === "fullname") {
                    return [cell, (
                      <div key="__searchbook" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                        <button onClick={openBookSearch}
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 12px", background: WHITE, color: DARK_GREEN, border: `1.5px solid ${GREEN}`, borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                          Search Book
                        </button>
                      </div>
                    )];
                  }
                  return cell;
                })}
              </div>
              {msg && <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: "#DC2626" }}>{msg.text}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button onClick={() => setOpen(false)} style={{ padding: "10px 20px", background: "#F3F4F6", color: "#374151", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                <button onClick={save} disabled={saving} style={{ padding: "10px 24px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "💾 Save"}</button>
              </div>
            </div>
          </div>

          {/* Book search overlay */}
          {bookOpen && (
            <div onClick={(e) => { e.stopPropagation(); setBookOpen(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 16 }}>
              <div onClick={e => e.stopPropagation()} style={{ background: WHITE, borderRadius: 14, width: "100%", maxWidth: 640, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
                <div style={{ padding: "14px 18px", background: GREEN, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: WHITE }}>Search Book</div>
                  <button onClick={() => setBookOpen(false)} style={{ background: "transparent", border: "none", color: WHITE, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: GRAY, display: "flex", pointerEvents: "none" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    </span>
                    <input autoFocus value={bookQ} onChange={e => setBookQ(e.target.value)} placeholder="Search title, author, accession no.…"
                      style={{ ...inputStyle, paddingLeft: 30 }} />
                  </div>
                </div>
                <div style={{ flex: 1, overflow: "auto", padding: "0 16px 16px" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {["Accession No.", "Title", "Author", "Copy No."].map(h => (
                          <th key={h} style={{ position: "sticky", top: 0, padding: "8px 8px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: WHITE, background: GREEN }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bookMatches.length === 0 ? (
                        <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: GRAY }}>{libBooks.length ? "No matching books." : "No books in the catalog."}</td></tr>
                      ) : bookMatches.map(b => (
                        <tr key={b.id} onClick={() => chooseBook(b)}
                          style={{ cursor: "pointer", borderBottom: `1px solid ${BORDER}` }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#F3F7EE")}
                          onMouseLeave={e => (e.currentTarget.style.background = WHITE)}>
                          <td style={{ padding: "8px 8px" }}>{b.accession_no || "—"}</td>
                          <td style={{ padding: "8px 8px", fontWeight: 600 }}>{b.title || "—"}</td>
                          <td style={{ padding: "8px 8px" }}>{b.author || "—"}</td>
                          <td style={{ padding: "8px 8px" }}>{b.copy_no || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Library Settings → Purpose — manage the check-in purpose options ──────────
export function LibraryPurposeSettings({ canDelete = true }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/erd/library-purposes?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/erd/library-purposes`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || ""); }
      setName(""); load();
    } catch (e) { setMsg(e.message || "Failed to add. Is the backend running?"); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this purpose?")) return;
    try {
      const res = await fetch(`${API}/api/erd/library-purposes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems(xs => xs.filter(x => x.id !== id));
    } catch { alert("Failed to delete. Is the backend running?"); }
  };

  const inputStyle = { width: "100%", padding: "9px 11px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DARK_GREEN }}>Purpose</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: GRAY }}>Manage the purpose options shown in the check-in form.</p>
      </div>

      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18, maxWidth: 560 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="Add a purpose (e.g. Study, Research, Borrow)…" style={inputStyle} />
          <button onClick={add} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", whiteSpace: "nowrap", opacity: saving ? 0.7 : 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add
          </button>
        </div>
        {msg && <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: "#DC2626" }}>{msg}</div>}

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {loading ? (
            <div style={{ fontSize: 12.5, color: GRAY }}>Loading…</div>
          ) : items.length === 0 ? (
            <div style={{ fontSize: 12.5, color: GRAY }}>No purposes yet. Add one above.</div>
          ) : items.map(it => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", border: `1px solid ${BORDER}`, borderRadius: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{it.name}</span>
              {canDelete && (
                <button onClick={() => remove(it.id)} title="Delete" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", borderRadius: 6, cursor: "pointer" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Check In / Check Out — two big action buttons + visitor log ───────────────
const CIO_EMPTY = { role: "", fullname: "", program: "", section: "", purpose: "", purpose_other: "" };

export function CheckInOut({ canDelete = true }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);   // check-in form
  const [outOpen, setOutOpen] = useState(false);      // check-out picker
  const [form, setForm] = useState(CIO_EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [people, setPeople] = useState([]);
  const [pickOpen, setPickOpen] = useState(false);
  const pickRef = useRef(null);
  const [purposes, setPurposes] = useState([]);
  const [outQ, setOutQ] = useState("");

  useEffect(() => {
    fetch(`${API}/api/erd/library-purposes?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setPurposes(Array.isArray(d) ? d : []))
      .catch(() => setPurposes([]));
  }, []);

  useEffect(() => {
    if (!pickOpen) return;
    const onDoc = (e) => { if (pickRef.current && !pickRef.current.contains(e.target)) setPickOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [pickOpen]);

  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const isPick = ["Student", "Faculty", "Staff"].includes(form.role);
  const matches = form.fullname.trim()
    ? people.filter(p => p.fullname.toLowerCase().includes(form.fullname.trim().toLowerCase()))
    : [];

  // Role drives who can be searched and what fills Program/Designation.
  const onRole = (e) => {
    const v = e.target.value;
    setForm(f => ({ ...f, role: v, fullname: "", program: v === "Others" ? "Visitors" : "" }));
    setPickOpen(false); setPeople([]);
    if (["Student", "Faculty", "Staff"].includes(v)) {
      fetch(`${API}/api/erd/checkin-people?role=${v}&t=${Date.now()}`, { cache: "no-store" })
        .then(r => r.ok ? r.json() : [])
        .then(d => setPeople(Array.isArray(d) ? d : []))
        .catch(() => setPeople([]));
    }
  };
  const pickPerson = (p) => { setForm(f => ({ ...f, fullname: p.fullname, program: p.program_designation || "", section: p.section != null ? p.section : f.section })); setPickOpen(false); };

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/erd/checkinout?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const saveCheckIn = async () => {
    if (!form.fullname.trim()) { setMsg({ type: "error", text: "Fullname is required." }); return; }
    if (isPick && !people.some(p => p.fullname.toLowerCase() === form.fullname.trim().toLowerCase())) {
      setMsg({ type: "error", text: `Please select a ${form.role.toLowerCase()} from the search list.` });
      return;
    }
    setSaving(true); setMsg(null);
    const finalPurpose = /^others?$/i.test(form.purpose.trim()) && form.purpose_other.trim()
      ? form.purpose_other.trim() : form.purpose;
    try {
      const res = await fetch(`${API}/api/erd/checkinout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, purpose: finalPurpose, log_date: today(), check_in: nowTime() }),
      });
      if (!res.ok) throw new Error();
      setForm(CIO_EMPTY); setFormOpen(false); load();
    } catch { setMsg({ type: "error", text: "Failed to save. Is the backend running?" }); }
    finally { setSaving(false); }
  };

  const doCheckOut = async (id) => {
    try {
      const res = await fetch(`${API}/api/erd/checkinout/${id}/checkout`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ check_out: nowTime() }),
      });
      if (!res.ok) throw new Error();
      setOutOpen(false); load();
    } catch { alert("Failed to check out. Is the backend running?"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this log entry?")) return;
    try {
      const res = await fetch(`${API}/api/erd/checkinout/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows(rs => rs.filter(r => r.id !== id));
    } catch { alert("Failed to delete. Is the backend running?"); }
  };

  const openInAll = rows.filter(r => !r.check_out); // still inside the library
  const openIn = outQ.trim()
    ? openInAll.filter(r => `${r.fullname || ""} ${r.program || ""} ${r.section || ""}`.toLowerCase().includes(outQ.trim().toLowerCase()))
    : openInAll;
  const inputStyle = { width: "100%", padding: "8px 10px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 12.5, outline: "none", boxSizing: "border-box" };
  const cols = ["log_date", "role", "fullname", "program", "section", "purpose", "check_in", "check_out"];

  const BigButton = ({ label, sub, onClick, children }) => (
    <button onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        width: 230, padding: "30px 20px", cursor: "pointer",
        background: WHITE, color: DARK_GREEN, border: `2px solid ${GREEN}`, borderRadius: 16,
        boxShadow: "0 2px 6px rgba(0,0,0,0.06)", transition: "transform 0.18s ease, box-shadow 0.18s ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 14px 28px rgba(0,0,0,0.16)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.06)"; }}>
      {children}
      <div style={{ fontSize: 20, fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.8 }}>{sub}</div>
    </button>
  );

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 130px)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
        <BigButton label="Check-in" sub="Entering the library" onClick={() => { setMsg(null); setForm(CIO_EMPTY); setFormOpen(true); }}>
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </BigButton>

        <BigButton label="Check-out" sub="Leaving the library" onClick={() => { setOutQ(""); setOutOpen(true); }}>
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </BigButton>
      </div>

      {/* Visitor log */}
      <div style={{ flex: 1, marginTop: 28, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", minWidth: 980 }}>
          <colgroup>
            {[120, 100, 220, 150, 100, 200, 100, 100, 80].map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>
          <thead>
            <tr>
              {["Date", "Role", "Fullname", "Program/Designation", "Section", "Purpose", "Check In", "Check Out", "Actions"].map(h => (
                <th key={h} style={{ padding: "8px 8px", textAlign: "center", verticalAlign: "middle", fontSize: 10.5, fontWeight: 700, color: WHITE, background: GREEN, border: "1px solid #6b8f3a", whiteSpace: "normal", wordBreak: "break-word" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: GRAY, fontSize: 12.5, border: `1px solid ${BORDER}` }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: GRAY, fontSize: 12.5, border: `1px solid ${BORDER}` }}>No records yet.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                {cols.map(c => <td key={c} style={LIB_CELL}>{r[c] != null && r[c] !== "" ? r[c] : "—"}</td>)}
                <td style={{ ...LIB_CELL, textAlign: "center" }}>
                  {canDelete ? (
                    <button onClick={() => remove(r.id)} title="Delete"
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", borderRadius: 6, cursor: "pointer" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                    </button>
                  ) : <span style={{ color: "#D1D5DB" }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Check-in form */}
      {formOpen && (
        <div onClick={() => setFormOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: WHITE, borderRadius: 14, width: "100%", maxWidth: 520, boxShadow: "0 20px 50px rgba(0,0,0,0.3)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", background: GREEN, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: WHITE }}>Check-in</div>
              <button onClick={() => setFormOpen(false)} style={{ background: "transparent", border: "none", color: WHITE, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "12px 16px" }}>
                {[
                  { key: "role", label: "Role", options: ["Student", "Faculty", "Staff", "Others"] },
                  { key: "fullname", label: "Fullname", required: true },
                  { key: "program", label: "Program/Designation" },
                  { key: "section", label: "Section" },
                  { key: "purpose", label: "Purpose" },
                ].map(f => {
                  const label = (
                    <label style={{ fontSize: 11, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: 0.3 }}>
                      {f.label} {f.required && <span style={{ color: "#DC2626" }}>*</span>}
                    </label>
                  );
                  if (f.key === "role") {
                    return (
                      <div key={f.key}>
                        {label}
                        <select value={form.role} onChange={onRole} style={{ ...inputStyle, marginTop: 4, background: WHITE }}>
                          <option value="">— Select —</option>
                          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    );
                  }
                  if (f.key === "fullname" && isPick) {
                    return (
                      <div key={f.key} ref={pickRef} style={{ position: "relative" }}>
                        {label}
                        <div style={{ position: "relative", marginTop: 4 }}>
                          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: GRAY, display: "flex", pointerEvents: "none" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                          </span>
                          <input value={form.fullname}
                            onChange={e => { setForm(ff => ({ ...ff, fullname: e.target.value })); setPickOpen(true); }}
                            placeholder={`Search ${form.role.toLowerCase()}…`} style={{ ...inputStyle, paddingLeft: 28 }} />
                        </div>
                        {pickOpen && form.fullname.trim() && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, marginTop: 2, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: "0 8px 20px rgba(0,0,0,0.14)", maxHeight: 190, overflow: "auto" }}>
                            {matches.length === 0 ? (
                              <div style={{ padding: "10px 12px", fontSize: 12, color: GRAY }}>No match.</div>
                            ) : matches.map(p => (
                              <div key={p.id} onClick={() => pickPerson(p)}
                                style={{ padding: "8px 12px", fontSize: 12.5, cursor: "pointer", borderBottom: "1px solid #F1F1F1" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#F3F7EE")}
                                onMouseLeave={e => (e.currentTarget.style.background = WHITE)}>
                                {p.fullname}{p.program_designation ? <span style={{ color: GRAY }}> · {p.program_designation}</span> : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  if (f.key === "program") {
                    const locked = isPick || form.role === "Others";
                    return (
                      <div key={f.key}>
                        {label}
                        <input value={form.program} onChange={set("program")} readOnly={locked}
                          placeholder={f.label}
                          style={{ ...inputStyle, marginTop: 4, background: locked ? "#F3F4F6" : WHITE, color: locked ? "#374151" : "#111827" }} />
                      </div>
                    );
                  }
                  if (f.key === "section") {
                    const locked = form.role === "Student";
                    return (
                      <div key={f.key}>
                        {label}
                        <input value={form.section} onChange={set("section")} readOnly={locked} placeholder={f.label}
                          style={{ ...inputStyle, marginTop: 4, background: locked ? "#F3F4F6" : WHITE, color: locked ? "#374151" : "#111827" }} />
                      </div>
                    );
                  }
                  if (f.key === "purpose") {
                    const isOther = /^others?$/i.test(form.purpose.trim());
                    return (
                      <div key={f.key}>
                        {label}
                        <select value={form.purpose} onChange={set("purpose")} style={{ ...inputStyle, marginTop: 4, background: WHITE }}>
                          <option value="">— Select —</option>
                          {purposes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                        {isOther && (
                          <input value={form.purpose_other} onChange={set("purpose_other")} placeholder="Please specify purpose…"
                            style={{ ...inputStyle, marginTop: 8 }} />
                        )}
                      </div>
                    );
                  }
                  return (
                    <div key={f.key}>
                      {label}
                      <input value={form[f.key]} onChange={set(f.key)} placeholder={f.label} style={{ ...inputStyle, marginTop: 4 }} />
                    </div>
                  );
                })}
              </div>
              {msg && <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: "#DC2626" }}>{msg.text}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button onClick={() => setFormOpen(false)} style={{ padding: "10px 20px", background: "#F3F4F6", color: "#374151", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                <button onClick={saveCheckIn} disabled={saving} style={{ padding: "10px 24px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Check-in"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-out picker */}
      {outOpen && (
        <div onClick={() => setOutOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: WHITE, borderRadius: 14, width: "100%", maxWidth: 520, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", background: GREEN, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: WHITE }}>Check-out</div>
              <button onClick={() => setOutOpen(false)} style={{ background: "transparent", border: "none", color: WHITE, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            {openInAll.length > 0 && (
              <div style={{ padding: "12px 16px 0" }}>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: GRAY, display: "flex", pointerEvents: "none" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  </span>
                  <input value={outQ} onChange={e => setOutQ(e.target.value)} placeholder="Search…"
                    style={{ width: "100%", padding: "7px 10px 7px 30px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12.5, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            )}
            <div style={{ padding: 16, overflow: "auto" }}>
              {openInAll.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: GRAY, fontSize: 12.5 }}>Nobody is currently checked in.</div>
              ) : openIn.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: GRAY, fontSize: 12.5 }}>No match.</div>
              ) : openIn.map(r => (
                <div key={r.id} onClick={() => doCheckOut(r.id)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 8, cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F3F7EE")}
                  onMouseLeave={e => (e.currentTarget.style.background = WHITE)}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{r.fullname}</div>
                    <div style={{ fontSize: 11, color: GRAY }}>{[r.program, r.section].filter(Boolean).join(" · ") || "—"} · in {r.check_in || "—"}</div>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: DARK_GREEN }}>Check out →</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Library Search — header with a minimal search bar on the right.
export function LibrarySearch({ canDelete = true }) {
  const [books, setBooks] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/erd/library-books?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setBooks(Array.isArray(d) ? d : []))
      .catch(() => setBooks([]))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (id) => {
    if (!window.confirm("Delete this book from the catalog? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API}/api/erd/library-books/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setBooks(bs => bs.filter(b => b.id !== id));
    } catch { alert("Failed to delete. Is the backend running?"); }
  };

  const term = q.trim().toLowerCase();
  const rows = term
    ? books.filter(b => `${b.title || ""} ${b.author || ""} ${b.isbn || ""} ${b.subject || ""} ${b.publisher || ""} ${b.accession_no || ""}`.toLowerCase().includes(term))
    : books;

  // Subject sits right after Place of Publication; status + actions render separately.
  const cols = ["accession_no", "isbn", "copy_no", "title", "author", "edition", "no_of_title", "copyright_year", "publisher", "place_of_publication", "subject", "mode_of_acquisition", "price"];

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 130px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 12 }}>
        <div style={{ position: "relative", width: 220 }}>
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: GRAY, display: "flex", pointerEvents: "none" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </span>
          <input
            type="text" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search books…"
            style={{ width: "100%", padding: "6px 10px 6px 28px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, outline: "none", boxSizing: "border-box" }}
          />
        </div>
      </div>

      <div style={{ flex: 1, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", minWidth: 1620 }}>
          <colgroup>
            {[70, 120, 55, 200, 220, 55, 60, 75, 200, 110, 120, 110, 65, 90, 80].map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {[
                "Accession No.", "ISBN", "Copy no.", "Title", "Author", "Edition",
                "No. of Title", "Copyright", "Publisher", "Place of Publication",
                "Subject", "Mode of Acquisition", "Price", "Status", "Actions",
              ].map(h => (
                <th key={h} style={{ padding: "8px 8px", textAlign: "center", verticalAlign: "middle", fontSize: 10, fontWeight: 700, color: WHITE, background: GREEN, border: `1px solid #6b8f3a`, whiteSpace: "normal", wordBreak: "break-word" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={15} style={{ padding: 24, textAlign: "center", color: GRAY, fontSize: 12.5, border: `1px solid ${BORDER}` }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={15} style={{ padding: 24, textAlign: "center", color: GRAY, fontSize: 12.5, border: `1px solid ${BORDER}` }}>{term ? "No matching books." : "No books recorded yet."}</td></tr>
            ) : rows.map(b => {
              const st = (b.status || "Available").trim() || "Available";
              const avail = /avail/i.test(st);
              return (
                <tr key={b.id}>
                  {cols.map(c => <td key={c} style={LIB_CELL}>{b[c] != null && b[c] !== "" ? b[c] : "—"}</td>)}
                  <td style={{ ...LIB_CELL, textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, color: avail ? "#166534" : "#92400e", background: avail ? "#DCFCE7" : "#FEF3C7" }}>{st}</span>
                  </td>
                  <td style={{ ...LIB_CELL, textAlign: "center" }}>
                    {canDelete ? (
                      <button onClick={() => remove(b.id)} title="Delete"
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", borderRadius: 6, cursor: "pointer" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                      </button>
                    ) : <span style={{ color: "#D1D5DB" }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Cell style for the catalog table (wraps so all text is visible).
export const LIB_CELL = { padding: "6px 8px", fontSize: 11, color: "#1f2937", border: "1px solid #E5E7EB", textAlign: "center", verticalAlign: "middle", whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.35 };

// Simple placeholder page for Library sub-sections not built out yet.
export function LibraryPlaceholder({ title, desc, icon = "📚" }) {
  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DARK_GREEN }}>{title}</h2>
        {desc && <p style={{ margin: "4px 0 0", fontSize: 12.5, color: GRAY }}>{desc}</p>}
      </div>
      <div style={{ background: WHITE, border: `1px dashed ${BORDER}`, borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>{icon}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#1f2937" }}>{title} — coming soon</div>
        <div style={{ fontSize: 12.5, color: GRAY, marginTop: 6 }}>This section is ready. Tell me what it should do and I'll build it.</div>
      </div>
    </div>
  );
}

function Card({ title, sub, accent, children }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden",
        display: "flex", flexDirection: "column",
        transition: "transform 0.22s ease, box-shadow 0.22s ease",
        transform: hover ? "translateY(-5px)" : "translateY(0)",
        boxShadow: hover ? "0 12px 24px rgba(0,0,0,0.14)" : "0 1px 2px rgba(0,0,0,0.04)",
      }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${GREEN}`, background: GREEN }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: WHITE }}>{title}</div>
        {sub && <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.85)", marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ flex: 1, minHeight: 220, padding: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

// Count-up animation for a number.
function useCountUp(target, dur = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf; const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(target * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return n;
}

export default function Library() {
  const [books, setBooks] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/erd/library-books?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setBooks(Array.isArray(d) ? d : []))
      .catch(() => setBooks([]))
      .finally(() => setTimeout(() => setReady(true), 60));
  }, []);

  const total = books.length;
  const purchased = books.filter(b => /purchas/i.test(b.mode_of_acquisition || "")).length;
  const donation = books.filter(b => /donat/i.test(b.mode_of_acquisition || "")).length;

  // per-subject counts → top 5
  const subjMap = new Map();
  books.forEach(b => { const s = (b.subject || "").trim() || "—"; subjMap.set(s, (subjMap.get(s) || 0) + 1); });
  const bars = [...subjMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, v]) => ({ label, v }));
  const barMax = Math.max(1, ...bars.map(b => b.v));

  const recent = books.slice(0, 4); // endpoint returns newest first

  // donut geometry
  const R = 44, C = 2 * Math.PI * R;
  const pFrac = total ? purchased / total : 0;
  const dFrac = total ? donation / total : 0;
  const pct = (n) => total ? Math.round((n / total) * 100) : 0;
  const totalCount = useCountUp(total);

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`
        .lib-grid { display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr) 250px; gap:16px; align-items:stretch; }
        @media (max-width: 860px) { .lib-grid { grid-template-columns: 1fr; } }
        @keyframes libIn { from { opacity:0; } to { opacity:1; } }
        .lib-grid > * { animation: libIn 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        .lib-grid > *:nth-child(2) { animation-delay: 0.07s; }
        .lib-grid > *:nth-child(3) { animation-delay: 0.14s; }
        .lib-grid > *:nth-child(4) { animation-delay: 0.21s; }
        .lib-grid > *:nth-child(5) { animation-delay: 0.28s; }
        .lib-donut-seg { transition: stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1); }
        .lib-bar { transition: height 0.7s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div className="lib-grid">
        <Card title="Books" sub="Total in collection" accent="#1E88E5">
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: "#111827", lineHeight: 1 }}>{totalCount}</div>
            <div style={{ fontSize: 11.5, color: GRAY, marginTop: 6 }}>books recorded</div>
          </div>
        </Card>

        <Card title="Announcements" sub="Library notices" accent="#F5A800">
          <div style={{ display: "inline-block", padding: "10px 16px", background: "#FEF2F2", color: "#991B1B", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>ⓘ No announcements yet</div>
        </Card>

        <Card title="Newly Acquired" sub="Recent additions" accent="#3d6e01">
          {recent.length === 0 ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", background: "#F3F4F6", color: GRAY, borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
              No new books yet
            </div>
          ) : (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, alignSelf: "flex-start" }}>
              {recent.map(b => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                  <span style={{ color: GREEN, display: "flex", flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                  </span>
                  <span style={{ fontWeight: 700, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title || "Untitled"}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Donut — Purchased vs Donation */}
        <Card title="Books by Category" sub="Distribution" accent="#1E88E5">
          <div style={{ display: "flex", alignItems: "center", gap: 18, width: "100%", justifyContent: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
              <svg width="110" height="110" viewBox="0 0 110 110">
                <circle cx="55" cy="55" r={R} fill="none" stroke="#E5E7EB" strokeWidth="14" />
                {purchased > 0 && (
                  <circle className="lib-donut-seg" cx="55" cy="55" r={R} fill="none" stroke="#DC2626" strokeWidth="14"
                    strokeDasharray={`${pFrac * C} ${C}`} strokeDashoffset={ready ? 0 : pFrac * C}
                    transform="rotate(-90 55 55)" />
                )}
                {donation > 0 && (
                  <circle className="lib-donut-seg" cx="55" cy="55" r={R} fill="none" stroke="#2563EB" strokeWidth="14"
                    strokeDasharray={`${dFrac * C} ${C}`} strokeDashoffset={ready ? 0 : dFrac * C}
                    transform={`rotate(${-90 + pFrac * 360} 55 55)`} style={{ transitionDelay: "0.15s" }} />
                )}
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#111827", lineHeight: 1 }}>{totalCount}</div>
                <div style={{ fontSize: 9.5, color: GRAY, marginTop: 2 }}>books</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Purchased", color: "#DC2626", v: purchased },
                { label: "Donation", color: "#2563EB", v: donation },
              ].map(c => (
                <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, color: "#111827" }}>{c.label}</span>
                  <span style={{ color: GRAY }}>{c.v} ({pct(c.v)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Bar chart — No. of Book per Subject */}
        <Card title="No. of Book per Subject" sub="Books by subject" accent="#F5A800">
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
            {bars.length === 0 ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: GRAY, fontSize: 12 }}>No data yet</div>
            ) : (
              <>
                <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-around", gap: 10, borderBottom: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}`, padding: "6px 6px 0", minHeight: 150 }}>
                  {bars.map(b => (
                    <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: DARK_GREEN }}>{b.v}</div>
                      <div className="lib-bar" style={{ width: "60%", maxWidth: 32, height: ready ? `${Math.max(4, (b.v / barMax) * 100)}%` : "0%", background: "linear-gradient(180deg, #5a9e12, #2c4a1e)", borderRadius: "4px 4px 0 0" }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-around", gap: 10, padding: "5px 6px 0" }}>
                  {bars.map(b => (
                    <div key={b.label} style={{ flex: 1, textAlign: "center", fontSize: 10, color: GRAY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.label}</div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
