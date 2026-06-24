import "dotenv/config";
import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.0.118:5173",
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin not allowed: ${origin}`));
      }
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

// ─── AUTHENTICATION GATEWAY ──────────────────────────────────────────────────
app.post("/api/erd/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.query(
      `SELECT u.id, l.username, ut.user_type AS role, u.is_active
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
    res.json({ id: rows[0].id, username: rows[0].username, role: rows[0].role, status: rows[0].is_active ? "Active" : "Suspended" });
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

app.delete("/api/erd/courses/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM erd_course WHERE id = ?", [req.params.id]);
    res.json({ message: "Course deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete course." });
  }
});
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
app.get("/api/erd/students", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.student_number, s.year_level, s.section, s.year_enrolled, s.created_at,
              s.users_id,
              COALESCE(s.first_name,  u.first_name)       AS first_name,
              COALESCE(s.middle_name, u.middle_name)      AS middle_name,
              COALESCE(s.last_name,   u.last_name)        AS last_name,
              COALESCE(s.gender,      u.gender)           AS gender,
              COALESCE(s.profile_picture, u.profile_picture) AS profile_picture,
              c.course
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
      birthday: null, age: null, sex: r.gender || null, address: null, adviser: null
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to extract active scholar matrix rows." });
  }
});

app.post("/api/erd/students", async (req, res) => {
  const { first_name, middle_name, last_name, course, student_number, profile_picture, year_level, section, year_enrolled, gender } = req.body;

  if (!first_name || !last_name || !student_number) {
    return res.status(400).json({ message: "first_name, last_name, and student_number are required." });
  }

  try {
    let courseId = null;
    if (course) {
      const [[courseRow]] = await pool.query("SELECT id FROM erd_course WHERE course = ?", [course]);
      courseId = courseRow ? courseRow.id : null;
    }

    // Store all student data directly in erd_student — no erd_users row needed.
    const [studentResult] = await pool.query(
      `INSERT INTO erd_student
         (first_name, middle_name, last_name, gender, profile_picture,
          student_number, course_id, year_level, section, year_enrolled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, middle_name || null, last_name, gender || null, profile_picture || null,
       student_number, courseId, year_level || null, section || null,
       year_enrolled ? parseInt(year_enrolled, 10) : null]
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
  const { first_name, middle_name, last_name, course, student_number, profile_picture, year_level, section, year_enrolled, gender } = req.body;

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

    // Update personal info + academic info directly in erd_student
    await pool.query(
      `UPDATE erd_student
       SET first_name=?, middle_name=?, last_name=?, gender=?,
           profile_picture=?, student_number=?, course_id=?,
           year_level=?, section=?, year_enrolled=?
       WHERE id=?`,
      [first_name, middle_name || null, last_name, gender || null,
       profile_picture || null, student_number, courseId,
       year_level || null, section || null,
       year_enrolled ? parseInt(year_enrolled, 10) : null, id]
    );

    // Also sync to linked erd_users row if one exists (backward compat)
    if (studentRow.users_id) {
      await pool.query(
        "UPDATE erd_users SET first_name=?, middle_name=?, last_name=?, gender=?, profile_picture=? WHERE id=?",
        [first_name, middle_name || null, last_name, gender || null, profile_picture || null, studentRow.users_id]
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
app.get("/api/erd/subjects", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT sub.id, sub.subject, sub.credits, sub.subject_code, sub.semester,
              IFNULL(sub.year_level, NULL) AS year_level, c.course
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
      year_level: r.year_level || null
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load structural academic catalog subjects." });
  }
});

app.post("/api/erd/subjects", async (req, res) => {
  const { subject_title, units, subject_code, course, semester, year_level } = req.body;
  try {
    let courseId = null;
    if (course) {
      const [[courseRow]] = await pool.query("SELECT id FROM erd_course WHERE course = ?", [course]);
      courseId = courseRow ? courseRow.id : null;
    }
    await pool.query(
      "INSERT INTO erd_subjects (subject, credits, subject_code, course_id, semester, year_level) VALUES (?, ?, ?, ?, ?, ?)",
      [subject_title, parseInt(units, 10) || 3, subject_code || null, courseId, semester ? parseInt(semester, 10) : null, year_level || null]
    );
    res.status(201).json({ message: "Reference subject card attached to registry." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to register curriculum target code." });
  }
});

app.put("/api/erd/subjects/:id", async (req, res) => {
  const { id } = req.params;
  const { subject_title, units, subject_code, course, semester, year_level } = req.body;
  try {
    let courseId = null;
    if (course) {
      const [[courseRow]] = await pool.query("SELECT id FROM erd_course WHERE course = ?", [course]);
      courseId = courseRow ? courseRow.id : null;
    }
    await pool.query(
      "UPDATE erd_subjects SET subject=?, credits=?, subject_code=?, course_id=?, semester=?, year_level=? WHERE id=?",
      [subject_title, parseInt(units, 10) || 3, subject_code || null, courseId, semester ? parseInt(semester, 10) : null, year_level || null, id]
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
app.get("/api/erd/grades/:studentId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT eg.*, sub.subject AS subject_title, sub.credits AS units
       FROM erd_grades eg
       JOIN erd_subjects sub ON eg.subject_id = sub.id
       WHERE eg.student_id = ? ORDER BY eg.semester ASC, sub.subject ASC`,
      [req.params.studentId]
    );
    res.json(rows.map(r => ({ ...r, subject_code: null })));
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
`).catch(err => console.error("erd_enrollment table init error:", err));

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

app.get("/api/erd/enrollments/:studentId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, student_id, year_enrolled, year_level, semester, created_at
       FROM erd_enrollment
       WHERE student_id = ?
       ORDER BY year_enrolled ASC, FIELD(semester, '1st Semester', '2nd Semester') ASC`,
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
    const [result] = await pool.query(
      `INSERT INTO erd_enrollment (student_id, year_enrolled, year_level, semester)
       VALUES (?, ?, ?, ?)`,
      [student_id, year_enrolled, year_level, semester]
    );
    res.status(201).json({ message: "Enrollment record created.", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create enrollment record." });
  }
});

app.delete("/api/erd/enrollments/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM erd_enrollment WHERE id = ?", [req.params.id]);
    res.json({ message: "Enrollment record deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete enrollment record." });
  }
});