import { useState, useEffect, useMemo } from "react";
import { showToast, showConfirm } from "../components/Toast";

const DARK_GREEN = "#3d6e01";
const GREEN      = "#3d6e01";
const WHITE      = "#FFFFFF";
const GRAY       = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const BORDER     = "#E5E7EB";
const RED        = "#DC2626";
const BLUE       = "#1E88E5";
const AMBER      = "#B45309";

const FINE_PER_DAY = 5; // ₱ per day late
const LOAN_DAYS    = 7; // default borrow period

// ── localStorage-backed state (no backend required) ──────────────────────────
function useStore(key, initial) {
  const [val, setVal] = useState(() => {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : initial; }
    catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }, [key, val]);
  return [val, setVal];
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => { const t = new Date(d); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

const TABS = [
  { key: "catalog",     label: "Catalog" },
  { key: "members",     label: "Members" },
  { key: "circulation", label: "Issue & Return" },
  { key: "reports",     label: "Reports" },
];

export default function Library() {
  const [tab, setTab] = useState("catalog");
  const [books, setBooks]     = useStore("cca_lib_books", []);
  const [guests, setGuests]   = useStore("cca_lib_members", []); // manually-added guests only
  const [loans, setLoans]     = useStore("cca_lib_loans", []);
  const [acqs, setAcqs]       = useStore("cca_lib_acquisitions", []);
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty]   = useState([]);

  useEffect(() => {
    const API = import.meta.env.VITE_API_URL;
    fetch(`${API}/api/erd/students`).then(r => r.ok ? r.json() : []).then(d => setStudents(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/erd/faculty`).then(r => r.ok ? r.json() : []).then(d => setFaculty(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // Unified member pool: fetched students + fetched faculty + local guests.
  const allMembers = useMemo(() => ([
    ...students.map(s => ({
      id: `S:${s.id}`, memberId: s.student_number || `S-${s.id}`,
      name: [s.last_name, s.first_name, s.middle_name].filter(Boolean).join(", "), type: "Student",
      course: s.course || "", year_level: s.year_level || "", section: s.section || "",
    })),
    ...faculty.map(f => ({
      id: `F:${f.id ?? f.user_id ?? f.userId}`,
      memberId: f.id_no || f.idNo || f.id_number || f.username || `F-${f.id ?? ""}`,
      name: [f.last_name ?? f.lastName, f.first_name ?? f.firstName, f.middle_name ?? f.middleName].filter(Boolean).join(", ") || f.username || "—",
      type: "Faculty",
    })),
    ...guests.map(g => ({ id: g.id, memberId: g.memberId, name: g.name, type: "Guest" })),
  ]), [students, faculty, guests]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <span style={{ fontSize: "22px" }}>📚</span>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: DARK_GREEN }}>Library</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", borderBottom: `2px solid ${BORDER}`, marginBottom: "16px" }}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              style={{ padding: "8px 14px", background: active ? DARK_GREEN : "transparent", color: active ? WHITE : "#4B5563",
                border: "none", borderRadius: "8px 8px 0 0", fontSize: "12px", fontWeight: active ? 700 : 500, cursor: "pointer" }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "catalog"     && <CatalogPanel books={books} setBooks={setBooks} />}
      {tab === "members"     && <MembersPanel students={students} faculty={faculty} guests={guests} setGuests={setGuests} allMembers={allMembers} loans={loans} />}
      {tab === "circulation" && <CirculationPanel books={books} setBooks={setBooks} members={allMembers} loans={loans} setLoans={setLoans} />}
      {tab === "reports"     && <ReportsPanel books={books} members={allMembers} loans={loans} />}
    </div>
  );
}

// ── shared styles ────────────────────────────────────────────────────────────
const input = { padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "12px", outline: "none", boxSizing: "border-box" };
const th = { padding: "9px 12px", textAlign: "left", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: WHITE, whiteSpace: "nowrap" };
const td = { padding: "8px 12px", fontSize: "12px", color: "#111827", borderTop: `1px solid ${BORDER}` };
const btn = (bg = DARK_GREEN) => ({ padding: "8px 14px", background: bg, color: WHITE, border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" });
const chip = (bg, color) => ({ fontSize: "10px", fontWeight: 700, background: bg, color, padding: "2px 8px", borderRadius: "10px", whiteSpace: "nowrap" });

function SectionCard({ title, desc, children }) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: "12px", overflow: "hidden", background: WHITE }}>
      <div style={{ padding: "10px 16px", background: LIGHT_GRAY, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: "13px", fontWeight: 800, color: DARK_GREEN }}>{title}</div>
        {desc && <div style={{ fontSize: "11px", color: GRAY, marginTop: "2px" }}>{desc}</div>}
      </div>
      <div style={{ padding: "16px" }}>{children}</div>
    </div>
  );
}

// ── ABOUT ────────────────────────────────────────────────────────────────────
function AboutPanel() {
  const features = [
    ["🗂️", "Catalog Management", "Organize books, journals, and digital media; search by keyword, author, or ISBN."],
    ["👥", "User Management", "Keep member details, borrowing history, and dues; manage staff and member accounts."],
    ["📦", "Inventory Management", "Check availability and get alerts for missing or damaged items."],
    ["🔁", "Book Issue & Return", "Simple lending with due-date reminders and fine tracking for late returns."],
    ["📊", "Report Generation", "Reports on book usage, popular items, and overdue data."],
    ["💿", "Digital Media Integration", "Handle eBooks and audiobooks alongside physical books."],
    ["🏷️", "Barcode & RFID", "Speed up checkouts and returns and improve item security."],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <SectionCard title="What is a Library Management System?">
        <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>
          A Library Management System (LMS) is software that helps libraries manage their tasks more easily. It automates
          organizing books, tracking borrowed items, and managing users — replacing manual work so librarians can handle the
          library and assist users more simply. People can quickly search for books, reserve items, and access digital
          resources, while the system tracks fines and uses barcodes or RFID for efficiency. An LMS is commonly used in
          schools, colleges, public libraries, and companies to make library work faster, easier, and more accurate.
        </p>
      </SectionCard>
      <SectionCard title="Features of this Library Management System">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
          {features.map(([icon, name, desc]) => (
            <div key={name} style={{ border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "12px", borderLeft: `4px solid ${DARK_GREEN}` }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#111827", marginBottom: "4px" }}>{icon} {name}</div>
              <div style={{ fontSize: "11px", color: GRAY, lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="How Does a Library Management System Work?"
        desc="It has three main parts — administration, cataloging, and user interaction.">
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            ["Setting Up the Database", "The library's collection of books and resources is digitized and stored in a computer system. Each item is given a unique identifier, like a barcode, to keep track of it easily."],
            ["Creating User Accounts", "Both library users and staff members have their own accounts to access the system. Different access levels are given based on each person's role in the library."],
            ["Searching and Organizing", "Users can easily search for books or other materials through a simple search feature. The system displays the item's availability, location within the library, and related resources."],
            ["Borrowing and Returning Books", "When a user borrows a book, the system automatically records it under their account. When they return it, the system updates the inventory to reflect the book's availability again."],
            ["Tracking and Reporting", "Librarians can generate reports with detailed data on inventory, checked-out items, and overdue materials — helping them make informed decisions for effective library management."],
          ].map(([title, desc], i) => (
            <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "12px" }}>
              <div style={{ flexShrink: 0, width: "28px", height: "28px", borderRadius: "50%", background: DARK_GREEN, color: WHITE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 800 }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#111827", marginBottom: "2px" }}>{title}</div>
                <div style={{ fontSize: "11px", color: GRAY, lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ── CATALOG (also reused for Digital Media) ──────────────────────────────────
function CatalogPanel({ books, setBooks, digitalOnly = false }) {
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ title: "", author: "", isbn: "", category: "", type: digitalOnly ? "ebook" : "physical", copies: "1" });

  const add = (e) => {
    e.preventDefault();
    if (!form.title.trim()) { showToast("Title is required.", "error"); return; }
    const copies = Math.max(1, parseInt(form.copies, 10) || 1);
    const rec = {
      id: uid(), title: form.title.trim(), author: form.author.trim(), isbn: form.isbn.trim(),
      category: form.category.trim(), type: form.type, copies, available: copies,
      status: "available", barcode: (form.isbn.trim() || "CCA" + Math.floor(Math.random() * 1e9)).replace(/\s/g, ""),
    };
    setBooks(prev => [rec, ...prev]);
    setForm({ title: "", author: "", isbn: "", category: "", type: digitalOnly ? "ebook" : "physical", copies: "1" });
    showToast("Item added to catalog.", "success");
  };

  const remove = (id, title) => showConfirm({
    message: `Remove "${title}" from the catalog?`, confirmLabel: "Remove", icon: "🗑️",
    onConfirm: () => { setBooks(prev => prev.filter(b => b.id !== id)); showToast("Item removed.", "info"); },
  });

  const list = books
    .filter(b => digitalOnly ? (b.type === "ebook" || b.type === "audiobook") : true)
    .filter(b => {
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return [b.title, b.author, b.isbn, b.category].some(v => (v || "").toLowerCase().includes(s));
    });

  const typeChip = (t) => t === "ebook" ? chip("#E0F2FE", "#0369A1")
    : t === "audiobook" ? chip("#FEF3C7", AMBER) : chip("#eaf2d9", DARK_GREEN);

  return (
    <SectionCard title={digitalOnly ? "Digital Media Integration" : "Catalog Management"}
      desc={digitalOnly ? "Manage eBooks and audiobooks." : "Add and search books, journals, and media by keyword, author, or ISBN."}>
      {/* Add form */}
      <form onSubmit={add} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", marginBottom: "14px" }}>
        <input style={input} placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <input style={input} placeholder="Author" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
        <input style={input} placeholder="ISBN" value={form.isbn} onChange={e => setForm(f => ({ ...f, isbn: e.target.value }))} />
        <input style={input} placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
        <select style={input} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          <option value="physical">Physical</option>
          <option value="ebook">eBook</option>
          <option value="audiobook">Audiobook</option>
        </select>
        <input style={input} type="number" min="1" placeholder="Copies" value={form.copies} onChange={e => setForm(f => ({ ...f, copies: e.target.value }))} />
        <button type="submit" style={btn()}>+ Add</button>
      </form>

      {/* Search */}
      <input style={{ ...input, width: "100%", maxWidth: "340px", marginBottom: "12px" }} placeholder="Search title, author, ISBN, category…" value={q} onChange={e => setQ(e.target.value)} />

      {/* Table */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: DARK_GREEN }}>
            <th style={th}>Title</th><th style={th}>Author</th><th style={th}>ISBN</th><th style={th}>Category</th>
            <th style={th}>Type</th><th style={{ ...th, textAlign: "center" }}>Avail / Copies</th><th style={{ ...th, textAlign: "right" }}>Action</th>
          </tr></thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: GRAY, padding: "24px" }}>No items yet.</td></tr>
            ) : list.map((b, i) => (
              <tr key={b.id} style={{ background: i % 2 ? LIGHT_GRAY : WHITE }}>
                <td style={{ ...td, fontWeight: 600 }}>{b.title}</td>
                <td style={td}>{b.author || "—"}</td>
                <td style={{ ...td, fontFamily: "monospace", color: BLUE }}>{b.isbn || "—"}</td>
                <td style={td}>{b.category || "—"}</td>
                <td style={td}><span style={typeChip(b.type)}>{b.type}</span></td>
                <td style={{ ...td, textAlign: "center", fontWeight: 700, color: b.available > 0 ? DARK_GREEN : RED }}>{b.available} / {b.copies}</td>
                <td style={{ ...td, textAlign: "right" }}>
                  <button onClick={() => remove(b.id, b.title)} style={{ padding: "4px 10px", background: "none", border: `1px solid ${BORDER}`, borderRadius: "5px", fontSize: "11px", color: RED, cursor: "pointer" }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ margin: "8px 0 0", fontSize: "11px", color: GRAY }}>{list.length} item(s)</p>
    </SectionCard>
  );
}

// ── MEMBERS ──────────────────────────────────────────────────────────────────
// Students are fetched from the Student List, Faculty from the Faculty Hub —
// neither can be added here. Only Guests are added/managed manually.
function MembersPanel({ students, faculty, guests, setGuests, allMembers, loans }) {
  const [type, setType] = useState("Student"); // Student | Faculty | Guest
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", memberId: "" });

  const addGuest = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast("Name is required.", "error"); return; }
    setGuests(prev => [{ id: uid(), name: form.name.trim(), memberId: form.memberId.trim() || "G-" + Math.floor(Math.random() * 100000), joined: today() }, ...prev]);
    setForm({ name: "", memberId: "" });
    showToast("Guest added.", "success");
  };
  const removeGuest = (id, name) => showConfirm({
    message: `Remove guest "${name}"?`, confirmLabel: "Remove", icon: "🗑️",
    onConfirm: () => { setGuests(prev => prev.filter(g => g.id !== id)); showToast("Guest removed.", "info"); },
  });

  const statsFor = (memberKey) => {
    const my = loans.filter(l => l.memberId === memberKey);
    return { total: my.length, active: my.filter(l => !l.returnDate).length, dues: my.reduce((s, l) => s + (l.fine || 0), 0) };
  };

  // Rows depend on the selected type, drawn from the unified pool.
  const rows = allMembers.filter(m => m.type === type)
    .filter(m => !q.trim() || [m.name, m.memberId].some(v => (v || "").toLowerCase().includes(q.toLowerCase())));

  const source = type === "Student" ? "Student List" : type === "Faculty" ? "Faculty Hub" : "manual entry";

  return (
    <SectionCard title="User / Member Management" desc="Students come from the Student List and Faculty from the Faculty Hub. Only guests are added here.">
      {/* Type segmented control */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
        {["Student", "Faculty", "Guest"].map(t => (
          <button key={t} type="button" onClick={() => { setType(t); setQ(""); }}
            style={{ padding: "7px 16px", borderRadius: "8px", border: `1px solid ${type === t ? DARK_GREEN : BORDER}`, background: type === t ? DARK_GREEN : WHITE, color: type === t ? WHITE : "#374151", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Guest add form — only for Guest */}
      {type === "Guest" && (
        <form onSubmit={addGuest} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px", marginBottom: "14px" }}>
          <input style={input} placeholder="Full name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input style={input} placeholder="Guest ID (optional)" value={form.memberId} onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))} />
          <button type="submit" style={btn()}>+ Add Member</button>
        </form>
      )}

      <input style={{ ...input, width: "100%", maxWidth: "340px", marginBottom: "12px" }} placeholder={`Search ${type.toLowerCase()}s…`} value={q} onChange={e => setQ(e.target.value)} />

      <div style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: DARK_GREEN }}>
            <th style={th}>{type === "Student" ? "Student ID" : type === "Faculty" ? "ID No." : "Guest ID"}</th>
            <th style={th}>Name</th><th style={th}>Type</th>
            <th style={{ ...th, textAlign: "center" }}>Borrowed</th><th style={{ ...th, textAlign: "center" }}>Active</th><th style={{ ...th, textAlign: "center" }}>Dues</th>
            {type === "Guest" && <th style={{ ...th, textAlign: "right" }}>Action</th>}
          </tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={type === "Guest" ? 7 : 6} style={{ ...td, textAlign: "center", color: GRAY, padding: "24px" }}>
                {type === "Guest" ? "No guests yet — add one above." : `No ${type.toLowerCase()}s found in the ${source}.`}
              </td></tr>
            ) : rows.map((m, i) => {
              const s = statsFor(m.id);
              return (
                <tr key={m.id} style={{ background: i % 2 ? LIGHT_GRAY : WHITE }}>
                  <td style={{ ...td, fontFamily: "monospace", color: BLUE }}>{m.memberId}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{m.name}</td>
                  <td style={td}><span style={chip("#eef2ff", "#4338CA")}>{m.type}</span></td>
                  <td style={{ ...td, textAlign: "center" }}>{s.total}</td>
                  <td style={{ ...td, textAlign: "center", fontWeight: 700, color: s.active ? AMBER : GRAY }}>{s.active}</td>
                  <td style={{ ...td, textAlign: "center", fontWeight: 700, color: s.dues ? RED : GRAY }}>₱{s.dues}</td>
                  {type === "Guest" && (
                    <td style={{ ...td, textAlign: "right" }}>
                      <button onClick={() => removeGuest(m.id, m.name)} style={{ padding: "4px 10px", background: "none", border: `1px solid ${BORDER}`, borderRadius: "5px", fontSize: "11px", color: RED, cursor: "pointer" }}>Delete</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ margin: "8px 0 0", fontSize: "11px", color: GRAY }}>{rows.length} {type.toLowerCase()}(s){type !== "Guest" ? ` · fetched from ${source}` : ""}</p>
    </SectionCard>
  );
}

// ── INVENTORY ────────────────────────────────────────────────────────────────
function InventoryPanel({ books, setBooks }) {
  const setStatus = (id, status) => setBooks(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  const alerts = books.filter(b => b.status !== "available" || b.available === 0);
  const statusChip = (s) => s === "missing" ? chip("#FEE2E2", RED) : s === "damaged" ? chip("#FEF3C7", AMBER) : chip("#eaf2d9", DARK_GREEN);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {alerts.length > 0 && (
        <div style={{ border: `1px solid #FCA5A5`, background: "#FEF2F2", borderRadius: "10px", padding: "12px 16px" }}>
          <div style={{ fontSize: "12px", fontWeight: 800, color: RED, marginBottom: "4px" }}>⚠️ {alerts.length} item(s) need attention</div>
          <div style={{ fontSize: "11px", color: "#7F1D1D" }}>{alerts.map(a => a.title).join(", ")}</div>
        </div>
      )}
      <SectionCard title="Inventory Management" desc="Check availability and flag missing or damaged items.">
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: DARK_GREEN }}>
              <th style={th}>Title</th><th style={th}>ISBN</th><th style={{ ...th, textAlign: "center" }}>Available</th>
              <th style={{ ...th, textAlign: "center" }}>Copies</th><th style={{ ...th, textAlign: "center" }}>Status</th><th style={{ ...th, textAlign: "right" }}>Flag</th>
            </tr></thead>
            <tbody>
              {books.length === 0 ? (
                <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: GRAY, padding: "24px" }}>No items in inventory.</td></tr>
              ) : books.map((b, i) => (
                <tr key={b.id} style={{ background: i % 2 ? LIGHT_GRAY : WHITE }}>
                  <td style={{ ...td, fontWeight: 600 }}>{b.title}</td>
                  <td style={{ ...td, fontFamily: "monospace", color: BLUE }}>{b.isbn || "—"}</td>
                  <td style={{ ...td, textAlign: "center", fontWeight: 700, color: b.available > 0 ? DARK_GREEN : RED }}>{b.available}</td>
                  <td style={{ ...td, textAlign: "center" }}>{b.copies}</td>
                  <td style={{ ...td, textAlign: "center" }}><span style={statusChip(b.status)}>{b.status}</span></td>
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                    <select value={b.status} onChange={e => setStatus(b.id, e.target.value)} style={{ ...input, padding: "4px 8px", fontSize: "11px" }}>
                      <option value="available">Available</option>
                      <option value="missing">Missing</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

// ── CIRCULATION (Issue & Return) ─────────────────────────────────────────────
function CirculationPanel({ books, setBooks, members, loans, setLoans }) {
  const [bookId, setBookId] = useState("");
  const [mType, setMType]   = useState(""); // "" | Student | Faculty | Guest
  const [fCourse, setFCourse]   = useState("");
  const [fYear, setFYear]       = useState("");
  const [fSection, setFSection] = useState("");
  const [memberId, setMemberId] = useState("");

  // Members of the chosen type
  const typed = members.filter(m => m.type === mType);
  // Cascading option lists (Student only)
  const courses  = [...new Set(typed.map(m => m.course).filter(Boolean))].sort();
  const years    = [...new Set(typed.filter(m => !fCourse || m.course === fCourse).map(m => m.year_level).filter(Boolean))].sort();
  const sections = [...new Set(typed.filter(m => (!fCourse || m.course === fCourse) && (!fYear || m.year_level === fYear)).map(m => m.section).filter(Boolean))].sort();
  const memberOptions = typed.filter(m => mType !== "Student"
    || ((!fCourse || m.course === fCourse) && (!fYear || m.year_level === fYear) && (!fSection || m.section === fSection)));

  const resetMember = () => { setMemberId(""); };
  const changeType = (t) => { setMType(t); setFCourse(""); setFYear(""); setFSection(""); setMemberId(""); };

  const issue = () => {
    if (!bookId || !memberId) { showToast("Pick a book and a member.", "error"); return; }
    const book = books.find(b => b.id === bookId);
    if (!book || book.available <= 0) { showToast("No available copies.", "error"); return; }
    const issueDate = today();
    setLoans(prev => [{ id: uid(), bookId, memberId, issueDate, dueDate: addDays(issueDate, LOAN_DAYS), returnDate: null, fine: 0 }, ...prev]);
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, available: b.available - 1 } : b));
    setBookId(""); setMemberId(""); setFCourse(""); setFYear(""); setFSection("");
    showToast("Book issued.", "success");
  };

  const doReturn = (loan) => {
    const late = Math.max(0, daysBetween(loan.dueDate, today()));
    const fine = late * FINE_PER_DAY;
    setLoans(prev => prev.map(l => l.id === loan.id ? { ...l, returnDate: today(), fine } : l));
    setBooks(prev => prev.map(b => b.id === loan.bookId ? { ...b, available: Math.min(b.copies, b.available + 1) } : b));
    showToast(fine > 0 ? `Returned. Late fine ₱${fine}.` : "Returned on time.", fine > 0 ? "info" : "success");
  };

  const nameOf = (id) => members.find(m => m.id === id)?.name || "—";
  const titleOf = (id) => books.find(b => b.id === id)?.title || "—";
  const active = loans.filter(l => !l.returnDate);

  const overdueDays = (l) => Math.max(0, daysBetween(l.dueDate, today()));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <SectionCard title="Issue a Book" desc={`Loan period ${LOAN_DAYS} days · late fine ₱${FINE_PER_DAY}/day.`}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {/* 1 — Book */}
          <select style={{ ...input, flex: "1 1 180px" }} value={bookId} onChange={e => setBookId(e.target.value)}>
            <option value="">— Select book —</option>
            {books.filter(b => b.available > 0 && b.status === "available").map(b => <option key={b.id} value={b.id}>{b.title} ({b.available} left)</option>)}
          </select>

          {/* 2 — Member type */}
          <select style={{ ...input, flex: "1 1 130px" }} value={mType} onChange={e => changeType(e.target.value)}>
            <option value="">— Select type —</option>
            <option value="Student">Student</option>
            <option value="Faculty">Faculty</option>
            <option value="Guest">Guest</option>
          </select>

          {/* 3+ — Student cascade: Course → Year Level → Section */}
          {mType === "Student" && (
            <>
              <select style={{ ...input, flex: "1 1 150px" }} value={fCourse} onChange={e => { setFCourse(e.target.value); setFYear(""); setFSection(""); resetMember(); }}>
                <option value="">— Course —</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select style={{ ...input, flex: "1 1 130px" }} value={fYear} onChange={e => { setFYear(e.target.value); setFSection(""); resetMember(); }}>
                <option value="">— Year Level —</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select style={{ ...input, flex: "1 1 130px" }} value={fSection} onChange={e => { setFSection(e.target.value); resetMember(); }}>
                <option value="">— Section —</option>
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </>
          )}

          {/* Final — member (person) */}
          <select style={{ ...input, flex: "1 1 180px" }} value={memberId} onChange={e => setMemberId(e.target.value)} disabled={!mType}>
            <option value="">— Select {mType ? mType.toLowerCase() : "member"} —</option>
            {memberOptions.map(m => <option key={m.id} value={m.id}>{m.name} ({m.memberId})</option>)}
          </select>

          <button onClick={issue} style={btn()}>Issue</button>
        </div>
      </SectionCard>

      <SectionCard title="Active Loans" desc="Currently borrowed items with due dates.">
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: DARK_GREEN }}>
              <th style={th}>Book</th><th style={th}>Member</th><th style={th}>Issued</th><th style={th}>Due</th>
              <th style={{ ...th, textAlign: "center" }}>Status</th><th style={{ ...th, textAlign: "right" }}>Action</th>
            </tr></thead>
            <tbody>
              {active.length === 0 ? (
                <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: GRAY, padding: "24px" }}>No active loans.</td></tr>
              ) : active.map((l, i) => {
                const od = overdueDays(l);
                return (
                  <tr key={l.id} style={{ background: i % 2 ? LIGHT_GRAY : WHITE }}>
                    <td style={{ ...td, fontWeight: 600 }}>{titleOf(l.bookId)}</td>
                    <td style={td}>{nameOf(l.memberId)}</td>
                    <td style={td}>{l.issueDate}</td>
                    <td style={td}>{l.dueDate}</td>
                    <td style={{ ...td, textAlign: "center" }}>
                      {od > 0 ? <span style={chip("#FEE2E2", RED)}>Overdue {od}d · ₱{od * FINE_PER_DAY}</span> : <span style={chip("#eaf2d9", DARK_GREEN)}>On time</span>}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <button onClick={() => doReturn(l)} style={btn(BLUE)}>Return</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

// ── ACQUISITIONS (New Book Acquisition) ──────────────────────────────────────
function AcquisitionsPanel({ acqs, setAcqs, setBooks }) {
  const [form, setForm] = useState({ title: "", author: "", supplier: "", cost: "", quantity: "1", status: "Requested" });

  const add = (e) => {
    e.preventDefault();
    if (!form.title.trim()) { showToast("Title is required.", "error"); return; }
    setAcqs(prev => [{
      id: uid(), title: form.title.trim(), author: form.author.trim(), supplier: form.supplier.trim(),
      cost: parseFloat(form.cost) || 0, quantity: Math.max(1, parseInt(form.quantity, 10) || 1),
      status: form.status, date: today(), received: false,
    }, ...prev]);
    setForm({ title: "", author: "", supplier: "", cost: "", quantity: "1", status: "Requested" });
    showToast("Acquisition recorded.", "success");
  };

  const setStatus = (id, status) => setAcqs(prev => prev.map(a => a.id === id ? { ...a, status } : a));

  const receive = (a) => {
    if (a.received) return;
    // Push the acquired item into the catalog
    setBooks(prev => [{
      id: uid(), title: a.title, author: a.author, isbn: "", category: "", type: "physical",
      copies: a.quantity, available: a.quantity, status: "available",
      barcode: "CCA" + Math.floor(Math.random() * 1e9),
    }, ...prev]);
    setAcqs(prev => prev.map(x => x.id === a.id ? { ...x, status: "Received", received: true } : x));
    showToast(`Added "${a.title}" (${a.quantity} copies) to the catalog.`, "success");
  };

  const remove = (id, title) => showConfirm({
    message: `Delete acquisition "${title}"?`, confirmLabel: "Delete", icon: "🗑️",
    onConfirm: () => { setAcqs(prev => prev.filter(a => a.id !== id)); showToast("Acquisition deleted.", "info"); },
  });

  const statusChip = (s) => s === "Received" ? chip("#eaf2d9", DARK_GREEN)
    : s === "Ordered" ? chip("#E0F2FE", "#0369A1") : chip("#FEF3C7", AMBER);

  const totalSpend = acqs.filter(a => a.received).reduce((s, a) => s + (a.cost || 0) * (a.quantity || 1), 0);

  return (
    <SectionCard title="New Book Acquisition" desc="Manage acquiring new books/resources and add received items to the collection.">
      <form onSubmit={add} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", marginBottom: "14px" }}>
        <input style={input} placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <input style={input} placeholder="Author" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
        <input style={input} placeholder="Supplier / Source" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
        <input style={input} type="number" min="0" step="0.01" placeholder="Unit cost ₱" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
        <input style={input} type="number" min="1" placeholder="Qty" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
        <select style={input} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          <option>Requested</option><option>Ordered</option><option>Received</option>
        </select>
        <button type="submit" style={btn()}>+ Record</button>
      </form>

      <div style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: DARK_GREEN }}>
            <th style={th}>Date</th><th style={th}>Title</th><th style={th}>Supplier</th>
            <th style={{ ...th, textAlign: "center" }}>Qty</th><th style={{ ...th, textAlign: "right" }}>Cost</th>
            <th style={{ ...th, textAlign: "center" }}>Status</th><th style={{ ...th, textAlign: "right" }}>Action</th>
          </tr></thead>
          <tbody>
            {acqs.length === 0 ? (
              <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: GRAY, padding: "24px" }}>No acquisitions yet.</td></tr>
            ) : acqs.map((a, i) => (
              <tr key={a.id} style={{ background: i % 2 ? LIGHT_GRAY : WHITE }}>
                <td style={td}>{a.date}</td>
                <td style={{ ...td, fontWeight: 600 }}>{a.title}{a.author ? <span style={{ color: GRAY, fontWeight: 400 }}> — {a.author}</span> : ""}</td>
                <td style={td}>{a.supplier || "—"}</td>
                <td style={{ ...td, textAlign: "center" }}>{a.quantity}</td>
                <td style={{ ...td, textAlign: "right" }}>₱{((a.cost || 0) * (a.quantity || 1)).toLocaleString()}</td>
                <td style={{ ...td, textAlign: "center" }}>
                  {a.received ? <span style={statusChip("Received")}>Received</span> : (
                    <select value={a.status} onChange={e => setStatus(a.id, e.target.value)} style={{ ...input, padding: "3px 6px", fontSize: "11px" }}>
                      <option>Requested</option><option>Ordered</option><option>Received</option>
                    </select>
                  )}
                </td>
                <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                  {!a.received && <button onClick={() => receive(a)} style={{ ...btn(), padding: "4px 10px", fontSize: "11px", marginRight: "6px" }}>Receive</button>}
                  <button onClick={() => remove(a.id, a.title)} style={{ padding: "4px 10px", background: "none", border: `1px solid ${BORDER}`, borderRadius: "5px", fontSize: "11px", color: RED, cursor: "pointer" }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ margin: "8px 0 0", fontSize: "11px", color: GRAY }}>{acqs.length} record(s) · Total received spend: <strong>₱{totalSpend.toLocaleString()}</strong></p>
    </SectionCard>
  );
}

// ── BARCODE / RFID ───────────────────────────────────────────────────────────
function Barcode({ value }) {
  // Deterministic pseudo-barcode: variable-width bars from char codes.
  const bars = [];
  const seed = String(value || "0");
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    bars.push(1 + (c % 3));       // bar width 1-3
    bars.push(1 + ((c >> 2) % 2)); // gap width 1-2
  }
  let x = 0;
  const rects = bars.map((w, i) => {
    const rect = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w * 2} height={46} fill="#111" /> : null;
    x += w * 2;
    return rect;
  });
  return (
    <svg width={x} height={58} style={{ maxWidth: "100%" }}>
      {rects}
      <text x={x / 2} y={56} textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#111">{seed}</text>
    </svg>
  );
}

function BarcodePanel({ books }) {
  const [scan, setScan] = useState("");
  const found = scan.trim() ? books.find(b => (b.barcode || "").toLowerCase() === scan.trim().toLowerCase() || (b.isbn || "").toLowerCase() === scan.trim().toLowerCase()) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <SectionCard title="Barcode / RFID Scanner" desc="Type or scan a barcode/ISBN to look up an item.">
        <input style={{ ...input, width: "100%", maxWidth: "340px" }} placeholder="Scan or enter barcode / ISBN…" value={scan} onChange={e => setScan(e.target.value)} />
        {scan.trim() && (
          <div style={{ marginTop: "12px", fontSize: "12px" }}>
            {found ? (
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "12px", borderLeft: `4px solid ${DARK_GREEN}` }}>
                <div style={{ fontWeight: 800 }}>{found.title}</div>
                <div style={{ color: GRAY }}>{found.author || "—"} · {found.category || "—"}</div>
                <div style={{ marginTop: "4px", color: found.available > 0 ? DARK_GREEN : RED, fontWeight: 700 }}>{found.available} of {found.copies} available · {found.status}</div>
              </div>
            ) : <span style={{ color: RED }}>No item matches that code.</span>}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Item Barcodes" desc="Auto-generated barcode for each catalog item.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
          {books.length === 0 ? <span style={{ fontSize: "12px", color: GRAY }}>No items yet.</span> :
            books.map(b => (
              <div key={b.id} style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.title}</div>
                <Barcode value={b.barcode || b.isbn || b.id} />
              </div>
            ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ── REPORTS ──────────────────────────────────────────────────────────────────
function ReportsPanel({ books, members, loans }) {
  const stats = useMemo(() => {
    const totalCopies = books.reduce((s, b) => s + (b.copies || 0), 0);
    const borrowed = loans.filter(l => !l.returnDate).length;
    const overdue = loans.filter(l => !l.returnDate && daysBetween(l.dueDate, today()) > 0);
    const finesOutstanding = overdue.reduce((s, l) => s + Math.max(0, daysBetween(l.dueDate, today())) * FINE_PER_DAY, 0);
    const finesCollected = loans.filter(l => l.returnDate).reduce((s, l) => s + (l.fine || 0), 0);
    const counts = {};
    loans.forEach(l => { counts[l.bookId] = (counts[l.bookId] || 0) + 1; });
    const popular = Object.entries(counts).map(([id, n]) => ({ title: books.find(b => b.id === id)?.title || "—", n }))
      .sort((a, b) => b.n - a.n).slice(0, 5);
    const damaged = books.filter(b => b.status === "damaged").length;
    const missing = books.filter(b => b.status === "missing").length;
    const availableCopies = books.reduce((s, b) => s + (b.available || 0), 0);
    const healthPct = totalCopies > 0 ? Math.round((availableCopies / totalCopies) * 100) : 0;
    return { totalTitles: books.length, totalCopies, members: members.length, borrowed, overdue, finesOutstanding, finesCollected, popular, damaged, missing, healthPct };
  }, [books, members, loans]);

  const Metric = ({ label, value, color }) => (
    <div style={{ border: `1px solid ${BORDER}`, borderLeft: `4px solid ${color}`, borderRadius: "10px", padding: "12px 14px" }}>
      <div style={{ fontSize: "10px", fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 800, color: "#111827" }}>{value}</div>
    </div>
  );

  const nameOf = (id) => members.find(m => m.id === id)?.name || "—";
  const titleOf = (id) => books.find(b => b.id === id)?.title || "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
        <Metric label="Titles" value={stats.totalTitles} color={DARK_GREEN} />
        <Metric label="Total Copies" value={stats.totalCopies} color={BLUE} />
        <Metric label="Members" value={stats.members} color="#6366F1" />
        <Metric label="Currently Borrowed" value={stats.borrowed} color={AMBER} />
        <Metric label="Overdue" value={stats.overdue.length} color={RED} />
        <Metric label="Fines Outstanding" value={`₱${stats.finesOutstanding}`} color={RED} />
        <Metric label="Fines Collected" value={`₱${stats.finesCollected}`} color={DARK_GREEN} />
      </div>

      <SectionCard title="Collection Health" desc="Overall status and condition of the collection.">
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: GRAY, marginBottom: "4px" }}>
              <span>Copies available now</span><span style={{ fontWeight: 700, color: DARK_GREEN }}>{stats.healthPct}%</span>
            </div>
            <div style={{ height: "10px", background: BORDER, borderRadius: "6px", overflow: "hidden" }}>
              <div style={{ width: `${stats.healthPct}%`, height: "100%", background: stats.healthPct >= 60 ? DARK_GREEN : stats.healthPct >= 30 ? AMBER : RED }} />
            </div>
          </div>
          <span style={chip("#FEF3C7", AMBER)}>Damaged: {stats.damaged}</span>
          <span style={chip("#FEE2E2", RED)}>Missing: {stats.missing}</span>
        </div>
      </SectionCard>

      <SectionCard title="Most Popular Items" desc="Ranked by number of times borrowed.">
        {stats.popular.length === 0 ? <span style={{ fontSize: "12px", color: GRAY }}>No borrowing activity yet.</span> : (
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: DARK_GREEN }}><th style={th}>#</th><th style={th}>Title</th><th style={{ ...th, textAlign: "center" }}>Times Borrowed</th></tr></thead>
              <tbody>
                {stats.popular.map((p, i) => (
                  <tr key={i} style={{ background: i % 2 ? LIGHT_GRAY : WHITE }}>
                    <td style={{ ...td, width: "40px" }}>{i + 1}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{p.title}</td>
                    <td style={{ ...td, textAlign: "center", fontWeight: 700, color: DARK_GREEN }}>{p.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Overdue Report" desc="Items past their due date.">
        {stats.overdue.length === 0 ? <span style={{ fontSize: "12px", color: GRAY }}>No overdue items.</span> : (
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: DARK_GREEN }}>
                <th style={th}>Book</th><th style={th}>Member</th><th style={th}>Due</th><th style={{ ...th, textAlign: "center" }}>Days Late</th><th style={{ ...th, textAlign: "center" }}>Fine</th>
              </tr></thead>
              <tbody>
                {stats.overdue.map((l, i) => {
                  const days = Math.max(0, daysBetween(l.dueDate, today()));
                  return (
                    <tr key={l.id} style={{ background: i % 2 ? LIGHT_GRAY : WHITE }}>
                      <td style={{ ...td, fontWeight: 600 }}>{titleOf(l.bookId)}</td>
                      <td style={td}>{nameOf(l.memberId)}</td>
                      <td style={td}>{l.dueDate}</td>
                      <td style={{ ...td, textAlign: "center", fontWeight: 700, color: RED }}>{days}</td>
                      <td style={{ ...td, textAlign: "center", fontWeight: 700, color: RED }}>₱{days * FINE_PER_DAY}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
