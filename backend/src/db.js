import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', 'data.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

function runMigrations() {
  // Add code column to projects if not present
  const codeCol = db.prepare("PRAGMA table_info(projects)").all().find(c => c.name === 'code')
  if (!codeCol) {
    db.exec("ALTER TABLE projects ADD COLUMN code TEXT")
    // Assign codes to existing projects ordered by id
    const rows = db.prepare("SELECT id FROM projects ORDER BY id").all()
    const stmt = db.prepare("UPDATE projects SET code=? WHERE id=?")
    const tx = db.transaction(() => {
      rows.forEach((r, i) => stmt.run('P' + String(i + 1).padStart(4, '0'), r.id))
    })
    tx()
    console.log('Added code column to projects table')
  }

  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get()
  if (tableInfo && tableInfo.sql && tableInfo.sql.includes("role IN ('admin','user')")) {
    db.pragma('foreign_keys = OFF')
    // Note: DROP TABLE users removes FK constraints from dependent tables.
    // Data integrity is preserved (FK checks are OFF during migration),
    // but FK enforcement on user_id columns will not be re-enabled.
    // New databases created from initDB() have proper FK constraints.
    db.exec(`
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('admin','manager','employee')),
        created_by INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO users_new (id, username, password_hash, display_name, role, created_by, created_at)
        SELECT id, username, password_hash, display_name, 'admin', created_by, created_at FROM users WHERE role='admin';
      INSERT INTO users_new (id, username, password_hash, display_name, role, created_by, created_at)
        SELECT id, username, password_hash, display_name, 'employee', created_by, created_at FROM users WHERE role='user';
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
    `)
    db.pragma('foreign_keys = ON')
    console.log('Migrated users table: role constraint updated (admin/manager/employee)')
  }
}

export function initDB() {
  runMigrations()
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('admin','manager','employee')),
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'industrial',
      address TEXT,
      area TEXT,
      handover_date TEXT,
      developer TEXT,
      manager_name TEXT,
      manager_phone TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin','member')),
      UNIQUE(project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS buildings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS houses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
      house_number TEXT NOT NULL,
      area TEXT,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inspection_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS template_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL REFERENCES inspection_templates(id) ON DELETE CASCADE,
      item_number INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      check_standard TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    -- User-customized form definitions (cloned from system templates)
    CREATE TABLE IF NOT EXISTS user_forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      template_id INTEGER REFERENCES inspection_templates(id),
      form_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','archived')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Items within a user form (freely editable by owner)
    CREATE TABLE IF NOT EXISTS user_form_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id INTEGER NOT NULL REFERENCES user_forms(id) ON DELETE CASCADE,
      item_number INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      check_standard TEXT NOT NULL,
      source_item_id INTEGER,
      sort_order INTEGER DEFAULT 0
    );

    -- Equipment archive for key equipment tracking
    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
      house_id INTEGER REFERENCES houses(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      category TEXT,
      model TEXT,
      serial_number TEXT,
      install_date TEXT,
      location TEXT,
      status TEXT DEFAULT 'normal' CHECK(status IN ('normal','maintenance','repair','scrapped')),
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Template access control (admin assigns templates to users)
    CREATE TABLE IF NOT EXISTS user_template_access (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      template_id INTEGER NOT NULL REFERENCES inspection_templates(id) ON DELETE CASCADE,
      granted_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, template_id)
    );

    -- Equipment access control
    CREATE TABLE IF NOT EXISTS equipment_access (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      granted_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, project_id)
    );

    CREATE TABLE IF NOT EXISTS inspection_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_form_id INTEGER REFERENCES user_forms(id) ON DELETE CASCADE,
      template_id INTEGER NOT NULL REFERENCES inspection_templates(id),
      building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
      house_id INTEGER REFERENCES houses(id) ON DELETE SET NULL,
      location_info TEXT,
      inspector_comment TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed')),
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inspection_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL REFERENCES inspection_records(id) ON DELETE CASCADE,
      user_form_item_id INTEGER REFERENCES user_form_items(id) ON DELETE SET NULL,
      template_item_id INTEGER REFERENCES template_items(id) ON DELETE SET NULL,
      custom_item_name TEXT,
      custom_standard TEXT,
      result TEXT DEFAULT 'pending' CHECK(result IN ('pending','pass','fail','skip')),
      problem_description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inspection_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL REFERENCES inspection_records(id) ON DELETE CASCADE,
      result_id INTEGER REFERENCES inspection_results(id) ON DELETE SET NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      uploaded_by INTEGER REFERENCES users(id),
      uploaded_at TEXT DEFAULT (datetime('now'))
    );
  `)
}

export default db
