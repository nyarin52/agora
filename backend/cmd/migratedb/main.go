package main

import (
	"database/sql"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"

	_ "modernc.org/sqlite"
)

func main() {
	root := ".." // running from backend/cmd/migratedb/
	absRoot, _ := filepath.Abs(root)
	absRoot = filepath.Dir(filepath.Dir(absRoot)) // project root

	oldDBPath := filepath.Join(absRoot, "agora-data", "agora.db")
	dataDir := filepath.Join(absRoot, "agora-data")
	dbDir := filepath.Join(absRoot, "agora-db")
	newDBPath := filepath.Join(dbDir, "agora.db")

	log.Printf("Project root: %s", absRoot)
	log.Printf("Old DB:       %s", oldDBPath)
	log.Printf("New DB:       %s", newDBPath)
	log.Printf("Data dir:     %s", dataDir)

	// Step 1: Read existing projects from old DB
	oldDB, err := sql.Open("sqlite", oldDBPath)
	if err != nil {
		log.Fatalf("Failed to open old DB: %v", err)
	}
	defer oldDB.Close()

	type project struct {
		id   int64
		name string
	}
	var projects []project
	rows, err := oldDB.Query(`SELECT id, name FROM projects`)
	if err != nil {
		log.Fatalf("Failed to query projects: %v", err)
	}
	for rows.Next() {
		var p project
		if err := rows.Scan(&p.id, &p.name); err != nil {
			log.Fatalf("Failed to scan project: %v", err)
		}
		projects = append(projects, p)
		log.Printf("Found project: id=%d name=%s", p.id, p.name)
	}
	rows.Close()

	// Step 2: Rename project directories from {id} to sanitized {name}
	// Also collect mapping for DB update
	type renameEntry struct {
		oldDir string
		newDir string
	}
	var renames []renameEntry

	for _, p := range projects {
		safeName := sanitizeName(p.name)
		oldDir := filepath.Join(dataDir, "projects", fmt.Sprintf("%d", p.id))
		newDir := filepath.Join(dataDir, "projects", safeName)

		if oldDir == newDir {
			log.Printf("  Skip %s (id equals name)", oldDir)
			continue
		}

		if _, err := os.Stat(oldDir); os.IsNotExist(err) {
			log.Printf("  Skip %s (does not exist)", oldDir)
			continue
		}

		log.Printf("  Rename: %s -> %s", oldDir, newDir)
		if err := os.Rename(oldDir, newDir); err != nil {
			log.Printf("  WARN: rename failed: %v", err)
			continue
		}
		renames = append(renames, renameEntry{oldDir, newDir})
	}

	// Step 3: Create agora-db dir
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		log.Fatalf("Failed to create db dir: %v", err)
	}

	// Step 4: Copy DB file to new location
	if err := copyFile(oldDBPath, newDBPath); err != nil {
		log.Fatalf("Failed to copy DB: %v", err)
	}
	log.Printf("DB copied to %s", newDBPath)

	// Step 5: Update file_path fields in new DB
	newDB, err := sql.Open("sqlite", newDBPath)
	if err != nil {
		log.Fatalf("Failed to open new DB: %v", err)
	}
	defer newDB.Close()

	for _, rn := range renames {
		oldPrefix := strings.ReplaceAll(rn.oldDir, "\\", "/")
		newPrefix := strings.ReplaceAll(rn.newDir, "\\", "/")

		rows, err := newDB.Query(`SELECT id, file_path FROM documents WHERE file_path LIKE ?`, oldPrefix+"%")
		if err != nil {
			log.Printf("  WARN: query documents failed: %v", err)
			continue
		}
		for rows.Next() {
			var docID int64
			var filePath string
			rows.Scan(&docID, &filePath)
			newPath := strings.Replace(filePath, oldPrefix, newPrefix, 1)
			log.Printf("  Update doc %d: %s -> %s", docID, filePath, newPath)
			newDB.Exec(`UPDATE documents SET file_path = ? WHERE id = ?`, newPath, docID)
		}
		rows.Close()
	}

	log.Println("Migration complete!")
}

func sanitizeName(name string) string {
	replacer := strings.NewReplacer(
		"/", "-", "\\", "-", ":", "-", "*", "",
		"?", "", "\"", "", "<", "", ">", "", "|", "",
		" ", "_",
	)
	return replacer.Replace(name)
}

func copyFile(src, dst string) error {
	s, err := os.Open(src)
	if err != nil {
		return err
	}
	defer s.Close()

	d, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer d.Close()

	_, err = io.Copy(d, s)
	return err
}
