package main

import (
	"database/sql"
	"fmt"
	"path/filepath"

	_ "modernc.org/sqlite"
)

func main() {
	absRoot, _ := filepath.Abs("..")
	absRoot = filepath.Dir(filepath.Dir(absRoot))

	db, _ := sql.Open("sqlite", filepath.Join(absRoot, "agora-db", "agora.db"))
	defer db.Close()

	db.Exec(`UPDATE projects SET description = '个人开发中心 — 管理软件项目、文档与技能' WHERE id = 1`)
	fmt.Println("OK")
}
