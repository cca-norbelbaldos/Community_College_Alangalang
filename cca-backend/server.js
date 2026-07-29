import "dotenv/config";
import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin/tools (no Origin header), plus localhost and any
      // private-LAN address (192.168.x, 10.x, 172.16–31.x) on ANY port. This
      // means the app works from any machine on the network without editing
      // this list each time an IP or port changes.
      if (!origin) return callback(null, true);
      const ok = /^https?:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?$/i.test(origin);
      return ok ? callback(null, true) : callback(new Error(`CORS: origin not allowed: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "cca_portal",
  waitForConnections: true,
  connectionLimit: 10,
});

// ─── SCHEMA NOTES ─────────────────────────────────────────────────────────
// erd_login            (id, username, password, created_at)
// erd_user_type        (id, user_type)            -- e.g. administrator/faculty/student/registrar
// erd_address          (id, barangay, city_municipality, province)
// erd_users            (id, login_id -> erd_login, user_type_id -> erd_user_type,
//                        address_id -> erd_address, first_name, middle_name, last_name,
//                        suffix, gender, email, id_no, designation,
//                        psa_livebirth, permissions, created_at, is_active, profile_picture)
// erd_student          (id, users_id -> erd_users, student_number, course_id -> erd_course,
//                        year_level, section, created_at)
// erd_course           (id, course)
// erd_subjects         (id, subject, credits, subject_code, course_id -> erd_course, semester)
// erd_subject_load     (id, user_id -> erd_users, subject_id -> erd_subjects,
//                        year_level, section, sched, room)   -- faculty teaching assignments
// erd_grades           (id, student_id -> erd_student, subject_id -> erd_subjects, grade, remarks,
//                        semester, year_start, year_end, created_at)
// erd_announcements    (id, title, body, department, image, posted_date, posted_by)
// erd_system_config    (key, value, updated_at)    -- single key/value pair store, not flat columns
// erd_user_roles       (id, users_id -> erd_users, user_type_id -> erd_user_type)

// ─── SYSTEM OVERVIEW TELEMETRY & METRICS ─────────────────────────────────────
app.get("/api/erd/dashboard-metrics", async (req, res) => {
  try {
    const [[{ sCount }]] = await pool.query("SELECT COUNT(*) as sCount FROM erd_student");
    const [[{ fCount }]] = await pool.query(
      `SELECT COUNT(*) as fCount FROM erd_users u
       JOIN erd_user_type ut ON u.user_type_id = ut.id
       WHERE ut.user_type = 'faculty'`
    );
    const [[{ uCount }]] = await pool.query("SELECT COUNT(*) as uCount FROM erd_users");
    const [[{ aCount }]] = await pool.query("SELECT COUNT(*) as aCount FROM erd_announcements");

    res.json([
      { label: "Total Students", value: sCount, desc: "Enrolled active scholars", icon: "🎓", color: "#2E7D32" },
      { label: "Faculty Members", value: fCount, desc: "Assigned instructors", icon: "👩‍🏫", color: "#F5A800" },
      { label: "System Accounts", value: uCount, desc: "Security access tokens", icon: "👥", color: "#1E88E5" },
      { label: "Bulletins Posted", value: aCount, desc: "Active campus announcements", icon: "📢", color: "#DC2626" }
    ]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to gather telemetry parameters." });
  }
});

// ─── SYSTEM PRIVILEGES VISIBILITY CONFIGURATIONS ─────────────────────────────
app.get("/api/erd/system-config", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT `key`, `value` FROM erd_system_config WHERE `key` IN ('roleVisibility','featureFlags')"
    );
    const map = {};
    for (const r of rows) {
      try {
        map[r.key] = JSON.parse(r.value);
      } catch {
        map[r.key] = null;
      }
    }
    res.json({
      roleVisibility: map.roleVisibility || { faculty_announcements: 1, student_announcements: 1 },
      featureFlags: map.featureFlags || {
        feat_overview: 1, feat_student_list: 1, feat_faculty_mgmt: 1, feat_registrar_tools: 1
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load active layout flag profiles." });
  }
});

app.put("/api/erd/system-config", async (req, res) => {
  const { roleVisibility, featureFlags } = req.body;
  try {
    await pool.query(
      "INSERT INTO erd_system_config (`key`, `value`) VALUES ('roleVisibility', ?) " +
      "ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [JSON.stringify(roleVisibility || {})]
    );
    await pool.query(
      "INSERT INTO erd_system_config (`key`, `value`) VALUES ('featureFlags', ?) " +
      "ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [JSON.stringify(featureFlags || {})]
    );
    res.json({ message: "System feature policies committed successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save system structural access policies." });
  }
});

// ─── MAINTENANCE MODE ────────────────────────────────────────────────────────
// When ON, every non-administrator is shown a maintenance screen instead of the app.
app.get("/api/erd/maintenance", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT `value` FROM erd_system_config WHERE `key`='maintenance' LIMIT 1");
    let on = 0;
    if (rows.length) { try { on = JSON.parse(rows[0].value)?.on ? 1 : 0; } catch { on = 0; } }
    res.json({ on });
  } catch (err) {
    console.error(err);
    res.status(500).json({ on: 0 });
  }
});

app.put("/api/erd/maintenance", async (req, res) => {
  const on = req.body?.on ? 1 : 0;
  try {
    await pool.query(
      "INSERT INTO erd_system_config (`key`, `value`) VALUES ('maintenance', ?) " +
      "ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [JSON.stringify({ on })]
    );
    res.json({ on });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update maintenance mode." });
  }
});

// ─── STUDENT ATTENDANCE ──────────────────────────────────────────────────────
// Faculty submit attendance per class + date from their own account; the
// administrator sees the composed records from every instructor.
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erd_attendance (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        faculty_id     INT NULL,
        subject_id     INT NULL,
        subject_code   VARCHAR(50) NULL,
        subject_title  VARCHAR(255) NULL,
        course         VARCHAR(255) NULL,
        year_level     VARCHAR(50) NULL,
        section        VARCHAR(50) NULL,
        att_date       DATE NOT NULL,
        student_id     INT NOT NULL,
        student_number VARCHAR(50) NULL,
        student_name   VARCHAR(255) NULL,
        status         VARCHAR(2) NOT NULL,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_att (subject_id, section, att_date, student_id)
      )
    `);
  } catch (err) { console.error("erd_attendance table init error:", err); }
})();

// Faculty submits attendance for one class + date (replaces prior marks for it).
app.post("/api/erd/attendance", async (req, res) => {
  const { faculty_id, class: cls = {}, date, records = [] } = req.body || {};
  if (!date || !cls.subject_id) return res.status(400).json({ message: "date and class.subject_id are required." });
  try {
    // Clear existing marks for this class + date, then insert the submitted set.
    await pool.query(
      "DELETE FROM erd_attendance WHERE subject_id = ? AND att_date = ? AND ((section IS NULL AND ? IS NULL) OR section = ?)",
      [cls.subject_id, date, cls.section || null, cls.section || null]
    );
    for (const r of records) {
      if (!r.student_id || !r.status) continue;
      await pool.query(
        `INSERT INTO erd_attendance
           (faculty_id, subject_id, subject_code, subject_title, course, year_level, section, att_date, student_id, student_number, student_name, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [faculty_id ?? null, cls.subject_id, cls.subject_code ?? null, cls.subject_title ?? null, cls.course ?? null,
         cls.year_level ?? null, cls.section ?? null, date, r.student_id, r.student_number ?? null, r.student_name ?? null, r.status]
      );
    }
    res.json({ saved: records.length });
  } catch (err) {
    console.error("POST /api/erd/attendance failed:", err);
    res.status(500).json({ message: "Failed to save attendance." });
  }
});

// Read attendance — administrator/college-admin composed view (optional filters).
app.get("/api/erd/attendance", async (req, res) => {
  const { date, faculty_id } = req.query;
  try {
    const [rows] = await pool.query(
      `SELECT a.*, TRIM(CONCAT(IFNULL(u.first_name,''), ' ', IFNULL(u.last_name,''))) AS faculty_name
       FROM erd_attendance a
       LEFT JOIN erd_users u ON u.id = a.faculty_id
       WHERE (? IS NULL OR a.att_date = ?)
         AND (? IS NULL OR a.faculty_id = ?)
       ORDER BY a.att_date DESC, faculty_name ASC, a.subject_code ASC, a.student_name ASC`,
      [date || null, date || null, faculty_id || null, faculty_id || null]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/erd/attendance failed:", err);
    res.status(500).json({ message: "Failed to fetch attendance." });
  }
});

// ─── GRADE LOCK ──────────────────────────────────────────────────────────────
// When a faculty submits, the grades for that course+section+year are LOCKED
// (faculty can no longer edit). Only an administrator can unlock.
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erd_grade_lock (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        course     VARCHAR(255) NULL,
        section    VARCHAR(50)  NULL,
        year_level VARCHAR(50)  NULL,
        locked     TINYINT(1) NOT NULL DEFAULT 1,
        locked_by  INT NULL,
        locked_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_lock (course, section, year_level)
      )
    `);
  } catch (err) { console.error("erd_grade_lock table init error:", err); }
})();

// Status for one selection, or (no query) all active locks for the admin view.
app.get("/api/erd/grade-lock", async (req, res) => {
  const { course, section, year_level } = req.query;
  try {
    if (course || section || year_level) {
      const [rows] = await pool.query(
        "SELECT locked FROM erd_grade_lock WHERE course <=> ? AND section <=> ? AND year_level <=> ? LIMIT 1",
        [course || null, section || null, year_level || null]
      );
      return res.json({ locked: rows.length ? (rows[0].locked ? 1 : 0) : 0 });
    }
    const [rows] = await pool.query("SELECT * FROM erd_grade_lock WHERE locked = 1 ORDER BY locked_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("GET /api/erd/grade-lock failed:", err);
    res.status(500).json({ locked: 0 });
  }
});

// Faculty submits → lock.
app.post("/api/erd/grade-lock", async (req, res) => {
  const { course, section, year_level, faculty_id } = req.body || {};
  try {
    await pool.query(
      `INSERT INTO erd_grade_lock (course, section, year_level, locked, locked_by)
       VALUES (?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE locked = 1, locked_by = VALUES(locked_by), locked_at = CURRENT_TIMESTAMP`,
      [course || null, section || null, year_level || null, faculty_id ?? null]
    );
    res.json({ locked: 1 });
  } catch (err) {
    console.error("POST /api/erd/grade-lock failed:", err);
    res.status(500).json({ message: "Failed to lock grades." });
  }
});

// Administrator unlocks.
app.post("/api/erd/grade-lock/unlock", async (req, res) => {
  const { course, section, year_level } = req.body || {};
  try {
    await pool.query(
      "UPDATE erd_grade_lock SET locked = 0 WHERE course <=> ? AND section <=> ? AND year_level <=> ?",
      [course || null, section || null, year_level || null]
    );
    res.json({ locked: 0 });
  } catch (err) {
    console.error("POST /api/erd/grade-lock/unlock failed:", err);
    res.status(500).json({ message: "Failed to unlock grades." });
  }
});

// ─── AUTHENTICATION GATEWAY ──────────────────────────────────────────────────
app.post("/api/erd/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.query(
      `SELECT u.id, l.username, ut.user_type AS role, u.is_active,
              u.first_name, u.middle_name, u.last_name
       FROM erd_login l
       JOIN erd_users u ON u.login_id = l.id
       JOIN erd_user_type ut ON u.user_type_id = ut.id
       WHERE l.username = ? AND l.password = ?`,
      [username, password]
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid institutional security identifier or pass-string." });
    }
    if (!rows[0].is_active) {
      return res.status(403).json({ message: "This security access token is currently suspended." });
    }
    res.json({ id: rows[0].id, username: rows[0].username, role: rows[0].role, status: rows[0].is_active ? "Active" : "Suspended",
      first_name: rows[0].first_name || "", middle_name: rows[0].middle_name || "", last_name: rows[0].last_name || "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Authentication gateway communication exception." });
  }
});

// ─── MULTI-ROLE SUPPORT HELPER ───────────────────────────────────────────────
let userRolesTableReady = false;
async function ensureUserRolesTable(conn) {
  if (userRolesTableReady) return;
  await conn.query(`
    CREATE TABLE IF NOT EXISTS erd_user_roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      users_id INT NOT NULL,
      user_type_id INT NOT NULL,
      FOREIGN KEY (users_id) REFERENCES erd_users(id) ON DELETE CASCADE,
      FOREIGN KEY (user_type_id) REFERENCES erd_user_type(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_user_role (users_id, user_type_id)
    )
  `);
  userRolesTableReady = true;
}

// ─── ROLES (erd_user_type) MANAGEMENT ────────────────────────────────────────
// GET  /api/erd/roles          – list all roles
// POST /api/erd/roles          – create a new role
// DELETE /api/erd/roles/:id    – delete any role (administrator has full control)

app.get("/api/erd/roles", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, user_type FROM erd_user_type ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch roles." });
  }
});

app.post("/api/erd/roles", async (req, res) => {
  const { user_type } = req.body;
  if (!user_type || !user_type.trim()) {
    return res.status(400).json({ message: "user_type is required." });
  }
  const cleaned = user_type.trim().toLowerCase().replace(/\s+/g, "_");
  try {
    const [existing] = await pool.query("SELECT id FROM erd_user_type WHERE user_type = ?", [cleaned]);
    if (existing.length > 0) {
      return res.status(400).json({ message: `Role '${cleaned}' already exists.` });
    }
    const [result] = await pool.query("INSERT INTO erd_user_type (user_type) VALUES (?)", [cleaned]);
    res.status(201).json({ id: result.insertId, user_type: cleaned });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create role." });
  }
});

app.delete("/api/erd/roles/:id", async (req, res) => {
  try {
    const [[row]] = await pool.query("SELECT user_type FROM erd_user_type WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).json({ message: "Role not found." });
    // Remove from erd_user_roles first to avoid FK violation
    await pool.query("DELETE FROM erd_user_roles WHERE user_type_id = ?", [req.params.id]);
    await pool.query("DELETE FROM erd_role_permissions WHERE user_type_id = ?", [req.params.id]);
    await pool.query("DELETE FROM erd_user_type WHERE id = ?", [req.params.id]);
    res.json({ message: `Role '${row.user_type}' deleted successfully.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete role." });
  }
});

// ─── DESIGNATIONS (erd_designation) MANAGEMENT ───────────────────────────────
// Organizational positions/titles assignable to users (Admin Settings ->
// Designation screen). erd_users.designation stores the designation NAME as
// free text, so the Add/Edit User dropdown is populated from this list to
// keep that value constrained to a known designation.
let designationTableReady = false;
async function ensureDesignationTable(conn) {
  if (designationTableReady) return;
  await conn.query(`
    CREATE TABLE IF NOT EXISTS erd_designation (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  designationTableReady = true;
}

app.get("/api/erd/designations", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await ensureDesignationTable(conn);
    const [rows] = await conn.query("SELECT id, name, description FROM erd_designation ORDER BY name ASC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch designations." });
  } finally {
    conn.release();
  }
});

app.post("/api/erd/designations", async (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "name is required." });
  }
  const cleaned = name.trim();
  const conn = await pool.getConnection();
  try {
    await ensureDesignationTable(conn);
    const [existing] = await conn.query("SELECT id FROM erd_designation WHERE name = ?", [cleaned]);
    if (existing.length > 0) {
      return res.status(400).json({ message: `Designation '${cleaned}' already exists.` });
    }
    const [result] = await conn.query(
      "INSERT INTO erd_designation (name, description) VALUES (?, ?)",
      [cleaned, description || null]
    );
    res.status(201).json({ id: result.insertId, name: cleaned, description: description || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create designation." });
  } finally {
    conn.release();
  }
});

app.put("/api/erd/designations/:id", async (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "name is required." });
  }
  const cleaned = name.trim();
  const conn = await pool.getConnection();
  try {
    await ensureDesignationTable(conn);
    const [[row]] = await conn.query("SELECT id, name FROM erd_designation WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).json({ message: "Designation not found." });

    const [dupe] = await conn.query("SELECT id FROM erd_designation WHERE name = ? AND id != ?", [cleaned, req.params.id]);
    if (dupe.length > 0) {
      return res.status(400).json({ message: `Designation '${cleaned}' already exists.` });
    }

    await conn.query("UPDATE erd_designation SET name = ?, description = ? WHERE id = ?", [cleaned, description || null, req.params.id]);

    // Keep existing users' designation text in sync if the name changed.
    if (row.name !== cleaned) {
      await conn.query("UPDATE erd_users SET designation = ? WHERE designation = ?", [cleaned, row.name]);
    }

    res.json({ id: Number(req.params.id), name: cleaned, description: description || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update designation." });
  } finally {
    conn.release();
  }
});

app.delete("/api/erd/designations/:id", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await ensureDesignationTable(conn);
    const [[row]] = await conn.query("SELECT name FROM erd_designation WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).json({ message: "Designation not found." });
    await conn.query("DELETE FROM erd_designation WHERE id = ?", [req.params.id]);
    res.json({ message: `Designation '${row.name}' deleted successfully.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete designation." });
  } finally {
    conn.release();
  }
});

// ─── ROLE → DASHBOARD PERMISSIONS (which nav sections a role can view) ───────
// erd_role_permissions (id, user_type_id -> erd_user_type, feature_key)
// feature_key matches the `featureKey` values used by Dashboard.jsx's MAIN_NAV
// (e.g. "feat_student_list"). Checking a box in Roles Management inserts a row
// here; the Dashboard reads this list per-role to decide what to show in nav.
let rolePermissionsTableReady = false;
async function ensureRolePermissionsTable(conn) {
  if (rolePermissionsTableReady) return;
  await conn.query(`
    CREATE TABLE IF NOT EXISTS erd_role_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_type_id INT NOT NULL,
      feature_key VARCHAR(64) NOT NULL,
      FOREIGN KEY (user_type_id) REFERENCES erd_user_type(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_role_feature (user_type_id, feature_key)
    )
  `);
  rolePermissionsTableReady = true;
}

// GET /api/erd/roles/:id/permissions -> { feature_keys: ["feat_student_list", ...] }
app.get("/api/erd/roles/:id/permissions", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await ensureRolePermissionsTable(conn);
    const [rows] = await conn.query(
      "SELECT feature_key FROM erd_role_permissions WHERE user_type_id = ?",
      [req.params.id]
    );
    res.json({ feature_keys: rows.map(r => r.feature_key) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load permissions for this role." });
  } finally {
    conn.release();
  }
});

// PUT /api/erd/roles/:id/permissions  body: { feature_keys: ["feat_student_list", ...] }
// Replaces the full set of granted dashboard sections for this role.
app.put("/api/erd/roles/:id/permissions", async (req, res) => {
  const { feature_keys } = req.body;
  if (!Array.isArray(feature_keys)) {
    return res.status(400).json({ message: "feature_keys must be an array." });
  }
  const conn = await pool.getConnection();
  try {
    await ensureRolePermissionsTable(conn);
    const [[role]] = await conn.query("SELECT id FROM erd_user_type WHERE id = ?", [req.params.id]);
    if (!role) return res.status(404).json({ message: "Role not found." });

    await conn.beginTransaction();
    await conn.query("DELETE FROM erd_role_permissions WHERE user_type_id = ?", [req.params.id]);
    if (feature_keys.length > 0) {
      const values = feature_keys.map(key => [req.params.id, key]);
      await conn.query(
        "INSERT INTO erd_role_permissions (user_type_id, feature_key) VALUES ?",
        [values]
      );
    }
    await conn.commit();
    res.json({ message: "Permissions updated successfully.", feature_keys });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Failed to save permissions for this role." });
  } finally {
    conn.release();
  }
});

// GET /api/erd/role-permissions -> { faculty: ["feat_student_list"], registrar: [...], ... }
// Bulk lookup keyed by role name (lowercase), used by Dashboard.jsx so it only
// needs one request instead of one per role.
app.get("/api/erd/role-permissions", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await ensureRolePermissionsTable(conn);
    const [rows] = await conn.query(
      `SELECT ut.user_type AS role, rp.feature_key
       FROM erd_role_permissions rp
       JOIN erd_user_type ut ON rp.user_type_id = ut.id`
    );
    const map = {};
    for (const r of rows) {
      const key = r.role.toLowerCase();
      if (!map[key]) map[key] = [];
      map[key].push(r.feature_key);
    }
    res.json(map);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load role permissions map." });
  } finally {
    conn.release();
  }
});

// Ensure image columns are large enough to hold base64 photos/signatures.
// If they are TEXT (64KB), larger images fail to save (leaving the field empty).
(async () => {
  try {
    await pool.query("ALTER TABLE erd_users MODIFY COLUMN profile_picture LONGTEXT NULL");
    await pool.query("ALTER TABLE erd_users MODIFY COLUMN signature LONGTEXT NULL");
    console.log("[INIT] erd_users profile_picture/signature ensured LONGTEXT.");
  } catch (err) {
    console.error("[INIT] erd_users image column widen failed:", err.message);
  }
})();

// ─── USER CREDENTIALS LAYER ──────────────────────────────────────────────────
app.get("/api/erd/users", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await ensureUserRolesTable(conn);

    const [rows] = await conn.query(
      `SELECT u.id, l.username, u.is_active, u.last_seen, u.first_name, u.middle_name, u.last_name,
              u.suffix, u.gender, u.email, u.id_no, u.designation, u.profile_picture, u.signature
       FROM erd_users u
       LEFT JOIN erd_login l ON u.login_id = l.id
       ORDER BY u.last_name ASC, u.first_name ASC`
    );

    const [roleRows] = await conn.query(
      `SELECT ur.users_id, ut.user_type AS role
       FROM erd_user_roles ur
       JOIN erd_user_type ut ON ur.user_type_id = ut.id`
    );

    const rolesByUser = {};
    for (const r of roleRows) {
      if (!rolesByUser[r.users_id]) rolesByUser[r.users_id] = [];
      rolesByUser[r.users_id].push(r.role);
    }

    res.json(rows.map(r => {
      const userRoles = rolesByUser[r.id] || [];
      const primaryRole = userRoles.length > 0 ? userRoles[0].toUpperCase() : "ADMINISTRATOR";

      return {
        id: r.id,
        username: r.username || "",
        first_name: r.first_name || "",
        middle_name: r.middle_name || "", // standard database key mapping
        middlename: r.middle_name || "",  // flat frontend alias mapping
        last_name: r.last_name || "",
        roles: userRoles,
        role: primaryRole,
        status: r.is_active ? "Active" : "Suspended",
        last_seen: r.last_seen,
        suffix: r.suffix || "",
        gender: r.gender || "",
        email: r.email || "",
        id_no: r.id_no || "",
        designation: r.designation || "",
        profile_picture: r.profile_picture || null,
        signature: r.signature || null
      };
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to query security directory accounts." });
  } finally {
    conn.release();
  }
});

// Presence heartbeat — the dashboard pings this every ~20s while open so
// last_seen reflects who is genuinely online right now, not just who has an
// active (non-suspended) account.
app.post("/api/erd/users/:id/heartbeat", async (req, res) => {
  try {
    await pool.query("UPDATE erd_users SET last_seen = NOW() WHERE id = ?", [req.params.id]);
    res.json({ message: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to record presence heartbeat." });
  }
});

app.post("/api/erd/users", async (req, res) => {
  const { 
    username, password, roles, status, 
    first_name, middle_name, middlename, last_name, 
    suffix, gender, email, id_no, designation, profile_picture, signature 
  } = req.body;
  
  const roleList = Array.isArray(roles) && roles.length > 0 ? roles : ["student"];
  const resolvedMiddleName = middle_name || middlename || null;

  const conn = await pool.getConnection();
  try {
    await ensureUserRolesTable(conn);

    const [existing] = await conn.query("SELECT id FROM erd_login WHERE username = ?", [username]);
    if (existing.length > 0) {
      conn.release();
      return res.status(400).json({ message: "Username handle is already allocated." });
    }

    const typeRowsByRole = {};
    for (const role of roleList) {
      const [[typeRow]] = await conn.query("SELECT id FROM erd_user_type WHERE user_type = ?", [role]);
      if (!typeRow) {
        conn.release();
        return res.status(400).json({ message: `Unknown role '${role}'. Add it to erd_user_type first.` });
      }
      typeRowsByRole[role] = typeRow.id;
    }

    await conn.beginTransaction();
    const [loginResult] = await conn.query(
      "INSERT INTO erd_login (username, password) VALUES (?, ?)",
      [username, password]
    );

    const primaryTypeId = typeRowsByRole[roleList[0]];
    const [userResult] = await conn.query(
      `INSERT INTO erd_users (login_id, user_type_id, first_name, middle_name, last_name, suffix, gender, email, id_no, designation, is_active, profile_picture, signature)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        loginResult.insertId, primaryTypeId, 
        first_name || username, resolvedMiddleName, last_name || "", 
        suffix || null, gender || null, email || null, id_no || null, designation || null,
        status !== "Suspended" ? 1 : 0, profile_picture || null, signature || null
      ]
    );

    for (const role of roleList) {
      await conn.query(
        "INSERT INTO erd_user_roles (users_id, user_type_id) VALUES (?, ?)",
        [userResult.insertId, typeRowsByRole[role]]
      );
    }

    await conn.commit();
    res.status(201).json({ message: "Security login node provisioned." });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Failed to provision security credential payload." });
  } finally {
    conn.release();
  }
});

app.put("/api/erd/users/:id", async (req, res) => {
  const { id } = req.params;
  const { 
    username, password, roles, status,
    first_name, middle_name, middlename, last_name, 
    suffix, gender, email, id_no, designation, profile_picture, signature 
  } = req.body;

  const resolvedMiddleName = middle_name || middlename || null;
  
  const conn = await pool.getConnection();
  try {
    await ensureUserRolesTable(conn);
    await conn.beginTransaction();

    const [[userRow]] = await conn.query("SELECT login_id FROM erd_users WHERE id = ?", [id]);
    if (!userRow) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: "User not found." });
    }

    if (password) {
      await conn.query("UPDATE erd_login SET username = ?, password = ? WHERE id = ?", [username, password, userRow.login_id]);
    } else {
      await conn.query("UPDATE erd_login SET username = ? WHERE id = ?", [username, userRow.login_id]);
    }

    if (Array.isArray(roles) && roles.length > 0) {
      const typeIds = [];
      for (const role of roles) {
        const [[typeRow]] = await conn.query("SELECT id FROM erd_user_type WHERE user_type = ?", [role]);
        if (!typeRow) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({ message: `Unknown role '${role}'. Add it to erd_user_type first.` });
        }
        typeIds.push(typeRow.id);
      }

      await conn.query("DELETE FROM erd_user_roles WHERE users_id = ?", [id]);
      for (const typeId of typeIds) {
        await conn.query("INSERT INTO erd_user_roles (users_id, user_type_id) VALUES (?, ?)", [id, typeId]);
      }

      await conn.query("UPDATE erd_users SET user_type_id = ? WHERE id = ?", [typeIds[0], id]);
    }

    // Only update profile_picture if explicitly provided (not null/undefined means user changed it; undefined means not sent = keep existing)
    if (profile_picture !== undefined) {
      await conn.query(
        `UPDATE erd_users SET profile_picture = ? WHERE id = ?`,
        [profile_picture || null, id]
      );
    }
    // Same treatment for the e-signature image — only touch it when explicitly sent.
    if (signature !== undefined) {
      await conn.query(
        `UPDATE erd_users SET signature = ? WHERE id = ?`,
        [signature || null, id]
      );
    }
    await conn.query(
      `UPDATE erd_users 
       SET first_name = ?, middle_name = ?, last_name = ?, 
           suffix = ?, gender = ?, email = ?, id_no = ?, designation = ?, 
           is_active = ? 
       WHERE id = ?`,
      [
        first_name, resolvedMiddleName, last_name, 
        suffix || null, gender || null, email || null, id_no || null, designation || null,
        status !== "Suspended" ? 1 : 0, 
        id
      ]
    );

    await conn.commit();
    res.json({ message: "User credential record safely realigned." });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Failed to process security modification transaction." });
  } finally {
    conn.release();
  }
});

app.delete("/api/erd/users/:id", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[userRow]] = await conn.query("SELECT login_id FROM erd_users WHERE id = ?", [req.params.id]);
    await conn.query("DELETE FROM erd_users WHERE id = ?", [req.params.id]);
    if (userRow) {
      await conn.query("DELETE FROM erd_login WHERE id = ?", [userRow.login_id]);
    }
    await conn.commit();
    res.json({ message: "Security access authorization revoked." });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Failed to delete user directory item." });
  } finally {
    conn.release();
  }
});

// ─── DEPARTMENTS / COURSES SUB-ROUTER ────────────────────────────────────────
app.get("/api/erd/departments", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT course FROM erd_course ORDER BY course ASC");
    res.json(rows.map(r => r.course));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to synchronize academic department categories." });
  }
});


// ─── COURSES CRUD ────────────────────────────────────────────
app.get("/api/erd/courses", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, course FROM erd_course ORDER BY course ASC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch courses." });
  }
});

app.post("/api/erd/courses", async (req, res) => {
  const { course } = req.body;
  if (!course || !course.trim()) {
    return res.status(400).json({ message: "course name is required." });
  }
  try {
    const [existing] = await pool.query("SELECT id FROM erd_course WHERE course = ?", [course.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Course already exists." });
    }
    const [result] = await pool.query("INSERT INTO erd_course (course) VALUES (?)", [course.trim()]);
    res.status(201).json({ id: result.insertId, course: course.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add course." });
  }
});

app.put("/api/erd/courses/:id", async (req, res) => {
  const { course } = req.body;
  if (!course || !course.trim()) return res.status(400).json({ message: "Course name is required." });
  try {
    const [existing] = await pool.query("SELECT id FROM erd_course WHERE course=? AND id!=?", [course.trim(), req.params.id]);
    if (existing.length > 0) return res.status(400).json({ message: "Course name already in use." });
    await pool.query("UPDATE erd_course SET course=? WHERE id=?", [course.trim(), req.params.id]);
    res.json({ id: req.params.id, course: course.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update course." });
  }
});

app.delete("/api/erd/courses/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM erd_course WHERE id = ?", [req.params.id]);
    res.json({ message: "Course deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete course." });
  }
});
// ─── SECTIONS ────────────────────────────────────────────────────────────────
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erd_section (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) { console.error("erd_section table init error:", err); }
})();

// Add max_students column to erd_section if missing
(async () => {
  try {
    const [[r]] = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='erd_section' AND COLUMN_NAME='max_students'"
    );
    if (!r) {
      await pool.query("ALTER TABLE erd_section ADD COLUMN max_students INT NULL DEFAULT NULL");
      console.log("[INIT] Added max_students to erd_section.");
    }
  } catch(e) { console.error("[INIT] Could not add max_students to erd_section:", e.message); }
})();

app.get("/api/erd/sections", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, max_students FROM erd_section ORDER BY name ASC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch sections." });
  }
});

app.post("/api/erd/sections", async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: "Section name is required." });
  try {
    const [existing] = await pool.query("SELECT id FROM erd_section WHERE name=?", [name.trim()]);
    if (existing.length > 0) return res.status(400).json({ message: "Section already exists." });
    const [result] = await pool.query("INSERT INTO erd_section (name) VALUES (?)", [name.trim()]);
    res.status(201).json({ id: result.insertId, name: name.trim(), max_students: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add section." });
  }
});

app.put("/api/erd/sections/:id", async (req, res) => {
  const { name, max_students } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: "Section name is required." });
  try {
    const [existing] = await pool.query("SELECT id FROM erd_section WHERE name=? AND id!=?", [name.trim(), req.params.id]);
    if (existing.length > 0) return res.status(400).json({ message: "Section name already in use." });
    const maxVal = max_students !== undefined ? (max_students === "" || max_students === null ? null : parseInt(max_students, 10)) : undefined;
    if (maxVal !== undefined) {
      await pool.query("UPDATE erd_section SET name=?, max_students=? WHERE id=?", [name.trim(), maxVal, req.params.id]);
    } else {
      await pool.query("UPDATE erd_section SET name=? WHERE id=?", [name.trim(), req.params.id]);
    }
    res.json({ id: req.params.id, name: name.trim(), max_students: maxVal ?? null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update section." });
  }
});

app.delete("/api/erd/sections/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM erd_section WHERE id=?", [req.params.id]);
    res.json({ message: "Section deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete section." });
  }
});

// ─── ROOMS ───────────────────────────────────────────────────────────────────
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erd_room (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) { console.error("erd_room table init error:", err); }
})();

app.get("/api/erd/rooms", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name FROM erd_room ORDER BY name ASC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch rooms." });
  }
});

app.post("/api/erd/rooms", async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: "Room name is required." });
  try {
    const [existing] = await pool.query("SELECT id FROM erd_room WHERE name=?", [name.trim()]);
    if (existing.length > 0) return res.status(400).json({ message: "Room already exists." });
    const [result] = await pool.query("INSERT INTO erd_room (name) VALUES (?)", [name.trim()]);
    res.status(201).json({ id: result.insertId, name: name.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add room." });
  }
});

app.put("/api/erd/rooms/:id", async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: "Room name is required." });
  try {
    const [existing] = await pool.query("SELECT id FROM erd_room WHERE name=? AND id!=?", [name.trim(), req.params.id]);
    if (existing.length > 0) return res.status(400).json({ message: "Room name already in use." });
    await pool.query("UPDATE erd_room SET name=? WHERE id=?", [name.trim(), req.params.id]);
    res.json({ id: req.params.id, name: name.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update room." });
  }
});

app.delete("/api/erd/rooms/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM erd_room WHERE id=?", [req.params.id]);
    res.json({ message: "Room deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete room." });
  }
});

// ─── DATES TO REMEMBER (reflected on the student dashboard) ───────────────────
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erd_dates_remember (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        title      VARCHAR(150) NOT NULL,
        date_text  VARCHAR(120) NOT NULL DEFAULT '',
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) { console.error("erd_dates_remember table init error:", err); }
})();

app.get("/api/erd/dates-to-remember", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, title, date_text, sort_order FROM erd_dates_remember ORDER BY sort_order ASC, id ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch dates to remember." });
  }
});

app.post("/api/erd/dates-to-remember", async (req, res) => {
  const { title, date_text, sort_order } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ message: "Title is required." });
  try {
    const [result] = await pool.query(
      "INSERT INTO erd_dates_remember (title, date_text, sort_order) VALUES (?,?,?)",
      [title.trim(), (date_text || "").trim(), Number(sort_order) || 0]
    );
    res.status(201).json({ id: result.insertId, title: title.trim(), date_text: (date_text || "").trim(), sort_order: Number(sort_order) || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add date." });
  }
});

app.put("/api/erd/dates-to-remember/:id", async (req, res) => {
  const { title, date_text, sort_order } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ message: "Title is required." });
  try {
    await pool.query(
      "UPDATE erd_dates_remember SET title=?, date_text=?, sort_order=? WHERE id=?",
      [title.trim(), (date_text || "").trim(), Number(sort_order) || 0, req.params.id]
    );
    res.json({ id: Number(req.params.id), title: title.trim(), date_text: (date_text || "").trim(), sort_order: Number(sort_order) || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update date." });
  }
});

app.delete("/api/erd/dates-to-remember/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM erd_dates_remember WHERE id=?", [req.params.id]);
    res.json({ message: "Date deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete date." });
  }
});

// ─── SCHOOL YEAR ─────────────────────────────────────────────────────────────
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erd_school_year (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        school_year VARCHAR(20) NOT NULL UNIQUE,
        is_active  TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) { console.error("erd_school_year table init error:", err); }
})();

app.get("/api/erd/school-years", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, school_year, is_active FROM erd_school_year ORDER BY school_year DESC");
    res.json(rows);
  } catch (err) { res.status(500).json({ message: "Failed to fetch school years." }); }
});

app.get("/api/erd/school-years/active", async (req, res) => {
  try {
    const [[row]] = await pool.query("SELECT id, school_year FROM erd_school_year WHERE is_active=1 LIMIT 1");
    res.json(row || null);
  } catch (err) { res.status(500).json({ message: "Failed to fetch active school year." }); }
});

app.post("/api/erd/school-years", async (req, res) => {
  const { school_year } = req.body;
  if (!school_year || !school_year.trim()) return res.status(400).json({ message: "School year is required." });
  try {
    const [existing] = await pool.query("SELECT id FROM erd_school_year WHERE school_year=?", [school_year.trim()]);
    if (existing.length > 0) return res.status(400).json({ message: "School year already exists." });
    const [result] = await pool.query("INSERT INTO erd_school_year (school_year) VALUES (?)", [school_year.trim()]);
    res.status(201).json({ id: result.insertId, school_year: school_year.trim(), is_active: 0 });
  } catch (err) { res.status(500).json({ message: "Failed to add school year." }); }
});

app.put("/api/erd/school-years/:id/activate", async (req, res) => {
  try {
    await pool.query("UPDATE erd_school_year SET is_active=0");
    await pool.query("UPDATE erd_school_year SET is_active=1 WHERE id=?", [req.params.id]);
    res.json({ message: "School year activated." });
  } catch (err) { res.status(500).json({ message: "Failed to activate school year." }); }
});

app.put("/api/erd/school-years/:id/deactivate", async (req, res) => {
  try {
    await pool.query("UPDATE erd_school_year SET is_active=0 WHERE id=?", [req.params.id]);
    res.json({ message: "School year deactivated." });
  } catch (err) { res.status(500).json({ message: "Failed to deactivate school year." }); }
});

app.delete("/api/erd/school-years/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM erd_school_year WHERE id=?", [req.params.id]);
    res.json({ message: "School year deleted." });
  } catch (err) { res.status(500).json({ message: "Failed to delete school year." }); }
});

// ─── ADDRESS BACKFILL ────────────────────────────────────────────────────────
(async () => {
  try {
    await pool.query(`UPDATE erd_student SET municipality = 'ALANGALANG' WHERE municipality IS NULL OR municipality = ''`);
    await pool.query(`UPDATE erd_student SET province = 'LEYTE' WHERE province IS NULL OR province = ''`);
    console.log("erd_student address defaults backfilled OK");
  } catch (err) {
    console.error("Address backfill failed:", err.message);
  }
})();

// ─── CAMPUS BULLETIN BOARD ANNOUNCEMENTS ─────────────────────────────────────
app.get("/api/erd/announcements", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, title, body, department, image, DATE_FORMAT(posted_date, '%Y-%m-%d') AS posted_date, DATE_FORMAT(event_date, '%Y-%m-%d') AS event_date, posted_by FROM erd_announcements ORDER BY posted_date DESC, id DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to retrieve announcement data tables." });
  }
});

app.post("/api/erd/announcements", async (req, res) => {
  const { title, body, department, posted_date, event_date, image, posted_by } = req.body;
  try {
    await pool.query(
      "INSERT INTO erd_announcements (title, body, department, posted_date, event_date, image, posted_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [title, body, department || "General Notice", posted_date, event_date || null, image || null, posted_by || null]
    );
    res.status(201).json({ message: "Campus announcement node broadcasted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to broadcast campus bulletin row." });
  }
});

app.delete("/api/erd/announcements/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM erd_announcements WHERE id = ?", [req.params.id]);
    res.json({ message: "Announcement catalog item purged successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to purge targeted bulletin data." });
  }
});

// ─── STUDENT ENROLLMENT LOGISTICS ────────────────────────────────────────────

// Auto-generate the next available student ID for a given year prefix.
// The sequence number is GLOBAL (never resets between school years).
// e.g. last was 2029-0001 → next new school year gives 2030-0002
app.get("/api/erd/students/next-id", async (req, res) => {
  try {
    const { year } = req.query;
    if (!year || !/^\d{4}$/.test(year)) return res.status(400).json({ message: "Invalid year." });
    // Look across ALL students (any year prefix) to find the highest sequence number
    const [rows] = await pool.query(
      "SELECT student_number FROM erd_student WHERE student_number REGEXP '^[0-9]{4}-[0-9]+$'"
    );
    let nextSeq = 1;
    if (rows.length > 0) {
      const seqs = rows
        .map(r => parseInt((r.student_number || "").split("-")[1]) || 0)
        .filter(n => n > 0);
      if (seqs.length > 0) nextSeq = Math.max(...seqs) + 1;
    }
    res.json({ student_number: `${year}-${String(nextSeq).padStart(4, "0")}` });
  } catch (err) { res.status(500).json({ message: "Failed to generate next ID." }); }
});

app.get("/api/erd/students", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.student_number, s.year_level, s.section, s.year_enrolled, s.created_at,
              s.users_id, s.graduation_status,
              COALESCE(s.first_name,  u.first_name)       AS first_name,
              COALESCE(s.middle_name, u.middle_name)      AS middle_name,
              COALESCE(s.last_name,   u.last_name)        AS last_name,
              COALESCE(s.gender,      u.gender)           AS gender,
              COALESCE(s.profile_picture, u.profile_picture) AS profile_picture,
              c.course,
              s.email, s.mobile, s.birthdate, s.place_of_birth,
              s.barangay, s.municipality, s.province, s.zip_code,
              s.religion, s.citizenship, s.status, s.acr_no, s.classification,
              s.father_last, s.father_first, s.father_middle, s.father_occupation,
              s.mother_last, s.mother_first, s.mother_middle, s.mother_occupation,
              s.parents_address, s.parents_mobile,
              s.guardian_name, s.guardian_relationship, s.guardian_address, s.guardian_mobile,
              s.spouse_name, s.spouse_occupation, s.spouse_address, s.spouse_mobile,
              s.elem_school, s.elem_address, s.elem_year, s.elem_honors,
              s.hs_school, s.hs_address, s.hs_year, s.hs_honors,
              s.col_school, s.col_address, s.col_year, s.col_honors,
              s.scholastic_notes
       FROM erd_student s
       LEFT JOIN erd_users u ON s.users_id = u.id
       LEFT JOIN erd_course c ON s.course_id = c.id
       ORDER BY COALESCE(s.last_name, u.last_name) ASC, COALESCE(s.first_name, u.first_name) ASC`
    );
    res.json(rows.map(r => ({
      id: r.id,
      users_id: r.users_id,
      student_number: r.student_number,
      first_name: r.first_name,
      middle_name: r.middle_name,
      last_name: r.last_name,
      course: r.course || null,
      year_level: r.year_level || null,
      section: r.section || null,
      profile_picture: r.profile_picture,
      year_enrolled: r.year_enrolled || (r.created_at ? new Date(r.created_at).getFullYear() : null),
      graduation_status: r.graduation_status || null,
      gender: r.gender || null,
      email: r.email || null,
      mobile: r.mobile || null,
      birthdate: r.birthdate ? r.birthdate.toISOString().split("T")[0] : null,
      place_of_birth: r.place_of_birth || null,
      barangay: r.barangay || null,
      municipality: r.municipality || null,
      province: r.province || null,
      zip_code: r.zip_code || null,
      religion: r.religion || null,
      citizenship: r.citizenship || null,
      status: r.status || null,
      acr_no: r.acr_no || null,
      classification: r.classification || null,
      father_last: r.father_last || null,
      father_first: r.father_first || null,
      father_middle: r.father_middle || null,
      father_occupation: r.father_occupation || null,
      mother_last: r.mother_last || null,
      mother_first: r.mother_first || null,
      mother_middle: r.mother_middle || null,
      mother_occupation: r.mother_occupation || null,
      parents_address: r.parents_address || null,
      parents_mobile: r.parents_mobile || null,
      guardian_name: r.guardian_name || null,
      guardian_relationship: r.guardian_relationship || null,
      guardian_address: r.guardian_address || null,
      guardian_mobile: r.guardian_mobile || null,
      spouse_name: r.spouse_name || null,
      spouse_occupation: r.spouse_occupation || null,
      spouse_address: r.spouse_address || null,
      spouse_mobile: r.spouse_mobile || null,
      elem_school: r.elem_school || null,
      elem_address: r.elem_address || null,
      elem_year: r.elem_year || null,
      elem_honors: r.elem_honors || null,
      hs_school: r.hs_school || null,
      hs_address: r.hs_address || null,
      hs_year: r.hs_year || null,
      hs_honors: r.hs_honors || null,
      col_school: r.col_school || null,
      col_address: r.col_address || null,
      col_year: r.col_year || null,
      col_honors: r.col_honors || null,
      scholastic_notes: r.scholastic_notes || null,
      birthday: null, age: null, sex: r.gender || null, address: null, adviser: null
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to extract active scholar matrix rows." });
  }
});

// GET a single student record linked to a logged-in user account (erd_users.id).
// Used by the student-facing portal so a signed-in student can load their own
// profile, course, year level and section.
app.get("/api/erd/student/by-user/:usersId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.student_number, s.year_level, s.section, s.year_enrolled, s.users_id,
              s.graduation_status,
              COALESCE(s.first_name,  u.first_name)  AS first_name,
              COALESCE(s.middle_name, u.middle_name) AS middle_name,
              COALESCE(s.last_name,   u.last_name)   AS last_name,
              COALESCE(s.gender,      u.gender)      AS gender,
              COALESCE(s.profile_picture, u.profile_picture) AS profile_picture,
              c.course,
              s.email, s.mobile, s.birthdate, s.place_of_birth,
              s.barangay, s.municipality, s.province, s.zip_code,
              s.religion, s.citizenship, s.status, s.classification
       FROM erd_student s
       LEFT JOIN erd_users u ON s.users_id = u.id
       LEFT JOIN erd_course c ON s.course_id = c.id
       WHERE s.users_id = ?
       LIMIT 1`,
      [req.params.usersId]
    );
    if (!rows.length) return res.status(404).json({ message: "No student profile is linked to this account." });
    const r = rows[0];
    res.json({
      id: r.id,
      users_id: r.users_id,
      student_number: r.student_number,
      first_name: r.first_name,
      middle_name: r.middle_name,
      last_name: r.last_name,
      gender: r.gender || null,
      profile_picture: r.profile_picture || null,
      course: r.course || null,
      year_level: r.year_level || null,
      section: r.section || null,
      year_enrolled: r.year_enrolled || null,
      graduation_status: r.graduation_status || null,
      email: r.email || null,
      mobile: r.mobile || null,
      birthdate: r.birthdate ? r.birthdate.toISOString().split("T")[0] : null,
      place_of_birth: r.place_of_birth || null,
      barangay: r.barangay || null,
      municipality: r.municipality || null,
      province: r.province || null,
      zip_code: r.zip_code || null,
      religion: r.religion || null,
      citizenship: r.citizenship || null,
      status: r.status || null,
      classification: r.classification || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load the student profile for this account." });
  }
});

// Link (or unlink) a login account (erd_users.id) to a student record.
// Body: { users_id }  — pass null/empty to unlink. Each account maps to at most
// one student, so any student already holding that users_id is cleared first.
app.post("/api/erd/student/:id/link-user", async (req, res) => {
  const studentId = req.params.id;
  const usersId = req.body.users_id ? parseInt(req.body.users_id, 10) : null;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (usersId) {
      // clear this account from any other student first (one account = one student)
      await conn.query("UPDATE erd_student SET users_id = NULL WHERE users_id = ? AND id <> ?", [usersId, studentId]);
    }
    await conn.query("UPDATE erd_student SET users_id = ? WHERE id = ?", [usersId, studentId]);
    await conn.commit();
    res.json({ message: usersId ? "Account linked to student." : "Account unlinked from student." });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Failed to update the account-student link." });
  } finally {
    conn.release();
  }
});

// ─── STUDENT LOGIN ACCOUNTS (separate table: erd_student_user) ────────────────
// Employees live in erd_users; students live here. Auto-create the table.
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erd_student_user (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        username VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_active TINYINT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_student (student_id),
        UNIQUE KEY uniq_username (username),
        FOREIGN KEY (student_id) REFERENCES erd_student(id) ON DELETE CASCADE
      )
    `);
    console.log("[INIT] erd_student_user table ensured.");
  } catch (err) {
    console.error("[INIT] erd_student_user table creation failed:", err.message);
  }
})();

// Student login — checks erd_student_user (NOT erd_users).
app.post("/api/erd/auth/student-login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.query(
      `SELECT su.id, su.username, su.student_id, su.is_active,
              s.first_name, s.middle_name, s.last_name, s.student_number
       FROM erd_student_user su
       JOIN erd_student s ON su.student_id = s.id
       WHERE su.username = ? AND su.password = ?`,
      [username, password]
    );
    if (rows.length === 0) return res.status(401).json({ message: "Invalid student number or password." });
    if (!rows[0].is_active) return res.status(403).json({ message: "This student account is currently suspended." });
    const r = rows[0];
    res.json({
      id: r.id, role: "student", student_id: r.student_id,
      username: r.username, student_number: r.student_number,
      first_name: r.first_name || "", middle_name: r.middle_name || "", last_name: r.last_name || "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Student authentication gateway error." });
  }
});

// List all student login accounts (for the admin linking table).
app.get("/api/erd/student-users", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, student_id, username, is_active FROM erd_student_user"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to list student accounts." });
  }
});

// Student profile by erd_student.id — used by the logged-in student's portal.
app.get("/api/erd/student/profile/:studentId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.student_number, s.year_level, s.section, s.year_enrolled, s.graduation_status,
              COALESCE(s.first_name, u.first_name)  AS first_name,
              COALESCE(s.middle_name, u.middle_name) AS middle_name,
              COALESCE(s.last_name, u.last_name)    AS last_name,
              COALESCE(s.gender, u.gender)          AS gender,
              COALESCE(s.profile_picture, u.profile_picture) AS profile_picture,
              c.course, s.status,
              s.email, s.mobile, s.birthdate, s.place_of_birth,
              s.barangay, s.municipality, s.province, s.zip_code,
              s.religion, s.citizenship, s.acr_no, s.classification,
              s.father_last, s.father_first, s.father_middle, s.father_occupation,
              s.mother_last, s.mother_first, s.mother_middle, s.mother_occupation,
              s.parents_address, s.parents_mobile,
              s.guardian_name, s.guardian_relationship, s.guardian_address, s.guardian_mobile,
              s.spouse_name, s.spouse_occupation, s.spouse_address, s.spouse_mobile,
              s.elem_school, s.elem_address, s.elem_year, s.elem_honors,
              s.hs_school, s.hs_address, s.hs_year, s.hs_honors,
              s.col_school, s.col_address, s.col_year, s.col_honors
       FROM erd_student s
       LEFT JOIN erd_users u ON s.users_id = u.id
       LEFT JOIN erd_course c ON s.course_id = c.id
       WHERE s.id = ? LIMIT 1`,
      [req.params.studentId]
    );
    if (!rows.length) return res.status(404).json({ message: "Student not found." });
    const r = rows[0];
    res.json({
      id: r.id, student_number: r.student_number,
      first_name: r.first_name, middle_name: r.middle_name, last_name: r.last_name,
      gender: r.gender || null, profile_picture: r.profile_picture || null,
      course: r.course || null, year_level: r.year_level || null, section: r.section || null,
      year_enrolled: r.year_enrolled || null, graduation_status: r.graduation_status || null,
      status: r.status || null,
      email: r.email || null, mobile: r.mobile || null,
      birthdate: r.birthdate ? r.birthdate.toISOString().split("T")[0] : null,
      place_of_birth: r.place_of_birth || null,
      barangay: r.barangay || null, municipality: r.municipality || null,
      province: r.province || null, zip_code: r.zip_code || null,
      religion: r.religion || null, citizenship: r.citizenship || null,
      acr_no: r.acr_no || null, classification: r.classification || null,
      father_last: r.father_last || null, father_first: r.father_first || null,
      father_middle: r.father_middle || null, father_occupation: r.father_occupation || null,
      mother_last: r.mother_last || null, mother_first: r.mother_first || null,
      mother_middle: r.mother_middle || null, mother_occupation: r.mother_occupation || null,
      parents_address: r.parents_address || null, parents_mobile: r.parents_mobile || null,
      guardian_name: r.guardian_name || null, guardian_relationship: r.guardian_relationship || null,
      guardian_address: r.guardian_address || null, guardian_mobile: r.guardian_mobile || null,
      spouse_name: r.spouse_name || null, spouse_occupation: r.spouse_occupation || null,
      spouse_address: r.spouse_address || null, spouse_mobile: r.spouse_mobile || null,
      elem_school: r.elem_school || null, elem_address: r.elem_address || null,
      elem_year: r.elem_year || null, elem_honors: r.elem_honors || null,
      hs_school: r.hs_school || null, hs_address: r.hs_address || null,
      hs_year: r.hs_year || null, hs_honors: r.hs_honors || null,
      col_school: r.col_school || null, col_address: r.col_address || null,
      col_year: r.col_year || null, col_honors: r.col_honors || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load the student profile." });
  }
});

// Create (or update the password of) a STUDENT login account and link it.
// Username is ALWAYS the student's student_number. Body: { password }.
// Stored in erd_student_user (employees are untouched in erd_users).
app.post("/api/erd/student/:id/create-account", async (req, res) => {
  const studentId = req.params.id;
  const password = (req.body.password || "").trim();
  if (!password) return res.status(400).json({ message: "A password is required." });
  try {
    const [[student]] = await pool.query(
      "SELECT id, student_number FROM erd_student WHERE id = ?", [studentId]
    );
    if (!student) return res.status(404).json({ message: "Student not found." });
    const username = (student.student_number || "").trim();
    if (!username) return res.status(400).json({ message: "This student has no Student Number yet — set one in the Student List first." });

    await pool.query(
      `INSERT INTO erd_student_user (student_id, username, password, is_active)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE username = VALUES(username), password = VALUES(password), is_active = 1`,
      [studentId, username, password]
    );
    res.json({ message: "Student account saved and linked.", username });
  } catch (err) {
    console.error(err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "That student number is already used by another account." });
    }
    res.status(500).json({ message: "Failed to create the student account." });
  }
});

// Unlink — delete the student's login account (erd_student_user) by student id.
app.delete("/api/erd/student/:id/account", async (req, res) => {
  try {
    await pool.query("DELETE FROM erd_student_user WHERE student_id = ?", [req.params.id]);
    res.json({ message: "Student account unlinked." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to unlink the student account." });
  }
});

app.post("/api/erd/students", async (req, res) => {
  const {
    first_name, middle_name, last_name, course, student_number, profile_picture,
    year_level, section, year_enrolled, gender,
    email, mobile, birthdate, place_of_birth, barangay, municipality, province, zip_code,
    religion, citizenship, status, acr_no, classification,
    father_last, father_first, father_middle, father_occupation,
    mother_last, mother_first, mother_middle, mother_occupation,
    parents_address, parents_mobile,
    guardian_name, guardian_relationship, guardian_address, guardian_mobile,
    spouse_name, spouse_occupation, spouse_address, spouse_mobile,
    elem_school, elem_address, elem_year, elem_honors,
    hs_school, hs_address, hs_year, hs_honors,
    col_school, col_address, col_year, col_honors,
    scholastic_notes,
  } = req.body;

  if (!first_name || !last_name || !student_number) {
    return res.status(400).json({ message: "first_name, last_name, and student_number are required." });
  }

  try {
    let courseId = null;
    if (course) {
      const [[courseRow]] = await pool.query("SELECT id FROM erd_course WHERE course = ?", [course]);
      courseId = courseRow ? courseRow.id : null;
    }

    const [studentResult] = await pool.query(
      `INSERT INTO erd_student
         (first_name, middle_name, last_name, gender, profile_picture,
          student_number, course_id, year_level, section, year_enrolled,
          email, mobile, birthdate, place_of_birth, barangay, municipality, province, zip_code,
          religion, citizenship, status, acr_no, classification,
          father_last, father_first, father_middle, father_occupation,
          mother_last, mother_first, mother_middle, mother_occupation,
          parents_address, parents_mobile,
          guardian_name, guardian_relationship, guardian_address, guardian_mobile,
          spouse_name, spouse_occupation, spouse_address, spouse_mobile,
          elem_school, elem_address, elem_year, elem_honors,
          hs_school, hs_address, hs_year, hs_honors,
          col_school, col_address, col_year, col_honors,
          scholastic_notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        first_name, middle_name||null, last_name, gender||null, profile_picture||null,
        student_number, courseId, year_level||null, section||null,
        year_enrolled ? parseInt(year_enrolled,10) : null,
        email||null, mobile||null, birthdate||null, place_of_birth||null,
        barangay||null, municipality||null, province||null, zip_code||null,
        religion||null, citizenship||null, status||null, acr_no||null, classification||null,
        father_last||null, father_first||null, father_middle||null, father_occupation||null,
        mother_last||null, mother_first||null, mother_middle||null, mother_occupation||null,
        parents_address||null, parents_mobile||null,
        guardian_name||null, guardian_relationship||null, guardian_address||null, guardian_mobile||null,
        spouse_name||null, spouse_occupation||null, spouse_address||null, spouse_mobile||null,
        elem_school||null, elem_address||null, elem_year||null, elem_honors||null,
        hs_school||null, hs_address||null, hs_year||null, hs_honors||null,
        col_school||null, col_address||null, col_year||null, col_honors||null,
        scholastic_notes||null,
      ]
    );

    res.status(201).json({
      message: "Student enrolled and saved to erd_student.",
      id: studentResult.insertId,
      users_id: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to enroll student." });
  }
});

app.put("/api/erd/students/:id", async (req, res) => {
  const { id } = req.params;
  const {
    first_name, middle_name, last_name, course, student_number, profile_picture,
    year_level, section, year_enrolled, gender,
    email, mobile, birthdate, place_of_birth, barangay, municipality, province, zip_code,
    religion, citizenship, status, acr_no, classification,
    father_last, father_first, father_middle, father_occupation,
    mother_last, mother_first, mother_middle, mother_occupation,
    parents_address, parents_mobile,
    guardian_name, guardian_relationship, guardian_address, guardian_mobile,
    spouse_name, spouse_occupation, spouse_address, spouse_mobile,
    elem_school, elem_address, elem_year, elem_honors,
    hs_school, hs_address, hs_year, hs_honors,
    col_school, col_address, col_year, col_honors,
    scholastic_notes,
  } = req.body;

  if (!first_name || !last_name || !student_number) {
    return res.status(400).json({ message: "first_name, last_name, and student_number are required." });
  }

  try {
    const [[studentRow]] = await pool.query("SELECT id, users_id FROM erd_student WHERE id = ?", [id]);
    if (!studentRow) return res.status(404).json({ message: "Student not found." });

    let courseId = null;
    if (course) {
      const [[courseRow]] = await pool.query("SELECT id FROM erd_course WHERE course = ?", [course]);
      courseId = courseRow ? courseRow.id : null;
    }

    await pool.query(
      `UPDATE erd_student
       SET first_name=?, middle_name=?, last_name=?, gender=?,
           profile_picture=?, student_number=?, course_id=?,
           year_level=?, section=?, year_enrolled=?,
           email=?, mobile=?, birthdate=?, place_of_birth=?,
           barangay=?, municipality=?, province=?, zip_code=?,
           religion=?, citizenship=?, status=?, acr_no=?, classification=?,
           father_last=?, father_first=?, father_middle=?, father_occupation=?,
           mother_last=?, mother_first=?, mother_middle=?, mother_occupation=?,
           parents_address=?, parents_mobile=?,
           guardian_name=?, guardian_relationship=?, guardian_address=?, guardian_mobile=?,
           spouse_name=?, spouse_occupation=?, spouse_address=?, spouse_mobile=?,
           elem_school=?, elem_address=?, elem_year=?, elem_honors=?,
           hs_school=?, hs_address=?, hs_year=?, hs_honors=?,
           col_school=?, col_address=?, col_year=?, col_honors=?,
           scholastic_notes=?
       WHERE id=?`,
      [
        first_name, middle_name||null, last_name, gender||null,
        profile_picture||null, student_number, courseId,
        year_level||null, section||null, year_enrolled ? parseInt(year_enrolled,10) : null,
        email||null, mobile||null, birthdate||null, place_of_birth||null,
        barangay||null, municipality||null, province||null, zip_code||null,
        religion||null, citizenship||null, status||null, acr_no||null, classification||null,
        father_last||null, father_first||null, father_middle||null, father_occupation||null,
        mother_last||null, mother_first||null, mother_middle||null, mother_occupation||null,
        parents_address||null, parents_mobile||null,
        guardian_name||null, guardian_relationship||null, guardian_address||null, guardian_mobile||null,
        spouse_name||null, spouse_occupation||null, spouse_address||null, spouse_mobile||null,
        elem_school||null, elem_address||null, elem_year||null, elem_honors||null,
        hs_school||null, hs_address||null, hs_year||null, hs_honors||null,
        col_school||null, col_address||null, col_year||null, col_honors||null,
        scholastic_notes||null,
        id
      ]
    );

    // Also sync basic fields to linked erd_users row if one exists (backward compat)
    if (studentRow.users_id) {
      await pool.query(
        "UPDATE erd_users SET first_name=?, middle_name=?, last_name=?, gender=?, profile_picture=? WHERE id=?",
        [first_name, middle_name||null, last_name, gender||null, profile_picture||null, studentRow.users_id]
      );
    }

    res.json({ message: "Student updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update student." });
  }
});

app.delete("/api/erd/students/:id", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Get linked users_id before deleting
    const [[studentRow]] = await conn.query(
      "SELECT users_id FROM erd_student WHERE id = ?", [req.params.id]
    );
    if (!studentRow) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: "Student not found." });
    }

    // Delete from erd_student first (child)
    await conn.query("DELETE FROM erd_student WHERE id = ?", [req.params.id]);

    // Also delete linked erd_users row if it exists
    if (studentRow.users_id) {
      await conn.query("DELETE FROM erd_user_roles WHERE users_id = ?", [studentRow.users_id]);
      await conn.query("DELETE FROM erd_users WHERE id = ?", [studentRow.users_id]);
    }

    await conn.commit();
    res.json({ message: "Student and associated account deleted." });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Failed to delete student." });
  } finally {
    conn.release();
  }
});

// ─── FACULTY DIRECTORY MANAGEMENT ────────────────────────────────────────────
// Graduate a student (admin only from frontend)
app.put("/api/erd/students/:id/graduate", async (req, res) => {
  const { id } = req.params;
  const { graduation_status } = req.body;
  try {
    await pool.query(
      "UPDATE erd_student SET graduation_status = ? WHERE id = ?",
      [graduation_status || null, id]
    );
    const msg = graduation_status === 'graduated'
      ? 'Student marked as graduated.'
      : 'Graduation status cleared.';
    res.json({ message: msg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update graduation status.' });
  }
});

app.get("/api/erd/faculty", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.first_name, u.middle_name, u.last_name, u.profile_picture, u.is_active
       FROM erd_users u
       JOIN erd_user_type ut ON u.user_type_id = ut.id
       WHERE ut.user_type = 'faculty'
       ORDER BY u.last_name ASC, u.first_name ASC`
    );
    res.json(rows.map(r => ({
      id: r.id,
      first_name: r.first_name,
      middle_name: r.middle_name,
      last_name: r.last_name,
      profile_picture: r.profile_picture,
      email: null, employment_status: null, department: null, rank_position: null
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to query structural instructor records." });
  }
});

app.post("/api/erd/faculty", async (req, res) => {
  const { first_name, middle_name, last_name, profile_picture } = req.body;
  try {
    const [[typeRow]] = await pool.query("SELECT id FROM erd_user_type WHERE user_type = 'faculty'");
    if (!typeRow) return res.status(400).json({ message: "No 'faculty' row exists in erd_user_type." });
    await pool.query(
      `INSERT INTO erd_users (user_type_id, first_name, middle_name, last_name, profile_picture, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [typeRow.id, first_name, middle_name || null, last_name, profile_picture || null]
    );
    res.status(201).json({ message: "Faculty member matrix node declared." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to capture instructor credentials block." });
  }
});

app.put("/api/erd/faculty/:id", async (req, res) => {
  const { id } = req.params;
  const { first_name, middle_name, last_name, profile_picture } = req.body;
  try {
    await pool.query(
      `UPDATE erd_users SET first_name=?, middle_name=?, last_name=?, profile_picture=? WHERE id=?`,
      [first_name, middle_name || null, last_name, profile_picture || null, id]
    );
    res.json({ message: "Faculty entity tracking node updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to persist instructor structural variations." });
  }
});

app.delete("/api/erd/faculty/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM erd_users WHERE id = ?", [req.params.id]);
    res.json({ message: "Faculty records unlinked from directory framework." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to purge targeted instructor record item." });
  }
});

// ─── INSTRUCTOR COURSE WORKLOAD SCHEDULING ───────────────────────────────────
// All current subject assignments across every instructor — used by the
// Faculty Hub "Assigned Subject" picker to know which subjects are already
// taken (and by whom) before letting an admin assign someone new.
app.get("/api/erd/faculty/assignments", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT fl.id, fl.user_id AS faculty_id, fl.subject_id, fl.year_level, fl.section, fl.sched, fl.room,
              u.first_name, u.middle_name, u.last_name
       FROM erd_subject_load fl
       JOIN erd_users u ON fl.user_id = u.id
       ORDER BY fl.id ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/erd/faculty/assignments failed:", err);
    res.status(500).json({ message: err.sqlMessage || err.message || "Failed to index full instructor workload roster." });
  }
});

app.get("/api/erd/faculty/assignments/:facultyId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT fl.id, fl.user_id AS faculty_id, fl.subject_id, fl.year_level, fl.section, fl.sched, fl.room,
              sub.subject AS subject_title, sub.credits AS units
       FROM erd_subject_load fl
       JOIN erd_subjects sub ON fl.subject_id = sub.id
       WHERE fl.user_id = ? ORDER BY fl.sched ASC`,
      [req.params.facultyId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to index instructor workload schedules." });
  }
});

app.post("/api/erd/faculty/assignments", async (req, res) => {
  const { faculty_id, subject_id, room_assignment, room, sched, year_level, section } = req.body;

  if (!faculty_id || !subject_id) {
    return res.status(400).json({ message: "faculty_id and subject_id are both required." });
  }

  try {
    const [[existing]] = await pool.query(
      `SELECT fl.id, u.first_name, u.last_name
       FROM erd_subject_load fl
       JOIN erd_users u ON fl.user_id = u.id
       WHERE fl.subject_id = ? AND fl.user_id != ?
       LIMIT 1`,
      [subject_id, faculty_id]
    );
    if (existing) {
      return res.status(409).json({
        message: `This subject is already assigned to ${existing.first_name} ${existing.last_name}.`
      });
    }
    await pool.query(
      `INSERT INTO erd_subject_load (user_id, subject_id, year_level, section, sched, room)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [faculty_id, subject_id, year_level ?? null, section ?? null, sched ?? null, room ?? room_assignment ?? null]
    );
    res.status(201).json({ message: "Workload schedule committed cleanly." });
  } catch (err) {
    console.error("POST /api/erd/faculty/assignments failed:", err);
    res.status(500).json({ message: err.sqlMessage || err.message || "Failed to bind scheduling parameters to instructor node." });
  }
});

app.put("/api/erd/faculty/assignments/:id", async (req, res) => {
  const { id } = req.params;
  const { room_assignment, room, sched, year_level, section } = req.body;
  try {
    // Partial update: only touch fields actually present in the request body,
    // so e.g. saving a schedule from the Class Schedule modal doesn't wipe
    // out room/year_level/section that were set elsewhere.
    const sets = [];
    const params = [];
    if (room !== undefined || room_assignment !== undefined) { sets.push("room=?"); params.push(room ?? room_assignment ?? null); }
    if (sched !== undefined)      { sets.push("sched=?");      params.push(sched ?? null); }
    if (year_level !== undefined) { sets.push("year_level=?"); params.push(year_level ?? null); }
    if (section !== undefined)    { sets.push("section=?");    params.push(section ?? null); }

    if (sets.length === 0) {
      return res.status(400).json({ message: "No fields provided to update." });
    }

    params.push(id);
    await pool.query(`UPDATE erd_subject_load SET ${sets.join(", ")} WHERE id=?`, params);
    res.json({ message: "Workload tracking row modified safely." });
  } catch (err) {
    console.error("PUT /api/erd/faculty/assignments/:id failed:", err);
    res.status(500).json({ message: err.sqlMessage || err.message || "Failed to commit scheduled assignment changes." });
  }
});

app.delete("/api/erd/faculty/assignments/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM erd_subject_load WHERE id = ?", [req.params.id]);
    res.json({ message: "Workload scheduling block dropped." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to drop workload structural row link." });
  }
});

// ─── CURRICULUM SUBJECT REFERENCE ────────────────────────────────────────────
// Ensure lec_hours, lab_hours, pre_requisite columns exist (compatible with all MySQL versions)
(async () => {
  try {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'erd_subjects'`
    );
    const existing = cols.map(c => c.COLUMN_NAME);
    if (!existing.includes("subject_code"))
      await pool.query(`ALTER TABLE erd_subjects ADD COLUMN subject_code VARCHAR(100) DEFAULT NULL`);
    else
      await pool.query(`ALTER TABLE erd_subjects MODIFY COLUMN subject_code VARCHAR(100) DEFAULT NULL`);
    // Drop unique constraint on subject column so same name can exist for different courses/year levels
    try {
      const [idxRows] = await pool.query(
        `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'erd_subjects'
            AND COLUMN_NAME = 'subject' AND NON_UNIQUE = 0 AND INDEX_NAME != 'PRIMARY'`
      );
      for (const row of idxRows) {
        await pool.query(`ALTER TABLE erd_subjects DROP INDEX \`${row.INDEX_NAME}\``);
        console.log('[INIT] Dropped unique index on erd_subjects.subject:', row.INDEX_NAME);
      }
    } catch (_) {}
    if (!existing.includes("course_id"))
      await pool.query(`ALTER TABLE erd_subjects ADD COLUMN course_id INT DEFAULT NULL`);
    if (!existing.includes("lec_hours"))
      await pool.query(`ALTER TABLE erd_subjects ADD COLUMN lec_hours INT NOT NULL DEFAULT 0`);
    if (!existing.includes("lab_hours"))
      await pool.query(`ALTER TABLE erd_subjects ADD COLUMN lab_hours INT NOT NULL DEFAULT 0`);
    if (!existing.includes("pre_requisite"))
      await pool.query(`ALTER TABLE erd_subjects ADD COLUMN pre_requisite VARCHAR(255) DEFAULT NULL`);
    if (!existing.includes("description"))
      await pool.query(`ALTER TABLE erd_subjects ADD COLUMN description TEXT DEFAULT NULL`);
    console.log("erd_subjects columns OK (subject_code, course_id, lec_hours, lab_hours, pre_requisite, description)");
  } catch (err) {
    console.error("Failed to ensure erd_subjects columns:", err.message);
  }
})();

app.get("/api/erd/subjects", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT sub.id, sub.subject, sub.credits, sub.subject_code, sub.semester,
              IFNULL(sub.year_level, NULL) AS year_level, c.course,
              IFNULL(sub.lec_hours, 0) AS lec_hours,
              IFNULL(sub.lab_hours, 0) AS lab_hours,
              IFNULL(sub.pre_requisite, 'None') AS pre_requisite,
              sub.description
       FROM erd_subjects sub
       LEFT JOIN erd_course c ON sub.course_id = c.id
       ORDER BY COALESCE(FIELD(sub.year_level,'1st Year','2nd Year','3rd Year','4th Year'), 99) ASC,
                sub.semester ASC, sub.subject ASC`
    );
    res.json(rows.map(r => ({
      id: r.id,
      subject_code: r.subject_code || null,
      subject_title: r.subject,
      units: r.credits,
      course: r.course || null,
      semester: r.semester || null,
      year_level: r.year_level || null,
      lec_hours: r.lec_hours ?? 0,
      lab_hours: r.lab_hours ?? 0,
      pre_requisite: r.pre_requisite || "None",
      description: r.description || "",
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load structural academic catalog subjects." });
  }
});

app.post("/api/erd/subjects", async (req, res) => {
  const { subject_title, units, subject_code, course, semester, year_level, lec_hours, lab_hours, pre_requisite, description } = req.body;
  try {
    let courseId = null;
    if (course) {
      const [[courseRow]] = await pool.query("SELECT id FROM erd_course WHERE course = ?", [course]);
      courseId = courseRow ? courseRow.id : null;
    }
    await pool.query(
      "INSERT INTO erd_subjects (subject, credits, subject_code, course_id, semester, year_level, lec_hours, lab_hours, pre_requisite, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [subject_title, parseInt(units, 10) || 3, subject_code || null, courseId, semester ? parseInt(semester, 10) : null, year_level || null, parseInt(lec_hours, 10) || 0, parseInt(lab_hours, 10) || 0, pre_requisite || null, description || null]
    );
    res.status(201).json({ message: "Reference subject card attached to registry." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to register curriculum target code." });
  }
});

app.put("/api/erd/subjects/:id", async (req, res) => {
  const { id } = req.params;
  const { subject_title, units, subject_code, course, semester, year_level, lec_hours, lab_hours, pre_requisite, description } = req.body;
  try {
    let courseId = null;
    if (course) {
      const [[courseRow]] = await pool.query("SELECT id FROM erd_course WHERE course = ?", [course]);
      courseId = courseRow ? courseRow.id : null;
    }
    await pool.query(
      "UPDATE erd_subjects SET subject=?, credits=?, subject_code=?, course_id=?, semester=?, year_level=?, lec_hours=?, lab_hours=?, pre_requisite=?, description=? WHERE id=?",
      [subject_title, parseInt(units, 10) || 3, subject_code || null, courseId, semester ? parseInt(semester, 10) : null, year_level || null, parseInt(lec_hours, 10) || 0, parseInt(lab_hours, 10) || 0, pre_requisite || null, description || null, id]
    );
    res.json({ message: "Curriculum target code realigned successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to map curriculum adjustment write operations." });
  }
});

app.delete("/api/erd/subjects/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM erd_subjects WHERE id = ?", [req.params.id]);
    res.json({ message: "Academic reference subject card decoupled." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to drop context reference subject record row." });
  }
});

// ─── REGISTRAR REPORTING GRADES MATRIX ────────────────────────────────────────
// ── TOR SUBJECTS: all enrolled subjects + grades (blank if not yet graded) ──
app.get("/api/erd/tor-subjects/:studentId", async (req, res) => {
  const { studentId } = req.params;
  try {
    const [[student]] = await pool.query(
      `SELECT s.id, s.section, s.year_level, ec.course
       FROM erd_student s
       LEFT JOIN erd_course ec ON ec.id = s.course_id
       WHERE s.id = ?`, [studentId]
    );
    if (!student) return res.status(404).json({ message: "Student not found." });

    const [enrollments] = await pool.query(
      `SELECT year_enrolled, year_level, semester
       FROM erd_enrollment
       WHERE student_id = ?
       ORDER BY year_enrolled ASC, FIELD(year_level,'1st Year','2nd Year','3rd Year','4th Year') ASC, FIELD(semester,'1st Semester','2nd Semester') ASC`,
      [studentId]
    );
    if (enrollments.length === 0) return res.json([]);

    // Batch-fetch all grades for this student once
    const [allGrades] = await pool.query(
      `SELECT subject_id, semester, year_start, grade, remarks FROM erd_grades WHERE student_id = ?`,
      [studentId]
    );
    const gradeMap = {};
    allGrades.forEach(g => {
      const k = `${g.subject_id}|${g.semester}|${g.year_start}`;
      gradeMap[k] = g;
    });

    const results = [];
    for (const enr of enrollments) {
      const semInt = enr.semester === '1st Semester' ? 1
                   : enr.semester === '2nd Semester' ? 2 : null;
      if (!semInt) continue;

      // Always use the current curriculum (erd_subjects) so the transcript
      // reflects the up-to-date subject list, not old class_schedule snapshots.
      const [subjects] = await pool.query(
        `SELECT sub.id AS subject_id, sub.subject AS subject_title,
                sub.subject_code, sub.credits AS units, sub.description AS class_code
         FROM erd_subjects sub
         LEFT JOIN erd_course ec ON ec.id = sub.course_id
         WHERE (ec.course = ? OR sub.course_id IS NULL)
           AND sub.year_level = ? AND sub.semester = ?
         ORDER BY sub.subject ASC`,
        [student.course, enr.year_level, semInt]
      );

      for (const subj of subjects) {
        const key = `${subj.subject_id}|${semInt}|${enr.year_enrolled}`;
        const gRec = gradeMap[key] || null;
        results.push({
          subject_id:    subj.subject_id,
          subject_title: subj.subject_title || "—",
          subject_code:  subj.subject_code  || null,
          units:         subj.units || 3,
          class_code:    subj.class_code || null,
          semester:      semInt,
          year_level:    enr.year_level,
          year_start:    enr.year_enrolled,
          year_end:      parseInt(enr.year_enrolled) + 1,
          grade:         gRec ? gRec.grade   : null,
          remarks:       gRec ? gRec.remarks : null,
        });
      }
    }
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch TOR subjects." });
  }
});

// ─── erd_grades de-dupe + unique key ─────────────────────────────────────────
// Without a unique key, every grade-sheet "save" INSERTs new rows, so the same
// subject piles up (e.g. PE1 under S.Y. 2026 AND 2029). This removes existing
// duplicates (keeping the newest) and adds a UNIQUE key so future saves UPDATE.
(async () => {
  try {
    await pool.query(`
      DELETE g1 FROM erd_grades g1
      JOIN erd_grades g2
        ON g1.student_id = g2.student_id
       AND g1.subject_id = g2.subject_id
       AND IFNULL(g1.semester,1)   = IFNULL(g2.semester,1)
       AND IFNULL(g1.year_start,0) = IFNULL(g2.year_start,0)
       AND g1.id < g2.id
    `);
    const [idx] = await pool.query(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'erd_grades' AND INDEX_NAME = 'uniq_grade'`
    );
    if (!idx[0].c) {
      await pool.query(`ALTER TABLE erd_grades ADD UNIQUE KEY uniq_grade (student_id, subject_id, semester, year_start)`);
      console.log("[INIT] erd_grades duplicates removed and uniq_grade key added.");
    }
  } catch (err) {
    console.error("[INIT] erd_grades dedupe/unique failed:", err.message);
  }
})();

app.get("/api/erd/grades/:studentId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT eg.*, sub.subject AS subject_title, sub.credits AS units,
              sub.subject_code, sub.year_level AS sub_year_level
       FROM erd_grades eg
       JOIN erd_subjects sub ON eg.subject_id = sub.id
       WHERE eg.student_id = ? ORDER BY eg.year_start ASC, eg.semester ASC, sub.subject ASC`,
      [req.params.studentId]
    );
    res.json(rows.map(r => ({
      ...r,
      subject_code: r.subject_code || null,
      year_level: r.year_level || r.sub_year_level || null
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to map historical matrix data matching targeted scholar node." });
  }
});

app.post("/api/erd/grades/bulk", async (req, res) => {
  const { student_id, grades } = req.body;
  if (!student_id || !Array.isArray(grades) || !grades.length) {
    return res.status(400).json({ message: "student_id and targeted grades matrix fields are required parameters." });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const g of grades) {
      await conn.query(
        `INSERT INTO erd_grades (student_id, subject_id, grade, remarks, semester, year_start, year_end)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE grade = VALUES(grade), remarks = VALUES(remarks),
           year_start = VALUES(year_start), year_end = VALUES(year_end)`,
        [
          student_id, g.subject_id,
          g.grade !== "" && g.grade !== undefined ? parseFloat(g.grade) : null,
          g.remarks || null,
          g.semester ? parseInt(g.semester, 10) : 1,
          g.year_start ? parseInt(g.year_start, 10) : null,
          g.year_end ? parseInt(g.year_end, 10) : null
        ]
      );
    }
    await conn.commit();

    // Bind graded terms to an enrollment record so the registrar's Enrollment
    // Records reflects the grade sheet. Best-effort — never fails the save.
    try {
      const [[stu]] = await pool.query("SELECT year_level FROM erd_student WHERE id = ?", [student_id]);
      const yl = stu?.year_level || "1st Year";
      const semStr = (n) => n === 2 ? "2nd Semester" : n === 3 ? "Summer" : "1st Semester";
      const terms = new Map();
      for (const g of grades) {
        const yr = g.year_start ? parseInt(g.year_start, 10) : null;
        if (!yr) continue;
        terms.set(`${yr}-${g.semester || 1}`, { yr, sem: g.semester ? parseInt(g.semester, 10) : 1 });
      }
      for (const { yr, sem } of terms.values()) {
        await pool.query(
          `INSERT INTO erd_enrollment (student_id, year_enrolled, year_level, semester)
           SELECT ?, ?, ?, ? FROM DUAL
           WHERE NOT EXISTS (SELECT 1 FROM erd_enrollment WHERE student_id=? AND year_enrolled=? AND semester=?)`,
          [student_id, yr, yl, semStr(sem), student_id, yr, semStr(sem)]
        );
      }
    } catch (e) { console.error("[bulk] enrollment bind skipped:", e.message); }

    res.json({ message: `${grades.length} historical grade parameter entries committed successfully.` });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Transitional error matching transactional ledger metrics." });
  } finally {
    conn.release();
  }
});

app.delete("/api/erd/grades/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM erd_grades WHERE id = ?", [req.params.id]);
    res.json({ message: "Historical matrix evaluation grade entry cleanly deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete grade record." });
  }
});

// ─── CLASS SCHEDULE ──────────────────────────────────────────────────────────
// Auto-create table if not exists
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_schedule (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        day           VARCHAR(20)  NOT NULL,
        course        VARCHAR(255) DEFAULT NULL,
        year_level    VARCHAR(50)  DEFAULT NULL,
        section       VARCHAR(50)  DEFAULT NULL,
        subject_id    INT          DEFAULT NULL,
        subject_title VARCHAR(255) DEFAULT NULL,
        time          VARCHAR(100) DEFAULT NULL,
        room          VARCHAR(100) DEFAULT NULL,
        faculty_id    INT          DEFAULT NULL,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    // Add columns if upgrading from old table
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='class_schedule'`
    );
    const existing = cols.map(c => c.COLUMN_NAME);
    if (!existing.includes("course"))     await pool.query(`ALTER TABLE class_schedule ADD COLUMN course VARCHAR(255) DEFAULT NULL AFTER day`);
    if (!existing.includes("year_level")) await pool.query(`ALTER TABLE class_schedule ADD COLUMN year_level VARCHAR(50) DEFAULT NULL AFTER course`);
    if (!existing.includes("section"))    await pool.query(`ALTER TABLE class_schedule ADD COLUMN section VARCHAR(50) DEFAULT NULL AFTER year_level`);
    if (!existing.includes("semester"))   await pool.query(`ALTER TABLE class_schedule ADD COLUMN semester TINYINT DEFAULT NULL AFTER section`);
  } catch (err) { console.error("class_schedule table init error:", err); }
})();

// GET all schedule rows (joined with subject + faculty names)
app.get("/api/erd/class-schedule", async (req, res) => {
  try {
    const { course, year_level, section, semester } = req.query;
    const sem = (semester != null && semester !== "") ? parseInt(semester, 10) : null;
    const sec = section || null;
    const crs = course || null;
    const yl  = year_level || null;
    // Catalog-driven: the subject list ALWAYS comes from the current curriculum
    // (erd_subjects). Any existing class_schedule row for that section/semester is
    // LEFT-JOINed on to supply day/time/room/instructor. This means the schedule
    // always reflects the current subjects — no stale/old subjects from past edits.
    const [rows] = await pool.query(`
      SELECT cs.id AS id, cs.day, ec.course, sub.year_level, cs.section,
             sub.semester, sub.id AS subject_id, sub.subject AS subject_title,
             cs.time, cs.room, cs.faculty_id,
             CONCAT(IFNULL(u.first_name,''), ' ', IFNULL(u.last_name,'')) AS faculty_name,
             sub.subject_code, sub.credits AS units
      FROM erd_subjects sub
      LEFT JOIN erd_course ec ON ec.id = sub.course_id
      LEFT JOIN class_schedule cs ON cs.subject_id = sub.id
             AND (? IS NULL OR cs.section = ?)
             AND (? IS NULL OR cs.semester = ?)
      LEFT JOIN erd_users u ON u.id = cs.faculty_id
      WHERE (sub.course_id IS NULL OR ? IS NULL OR ec.course = ?)
        AND (? IS NULL OR sub.year_level = ?)
        AND (? IS NULL OR sub.semester = ?)
      ORDER BY sub.semester ASC, sub.subject ASC
    `, [sec, sec, sem, sem, crs, crs, yl, yl, sem, sem]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed to fetch class schedule." }); }
});

// POST — add a new schedule row
app.post("/api/erd/class-schedule", async (req, res) => {
  const { day, course, year_level, section, semester, subject_id, subject_title, time, room, faculty_id } = req.body;
  if (!day) return res.status(400).json({ message: "Day is required." });
  try {
    const [result] = await pool.query(
      `INSERT INTO class_schedule (day, course, year_level, section, semester, subject_id, subject_title, time, room, faculty_id) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [day, course||null, year_level||null, section||null, semester ? parseInt(semester,10) : null, subject_id||null, subject_title||null, time||null, room||null, faculty_id||null]
    );
    res.json({ id: result.insertId, day, course, year_level, section, semester, subject_id, subject_title, time, room, faculty_id });
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed to create schedule entry." }); }
});

// PUT — update a schedule row
app.put("/api/erd/class-schedule/:id", async (req, res) => {
  const { day, subject_id, subject_title, time, room, faculty_id } = req.body;
  try {
    await pool.query(
      `UPDATE class_schedule SET day=?, subject_id=?, subject_title=?, time=?, room=?, faculty_id=? WHERE id=?`,
      [day||null, subject_id||null, subject_title||null, time||null, room||null, faculty_id||null, req.params.id]
    );
    res.json({ message: "Updated." });
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed to update schedule entry." }); }
});

// DELETE — remove a schedule row
app.delete("/api/erd/class-schedule/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM class_schedule WHERE id=?`, [req.params.id]);
    res.json({ message: "Deleted." });
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed to delete schedule entry." }); }
});

// GET all class-schedule entries that have a faculty assigned (for Faculty Schedule widget)
app.get("/api/erd/class-schedule/by-faculty", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cs.id, cs.day, cs.course, cs.year_level, cs.section, cs.semester,
              cs.subject_id, cs.subject_title, cs.time, cs.room, cs.faculty_id,
              u.first_name, u.last_name, u.profile_picture
       FROM class_schedule cs
       LEFT JOIN erd_users u ON u.id = cs.faculty_id
       WHERE cs.faculty_id IS NOT NULL
       ORDER BY FIELD(cs.day,'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'), cs.id`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch faculty class schedule." });
  }
});

// ─── LIBRARY: removed. Tables dropped and feature paused (see drop_library.sql). ───
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`[PRODUCTION READY] Portal backend listener established on network port -> ${PORT}`));

// ─── STUDENT ENROLLMENT RECORDS ──────────────────────────────────────────────
(async () => {
  try {
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'erd_subjects' AND COLUMN_NAME = 'year_level'"
    );
    if (cols.length === 0) {
      await pool.query("ALTER TABLE erd_subjects ADD COLUMN year_level VARCHAR(20) NULL AFTER semester");
      console.log("[INIT] Added year_level column to erd_subjects.");
    }
  } catch (err) {
    console.error("[INIT] Could not add year_level to erd_subjects:", err.message);
  }
})();

// ─── BACKFILL class_schedule.subject_id ────────────────────────────────────────
// Old rows were inserted without subject_id. Match by title so the JOIN works.
(async () => {
  try {
    const [result] = await pool.query(`
      UPDATE class_schedule cs
      JOIN erd_subjects sub
        ON LOWER(TRIM(sub.subject)) = LOWER(TRIM(cs.subject_title))
      SET cs.subject_id = sub.id
      WHERE cs.subject_id IS NULL
        AND cs.subject_title IS NOT NULL
        AND cs.subject_title != ''
    `);
    if (result.affectedRows > 0)
      console.log(`[INIT] Backfilled subject_id on ${result.affectedRows} class_schedule row(s).`);
  } catch (err) {
    console.error("[INIT] class_schedule subject_id backfill failed:", err.message);
  }
})();

// erd_users.signature — stores an e-signature image (base64 data URL) used for
// "Signature over Printed Name" on printed documents like the Transcript of
// Record. Added defensively since older deployments won't have this column yet.
(async () => {
  try {
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'erd_users' AND COLUMN_NAME = 'signature'"
    );
    if (cols.length === 0) {
      await pool.query("ALTER TABLE erd_users ADD COLUMN signature LONGTEXT NULL AFTER profile_picture");
      console.log("[INIT] Added signature column to erd_users.");
    }
  } catch (err) {
    console.error("[INIT] Could not add signature to erd_users:", err.message);
  }
})();

// erd_announcements.event_date — optional date that highlights on the calendar
(async () => {
  try {
    const [[r]] = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='erd_announcements' AND COLUMN_NAME='event_date'"
    );
    if (!r) {
      await pool.query("ALTER TABLE erd_announcements ADD COLUMN event_date DATE NULL");
      console.log("[INIT] Added event_date to erd_announcements.");
    }
  } catch(e) { console.error("[INIT] event_date migration:", e.message); }
})();

// erd_student personal columns — store student name/gender directly on erd_student
// so enrollment data no longer requires a linked erd_users row.
(async () => {
  const cols = ["first_name VARCHAR(100) NULL", "last_name VARCHAR(100) NULL",
                "middle_name VARCHAR(100) NULL", "gender VARCHAR(20) NULL",
                "profile_picture LONGTEXT NULL"];
  for (const colDef of cols) {
    const colName = colDef.split(" ")[0];
    try {
      const [[r]] = await pool.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='erd_student' AND COLUMN_NAME=?",
        [colName]
      );
      if (!r) {
        await pool.query(`ALTER TABLE erd_student ADD COLUMN ${colDef}`);
        console.log(`[INIT] Added ${colName} to erd_student.`);
      }
    } catch(e) { console.error(`[INIT] Could not add ${colName} to erd_student:`, e.message); }
  }
  // make users_id nullable so students can exist without an erd_users login
  try {
    await pool.query("ALTER TABLE erd_student MODIFY COLUMN users_id INT NULL");
  } catch(e) { /* already nullable or FK constraint - ok */ }
  // make course_id nullable (safety)
  try {
    await pool.query("ALTER TABLE erd_student MODIFY COLUMN course_id INT NULL");
  } catch(e) { /* already nullable - ok */ }
})();

// erd_student.year_enrolled — lets the registrar explicitly record the
// academic year a student enrolled (defaults to the enrollment year derived
// from created_at when not supplied). Added defensively for older deployments.
(async () => {
  try {
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'erd_student' AND COLUMN_NAME = 'year_enrolled'"
    );
    if (cols.length === 0) {
      await pool.query("ALTER TABLE erd_student ADD COLUMN year_enrolled YEAR NULL AFTER section");
      console.log("[INIT] Added year_enrolled column to erd_student.");
    }
  } catch (err) {
    console.error("[INIT] Could not add year_enrolled to erd_student:", err.message);
  }
})();

// erd_student SI columns — all personal-info fields used by the Student
// Information Sheet. Added defensively; older deployments may be missing them.
(async () => {
  const siCols = [
    "email VARCHAR(255) NULL",
    "mobile VARCHAR(30) NULL",
    "birthdate DATE NULL",
    "place_of_birth VARCHAR(255) NULL",
    "barangay VARCHAR(100) NULL",
    "municipality VARCHAR(100) NULL",
    "province VARCHAR(100) NULL",
    "zip_code VARCHAR(20) NULL",
    "religion VARCHAR(100) NULL",
    "citizenship VARCHAR(100) NULL",
    "status VARCHAR(50) NULL",
    "acr_no VARCHAR(100) NULL",
    "classification VARCHAR(50) NULL",
    "father_last VARCHAR(100) NULL",
    "father_first VARCHAR(100) NULL",
    "father_middle VARCHAR(100) NULL",
    "father_occupation VARCHAR(255) NULL",
    "mother_last VARCHAR(100) NULL",
    "mother_first VARCHAR(100) NULL",
    "mother_middle VARCHAR(100) NULL",
    "mother_occupation VARCHAR(255) NULL",
    "parents_address TEXT NULL",
    "parents_mobile VARCHAR(30) NULL",
    "guardian_name VARCHAR(255) NULL",
    "guardian_relationship VARCHAR(100) NULL",
    "guardian_address TEXT NULL",
    "guardian_mobile VARCHAR(30) NULL",
    "spouse_name VARCHAR(255) NULL",
    "spouse_occupation VARCHAR(255) NULL",
    "spouse_address TEXT NULL",
    "spouse_mobile VARCHAR(30) NULL",
    "elem_school VARCHAR(255) NULL",
    "elem_address TEXT NULL",
    "elem_year VARCHAR(10) NULL",
    "elem_honors VARCHAR(255) NULL",
    "hs_school VARCHAR(255) NULL",
    "hs_address TEXT NULL",
    "hs_year VARCHAR(10) NULL",
    "hs_honors VARCHAR(255) NULL",
    "col_school VARCHAR(255) NULL",
    "col_address TEXT NULL",
    "col_year VARCHAR(10) NULL",
    "col_honors VARCHAR(255) NULL",
    "scholastic_notes TEXT NULL",
  ];
  for (const colDef of siCols) {
    const colName = colDef.split(" ")[0];
    try {
      const [[r]] = await pool.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='erd_student' AND COLUMN_NAME=?",
        [colName]
      );
      if (!r) {
        await pool.query(`ALTER TABLE erd_student ADD COLUMN ${colDef}`);
        console.log(`[INIT] Added ${colName} to erd_student.`);
      }
    } catch(e) { console.error(`[INIT] Could not add ${colName} to erd_student:`, e.message); }
  }
})();

// erd_users.last_seen — presence tracking. Updated by the heartbeat endpoint
// below every time a logged-in user's dashboard is open; the "online" dot in
// the System Accounts panel is derived from how recently this was touched,
// instead of the static is_active/Suspended flag (which never reflected
// whether anyone was actually signed in). Added defensively for older
// deployments.
(async () => {
  try {
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'erd_users' AND COLUMN_NAME = 'last_seen'"
    );
    if (cols.length === 0) {
      await pool.query("ALTER TABLE erd_users ADD COLUMN last_seen DATETIME NULL AFTER is_active");
      console.log("[INIT] Added last_seen column to erd_users.");
    }
  } catch (err) {
    console.error("[INIT] Could not add last_seen to erd_users:", err.message);
  }
})();

pool.query(`
  CREATE TABLE IF NOT EXISTS erd_enrollment (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    student_id    INT NOT NULL,
    year_enrolled YEAR NOT NULL,
    year_level    VARCHAR(20) NOT NULL,
    semester      VARCHAR(30) NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES erd_student(id) ON DELETE CASCADE
  )
`).then(() => pool.query(`
  INSERT INTO erd_enrollment (student_id, year_enrolled, year_level, semester)
  SELECT DISTINCT g.student_id, g.year_start, COALESCE(s.year_level, '1st Year'),
    CASE g.semester WHEN 2 THEN '2nd Semester' WHEN 3 THEN 'Summer' ELSE '1st Semester' END
  FROM erd_grades g
  JOIN erd_student s ON s.id = g.student_id
  WHERE g.year_start IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM erd_enrollment e
      WHERE e.student_id = g.student_id AND e.year_enrolled = g.year_start
        AND e.semester = CASE g.semester WHEN 2 THEN '2nd Semester' WHEN 3 THEN 'Summer' ELSE '1st Semester' END
    )
`)).then(() => console.log("[INIT] Enrollment records backfilled from graded terms."))
  .catch(err => console.error("erd_enrollment table init error:", err));

// Faculty subject-load / teaching-assignment table. Created defensively here
// since older deployments of this schema may not have it yet — without it,
// every /api/erd/faculty/assignments* route 500s.
pool.query(`
  CREATE TABLE IF NOT EXISTS erd_subject_load (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    subject_id  INT NOT NULL,
    year_level  VARCHAR(20) NULL,
    section     VARCHAR(20) NULL,
    sched       VARCHAR(255) NULL,
    room        VARCHAR(50) NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES erd_users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES erd_subjects(id) ON DELETE CASCADE
  )
`).catch(err => console.error("erd_subject_load table init error:", err));

// The table may already have existed (pre-dating this feature) with
// columns too narrow or the wrong type for the values this feature writes
// (e.g. "1st Year", or a multi-day schedule string) — widen them
// defensively at boot so inserts/updates never truncate.
const ensureVarcharWidth = async (table, column, minWidth) => {
  try {
    const [cols] = await pool.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} VARCHAR(${minWidth}) NULL`);
      console.log(`[INIT] Added ${column} column to ${table}.`);
      return;
    }
    const currentWidth = parseInt(cols[0].COLUMN_TYPE.match(/\((\d+)\)/)?.[1] || "0", 10);
    const isVarchar = /^varchar\(/i.test(cols[0].COLUMN_TYPE);
    if (!isVarchar || currentWidth < minWidth) {
      await pool.query(`ALTER TABLE ${table} MODIFY COLUMN ${column} VARCHAR(${minWidth}) NULL`);
      console.log(`[INIT] Widened ${table}.${column} from ${cols[0].COLUMN_TYPE} to VARCHAR(${minWidth}).`);
    }
  } catch (err) {
    console.error(`[INIT] Could not verify/widen ${table}.${column}:`, err.message);
  }
};
ensureVarcharWidth("erd_subject_load", "year_level", 20);
ensureVarcharWidth("erd_subject_load", "sched", 255);

// All enrollments (for stats dashboard) — joined with student gender
app.get("/api/erd/enrollments", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.id, e.student_id, e.year_enrolled, e.year_level, e.semester,
              COALESCE(s.gender, '') AS gender
       FROM erd_enrollment e
       LEFT JOIN erd_student s ON e.student_id = s.id
       ORDER BY e.year_enrolled ASC,
                FIELD(e.year_level,'1st Year','2nd Year','3rd Year','4th Year') ASC,
                FIELD(e.semester,'1st Semester','2nd Semester') ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch all enrollment records." });
  }
});

// Count enrolled students for a specific section + semester + year + year_level (term-based)
app.get("/api/erd/enrollments/count", async (req, res) => {
  try {
    const { section, semester, year_enrolled, year_level } = req.query;
    if (!section || !semester) return res.json({ count: 0, max_students: null });
    const semMap = { "1": "1st Semester", "2": "2nd Semester", "S": "Summer" };
    const semLabel = semMap[String(semester)] || semester;
    // Build dynamic WHERE clause
    let cntWhere = "WHERE s.section = ? AND e.semester = ?";
    const cntParams = [section, semLabel];
    if (year_enrolled) { cntWhere += " AND e.year_enrolled = ?"; cntParams.push(year_enrolled); }
    if (year_level)    { cntWhere += " AND s.year_level = ?";   cntParams.push(year_level); }
    const [rows] = await pool.query(
      `SELECT COUNT(DISTINCT e.student_id) AS cnt
       FROM erd_enrollment e
       JOIN erd_student s ON s.id = e.student_id
       ${cntWhere}`,
      cntParams
    );
    // Get max_students from erd_section
    const [[sec]] = await pool.query("SELECT max_students FROM erd_section WHERE name=?", [section]);
    res.json({ count: rows[0].cnt || 0, max_students: sec ? sec.max_students : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to count enrollments." });
  }
});

app.get("/api/erd/enrollments/:studentId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, student_id, year_enrolled, year_level, semester, created_at
       FROM erd_enrollment
       WHERE student_id = ?
       ORDER BY year_enrolled ASC, FIELD(year_level, '1st Year', '2nd Year', '3rd Year', '4th Year') ASC, FIELD(semester, '1st Semester', '2nd Semester') ASC`,
      [req.params.studentId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch enrollment records." });
  }
});

app.post("/api/erd/enrollments", async (req, res) => {
  const { student_id, year_enrolled, year_level, semester } = req.body;
  if (!student_id || !year_enrolled || !year_level || !semester) {
    return res.status(400).json({ message: "student_id, year_enrolled, year_level, and semester are all required." });
  }
  try {
    // Count prior enrollments to determine classification
    const [[{ priorCount }]] = await pool.query(
      "SELECT COUNT(*) AS priorCount FROM erd_enrollment WHERE student_id = ?",
      [student_id]
    );
    const newClassification = priorCount === 0 ? "New" : "Old";

    // Enforce block capacity limit (term-based, filtered by year_level)
    const [[studentRow2]] = await pool.query("SELECT section FROM erd_student WHERE id=?", [student_id]);
    const section = studentRow2?.section;
    if (section) {
      const [[secRow]] = await pool.query("SELECT max_students FROM erd_section WHERE name=?", [section]);
      if (secRow && secRow.max_students !== null) {
        const [[{ cnt }]] = await pool.query(
          `SELECT COUNT(DISTINCT e.student_id) AS cnt
           FROM erd_enrollment e
           JOIN erd_student s ON s.id = e.student_id
           WHERE s.section = ? AND e.semester = ? AND e.year_enrolled = ?
             ${year_level ? "AND s.year_level = ?" : ""}`,
          year_level ? [section, semester, year_enrolled, year_level] : [section, semester, year_enrolled]
        );
        if (cnt >= secRow.max_students) {
          return res.status(409).json({
            message: `Section "${section}" has reached its enrollment limit of ${secRow.max_students} for this term. Please enroll in another section.`,
            limitReached: true,
          });
        }
      }
    }

    const [result] = await pool.query(
      `INSERT INTO erd_enrollment (student_id, year_enrolled, year_level, semester)
       VALUES (?, ?, ?, ?)`,
      [student_id, year_enrolled, year_level, semester]
    );

    // Auto-update classification on the student record
    await pool.query(
      "UPDATE erd_student SET classification = ? WHERE id = ?",
      [newClassification, student_id]
    );

    res.status(201).json({ message: "Enrollment record created.", id: result.insertId, classification: newClassification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create enrollment record." });
  }
});

app.delete("/api/erd/enrollments/:id", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Cascade: deleting an enrollment record also removes that term's grades,
    // so it disappears from the student's My Grades view.
    const [[enr]] = await conn.query(
      "SELECT student_id, year_enrolled, semester FROM erd_enrollment WHERE id = ?",
      [req.params.id]
    );
    if (enr) {
      const semNum = /2nd/i.test(enr.semester) ? 2 : /summer/i.test(enr.semester) ? 3 : 1;
      await conn.query(
        "DELETE FROM erd_grades WHERE student_id = ? AND year_start = ? AND semester = ?",
        [enr.student_id, enr.year_enrolled, semNum]
      );
    }
    await conn.query("DELETE FROM erd_enrollment WHERE id = ?", [req.params.id]);
    await conn.commit();
    res.json({ message: "Enrollment record and its grades deleted." });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Failed to delete enrollment record." });
  } finally {
    conn.release();
  }
});
// --- STARTUP DATA INTEGRITY MIGRATIONS ---
// 1. Backfill erd_user_roles for erd_users rows with no role entry yet
//    (accounts created before multi-role support). Without this those users
//    get roleArr=[] and are filtered OUT of the Users management list.
// 2. Sync erd_users rows whose primary role is 'student' into erd_student
//    so they appear in the Students list (AddStudents / Registrar).
(async () => {
  try {
    // ensure erd_user_roles exists before querying it
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erd_user_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        users_id INT NOT NULL,
        user_type_id INT NOT NULL,
        FOREIGN KEY (users_id) REFERENCES erd_users(id) ON DELETE CASCADE,
        FOREIGN KEY (user_type_id) REFERENCES erd_user_type(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_user_role (users_id, user_type_id)
      )
    `);

    // 1 - backfill missing erd_user_roles from each user's primary user_type_id
    const [orphanUsers] = await pool.query(`
      SELECT u.id AS users_id, u.user_type_id
      FROM erd_users u
      WHERE NOT EXISTS (
        SELECT 1 FROM erd_user_roles ur WHERE ur.users_id = u.id
      )
    `);
    for (const u of orphanUsers) {
      try {
        await pool.query(
          'INSERT IGNORE INTO erd_user_roles (users_id, user_type_id) VALUES (?, ?)',
          [u.users_id, u.user_type_id]
        );
        console.log(`[INIT] Backfilled erd_user_roles for users_id=${u.users_id}`);
      } catch (e) { console.error('[INIT] role backfill:', e.message); }
    }

    // 2 - sync student-role erd_users into erd_student
    const [studentAccounts] = await pool.query(`
      SELECT u.id AS users_id, u.first_name, u.middle_name, u.last_name,
             u.gender, u.profile_picture
      FROM erd_users u
      JOIN erd_user_type ut ON u.user_type_id = ut.id
      WHERE LOWER(ut.user_type) = 'student'
        AND NOT EXISTS (SELECT 1 FROM erd_student s WHERE s.users_id = u.id)
    `);
    for (const u of studentAccounts) {
      try {
        await pool.query(
          `INSERT INTO erd_student
             (users_id, first_name, middle_name, last_name, gender, profile_picture,
              student_number)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [u.users_id, u.first_name, u.middle_name, u.last_name, u.gender,
           u.profile_picture, `STU-${u.users_id}`]
        );
        console.log(`[INIT] Synced student erd_users id=${u.users_id} into erd_student`);
      } catch (e) { console.error('[INIT] student sync:', e.message); }
    }
  } catch (err) {
    console.error('[INIT] Data integrity migration error:', err.message);
  }
})();

// erd_student.graduation_status column
(async () => {
  try {
    const [[r]] = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='erd_student' AND COLUMN_NAME='graduation_status'"
    );
    if (!r) {
      await pool.query("ALTER TABLE erd_student ADD COLUMN graduation_status VARCHAR(20) NULL");
      console.log('[INIT] Added graduation_status to erd_student.');
    }
  } catch(e) { console.error('[INIT] graduation_status migration:', e.message); }
})();

// erd_student name-copy migration: for any erd_student row where first_name
// is still NULL (legacy rows linked via users_id), copy the name/gender/photo
// directly into erd_student then sever the users_id link so the student list
// no longer depends on erd_users for its data.
(async () => {
  try {
    await pool.query(`
      UPDATE erd_student s
      JOIN erd_users u ON u.id = s.users_id
      SET s.first_name      = COALESCE(s.first_name,      u.first_name),
          s.middle_name     = COALESCE(s.middle_name,     u.middle_name),
          s.last_name       = COALESCE(s.last_name,       u.last_name),
          s.gender          = COALESCE(s.gender,          u.gender),
          s.profile_picture = COALESCE(s.profile_picture, u.profile_picture),
          s.users_id        = NULL
      WHERE s.users_id IS NOT NULL
        AND (s.first_name IS NULL OR s.last_name IS NULL)
    `);
    console.log('[INIT] Legacy erd_student rows migrated: names copied from erd_users, users_id unlinked.');
  } catch (err) {
    console.error('[INIT] erd_student name-copy migration error:', err.message);
  }
})();
