package main

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

func main() {
	absPath, _ := filepath.Abs(".")
	dbPath := filepath.Join(absPath, "agora-data", "agora.db")
	db, _ := sql.Open("sqlite", dbPath)
	defer db.Close()

	rows, _ := db.Query("SELECT id, title, file_path FROM documents")
	defer rows.Close()
	for rows.Next() {
		var id int64
		var t, fp string
		rows.Scan(&id, &t, &fp)
		fmt.Printf("id=%d title=%q file=%s\n", id, t, fp)
	}
}
