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
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		fmt.Println("failed to open db:", err)
		os.Exit(1)
	}
	defer db.Close()

	// Clean up garbled record from earlier PowerShell attempt
	db.Exec("DELETE FROM documents WHERE id = 1")

	// Write the document file
	content := `# 弹窗定位设计决策 — 全屏遮罩 vs Tab 区域居中

## 背景

Dashboard 页面的 "Add your first project" 按钮点击后跳转到 /projects?create=true，自动弹出 New Project 窗口。窗口使用固定定位 + 全屏遮罩覆盖整个页面。讨论：是否应该改为仅在 Tab 内容区域（右侧主内容区）居中。

## 讨论过程

- Q: 放在 Tab 区域中心会不会更好？
- A: 全屏遮罩更好，原因有三。

## 决策

**保持全屏中心定位。**

理由：

1. **交互模式**：弹窗是阻塞式操作，全屏遮罩覆盖侧边栏，防止用户填一半表单点走导航导致数据丢失
2. **行业惯例**：Linear、Vercel、GitHub、Figma 等所有带侧边栏的 Web 应用，弹窗均为全屏遮罩
3. **桌面场景**：Agora 是桌面管理工具，屏幕足够大，遮罩不挤，独立"微任务"体验更好

## 延伸规范

- 所有弹窗（Create / Import / New Document / New Skill）统一使用 animate-slide-up 动画
- 定位逻辑一致：fixed inset-0 bg-black/60 遮罩 + 居中内容
- 非表格/列表场景不需要"区域内弹窗"

## 日期

2026-08-01
`
	dir := filepath.Join(absPath, "agora-data", "projects", "1", "dev_note")
	os.MkdirAll(dir, 0755)
	filePath := filepath.Join(dir, "弹窗定位设计决策-20260801.md")
	os.WriteFile(filePath, []byte(content), 0644)

	// Insert DB record
	db.Exec(`INSERT INTO documents (project_id, type, title, file_path, tags) VALUES (1, 'dev_note', '弹窗定位设计决策-20260801', ?, '["UI","设计决策"]')`, filePath)

	fmt.Println("done:", filePath)
}
