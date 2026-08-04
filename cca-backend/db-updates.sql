-- ─────────────────────────────────────────────────────────────
--  CCA Portal — database updates (run in MySQL Workbench)
--  Safe to run multiple times. Target database: cca_portal
-- ─────────────────────────────────────────────────────────────
USE cca_portal;

-- 1) Dates to Remember (shown on every student dashboard)
CREATE TABLE IF NOT EXISTS erd_dates_remember (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(150) NOT NULL,
  date_text  VARCHAR(120) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2) Student Announcements (shown on every student dashboard)
CREATE TABLE IF NOT EXISTS erd_student_announcements (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(150) NOT NULL,
  body       TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3) Scholastic Requirements (configurable checklist for Student Information)
CREATE TABLE IF NOT EXISTS erd_scholastic_requirements (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3a) Seed the default requirements (only inserts if not already present)
INSERT IGNORE INTO erd_scholastic_requirements (name, sort_order) VALUES
  ('Form 138', 0),
  ('Birth Certificate (PSA)', 1),
  ('Good Moral Certificate', 2),
  ('Medical Certificate', 3),
  ('Honorable Dismissal / Transfer Credential', 4),
  ('2x2 ID Photos', 5);

-- 4) Allow a student photo (data-URL) to be stored on the student record
ALTER TABLE erd_student MODIFY COLUMN profile_picture LONGTEXT NULL;
