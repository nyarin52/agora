package main

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "-check" {
		check()
		return
	}

	absPath, _ := filepath.Abs(".")
	dbPath := filepath.Join(absPath, "..", "agora-db", "agora.db")
	os.MkdirAll(filepath.Dir(dbPath), 0755)

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, "open db:", err)
		os.Exit(1)
	}
	defer db.Close()

	migrate(db)

	// Upsert Agora project and merge duplicates
	seedAgora(db)
}

func seedAgora(db *sql.DB) {
	// Find the oldest Agora project row to update (keep id=1 if exists)
	var id int64
	db.QueryRow(`SELECT id FROM projects WHERE name = 'Agora' ORDER BY id ASC LIMIT 1`).Scan(&id)

	progress := readProgressFile(db)

	if id > 0 {
		db.Exec(`UPDATE projects SET github_owner='nyarin52', github_repo='agora', repository_url='https://github.com/nyarin52/agora', description='Personal Dev Hub', progress=? WHERE id=?`, progress, id)
		// Delete any duplicate Agora rows
		db.Exec(`DELETE FROM projects WHERE name='Agora' AND id != ?`, id)
		fmt.Printf("Updated Agora project (id=%d) with GitHub link + progress, cleaned duplicates\n", id)
	} else {
		db.Exec(`INSERT INTO projects (name, description, github_owner, github_repo, repository_url, status, tags, progress) VALUES ('Agora', 'Personal Dev Hub', 'nyarin52', 'agora', 'https://github.com/nyarin52/agora', 'active', '[]', ?)`, progress)
		fmt.Println("Created Agora project with GitHub link + progress")
	}
}

func readProgressFile(db *sql.DB) string {
	// Try absolute path from backend/, fall back to project root
	candidates := []string{
		filepath.Join("..", "docs", "PROGRESS.md"),
		filepath.Join("docs", "PROGRESS.md"),
	}

	absPath, _ := filepath.Abs(".")
	for _, rel := range candidates {
		p := filepath.Join(absPath, rel)
		data, err := os.ReadFile(p)
		if err == nil {
			fmt.Printf("Loaded progress from %s\n", rel)
			return string(data)
		}
	}

	fmt.Println("WARNING: PROGRESS.md not found, progress field will be empty")
	return ""
}

func check() {
	absPath, _ := filepath.Abs(".")
	dbPath := filepath.Join(absPath, "..", "agora-db", "agora.db")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, "open db:", err)
		os.Exit(1)
	}
	defer db.Close()

	rows, err := db.Query("SELECT id, name, description, github_owner, github_repo, repository_url, status, coalesce(length(progress),0), substr(progress,1,60) FROM projects")
	if err != nil {
		fmt.Fprintln(os.Stderr, "query:", err)
		os.Exit(1)
	}
	defer rows.Close()

	for rows.Next() {
		var id int64
		var name, desc, owner, repo, url, status string
		var progressLen int
		var progressPreview string
		if err := rows.Scan(&id, &name, &desc, &owner, &repo, &url, &status, &progressLen, &progressPreview); err != nil {
			fmt.Fprintln(os.Stderr, "scan:", err)
			os.Exit(1)
		}
		fmt.Printf("id=%-2d  name=%-10s  desc=%-25s  owner=%-12s  repo=%-8s  url=%-40s  status=%s  progress_len=%d  preview=%s\n",
			id, name, desc, owner, repo, url, status, progressLen, progressPreview)
	}
}

func migrate(db *sql.DB) {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS projects (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT DEFAULT '',
			github_owner TEXT DEFAULT '',
			github_repo TEXT DEFAULT '',
			repository_url TEXT DEFAULT '',
			root_path TEXT DEFAULT '',
			status TEXT DEFAULT 'active',
			tags TEXT DEFAULT '[]',
			progress TEXT DEFAULT '',
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
			fmt.Fprintf(os.Stderr, "migration failed: %v\nSQL: %s\n", err, q)
			os.Exit(1)
		}
	}

	// Add columns missing from older DBs (idempotent)
	db.Exec(`ALTER TABLE projects ADD COLUMN root_path TEXT DEFAULT ''`)
	db.Exec(`ALTER TABLE projects ADD COLUMN repository_url TEXT DEFAULT ''`)
	db.Exec(`ALTER TABLE projects ADD COLUMN progress TEXT DEFAULT ''`)
}
