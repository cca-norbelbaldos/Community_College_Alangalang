// ─────────────────────────────────────────────────────────────────────────────
//  cleanup-grades.js — one-shot maintenance for erd_grades
//
//  Connects using the SAME database config as server.js (cca-backend/.env), so it
//  operates on the exact database your app reads from.
//
//  Usage (run inside cca-backend):
//     node cleanup-grades.js                 → show all grades (no changes)
//     node cleanup-grades.js --orphans       → delete grades whose student no longer exists
//     node cleanup-grades.js --dupes         → delete duplicate rows (keep newest per student+subject+sem+year)
//     node cleanup-grades.js --student 1      → show that student's grades
//     node cleanup-grades.js --student 1 --year 2026        → DELETE that student's 2026 grades
//     node cleanup-grades.js --student 1 --delete-all       → DELETE all of that student's grades
//
//  Nothing is deleted unless you pass a delete flag. Every run prints what it did.
// ─────────────────────────────────────────────────────────────────────────────
import "dotenv/config";
import mysql from "mysql2/promise";

const args = process.argv.slice(2);
const has  = (f) => args.includes(f);
const val  = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

const studentId  = val("--student");
const year       = val("--year");
const doOrphans  = has("--orphans");
const doDupes    = has("--dupes");
const doDeleteAll= has("--delete-all");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "cca_portal",
});

async function show(where = "", params = []) {
  const [rows] = await pool.query(
    `SELECT g.id, g.student_id, s.student_number,
            CONCAT(IFNULL(s.first_name,''),' ',IFNULL(s.last_name,'')) AS name,
            sub.subject_code, sub.subject AS title,
            g.grade, g.semester, g.year_start
     FROM erd_grades g
     LEFT JOIN erd_student  s ON g.student_id = s.id
     LEFT JOIN erd_subjects sub ON g.subject_id = sub.id
     ${where}
     ORDER BY g.student_id, g.year_start DESC, g.semester`,
    params
  );
  console.table(rows.map(r => ({
    id: r.id, student_id: r.student_id, student: (r.name || "").trim() || "(deleted)",
    code: r.subject_code, grade: r.grade, sem: r.semester, year: r.year_start,
  })));
  return rows;
}

(async () => {
  try {
    console.log(`\nDatabase: ${process.env.DB_NAME || "cca_portal"} @ ${process.env.DB_HOST || "localhost"}\n`);

    if (doOrphans) {
      const [r] = await pool.query(
        `DELETE g FROM erd_grades g
         LEFT JOIN erd_student s ON g.student_id = s.id
         WHERE s.id IS NULL`
      );
      console.log(`🗑  Deleted ${r.affectedRows} orphaned grade row(s) (student no longer exists).`);
    }

    if (doDupes) {
      const [r] = await pool.query(
        `DELETE g1 FROM erd_grades g1
         JOIN erd_grades g2
           ON g1.student_id = g2.student_id AND g1.subject_id = g2.subject_id
          AND IFNULL(g1.semester,1)=IFNULL(g2.semester,1)
          AND IFNULL(g1.year_start,0)=IFNULL(g2.year_start,0)
          AND g1.id < g2.id`
      );
      console.log(`🗑  Deleted ${r.affectedRows} duplicate grade row(s).`);
    }

    if (studentId && doDeleteAll) {
      const [r] = await pool.query(`DELETE FROM erd_grades WHERE student_id = ?`, [studentId]);
      console.log(`🗑  Deleted ${r.affectedRows} grade row(s) for student ${studentId}.`);
    } else if (studentId && year) {
      const [r] = await pool.query(`DELETE FROM erd_grades WHERE student_id = ? AND year_start = ?`, [studentId, year]);
      console.log(`🗑  Deleted ${r.affectedRows} grade row(s) for student ${studentId}, S.Y. ${year}.`);
    }

    console.log("\n── Remaining grades ──");
    if (studentId) await show("WHERE g.student_id = ?", [studentId]);
    else await show();

    console.log("\nDone.\n");
  } catch (err) {
    console.error("Cleanup failed:", err.message);
  } finally {
    await pool.end();
  }
})();
