package database

import (
	"agora/internal/config"
	"database/sql"
	"fmt"
	"log"

	_ "modernc.org/sqlite"
)

func New(cfg *config.Config) *sql.DB {
	db, err := sql.Open("sqlite", cfg.DBPath)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}

	db.SetMaxOpenConns(1) // SQLite single-writer limitation

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}

	if err := migrate(db); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	log.Printf("database initialized at %s", cfg.DBPath)
	return db
}

func migrate(db *sql.DB) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS projects (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT DEFAULT '',
			github_owner TEXT DEFAULT '',
			github_repo TEXT DEFAULT '',
			status TEXT DEFAULT 'active',
			tags TEXT DEFAULT '[]',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS documents (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			project_id INTEGER NOT NULL,
			type TEXT NOT NULL,
			title TEXT NOT NULL,
			file_path TEXT NOT NULL,
			tags TEXT DEFAULT '[]',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS skills (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			description TEXT DEFAULT '',
			category TEXT DEFAULT '',
			config_template TEXT DEFAULT '{}'
		)`,
		`CREATE TABLE IF NOT EXISTS project_skills (
			project_id INTEGER NOT NULL,
			skill_id INTEGER NOT NULL,
			usage_notes TEXT DEFAULT '',
			PRIMARY KEY (project_id, skill_id),
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
			FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS dependencies (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			project_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			version TEXT DEFAULT '',
			ecosystem TEXT DEFAULT '',
			is_direct INTEGER DEFAULT 1,
			last_scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS dev_contexts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			project_id INTEGER NOT NULL UNIQUE,
			current_branch TEXT DEFAULT '',
			current_task TEXT DEFAULT '',
			notes TEXT DEFAULT '',
			last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
		)`,
	}

	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			return fmt.Errorf("migration failed: %w\nSQL: %s", err, q)
		}
	}

	// Add root_path column if missing (idempotent)
	db.Exec(`ALTER TABLE projects ADD COLUMN root_path TEXT DEFAULT ''`)
	db.Exec(`ALTER TABLE projects ADD COLUMN repository_url TEXT DEFAULT ''`)

	return nil
}
