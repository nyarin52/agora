package handler

import (
	"agora/internal/protocol"
	"database/sql"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/go-chi/chi/v5"
)

// SyncProject scans .agora.yaml and indexes documents from the project root.
func (h *Handler) SyncProject(w http.ResponseWriter, r *http.Request) {
	projectID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)

	// Verify project exists before scanning
	var exists int
	err := h.DB.QueryRow(`SELECT 1 FROM projects WHERE id = ?`, projectID).Scan(&exists)
	if err == sql.ErrNoRows {
		respondError(w, http.StatusNotFound, "project not found")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	var req struct {
		RootPath string `json:"root_path"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	rootPath := req.RootPath
	if rootPath == "" {
		var stored string
		err := h.DB.QueryRow(`SELECT root_path FROM projects WHERE id = ?`, projectID).Scan(&stored)
		if err != nil || stored == "" {
			respondError(w, http.StatusBadRequest, "root_path is required")
			return
		}
		rootPath = stored
	}

	absRoot, err := filepath.Abs(rootPath)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid root_path")
		return
	}

	cfgPath := filepath.Join(absRoot, ".agora.yaml")
	cfg, err := protocol.LoadFromFile(cfgPath)
	if err != nil {
		respondError(w, http.StatusBadRequest, ".agora.yaml not found or invalid")
		return
	}

	repoRef, err := protocol.ParseRepository(cfg.Repository)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid repository in .agora.yaml")
		return
	}

	repoURL, ghOwner, ghRepo := "", "", ""
	if repoRef != nil {
		repoURL, ghOwner, ghRepo = repoRef.URL, repoRef.Owner, repoRef.Repo
	}

	_, err = h.DB.Exec(
		`UPDATE projects SET
			name = COALESCE(NULLIF(?, ''), name),
			description = COALESCE(NULLIF(?, ''), description),
			root_path = ?,
			repository_url = ?,
			github_owner = ?,
			github_repo = ?,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ?`,
		cfg.Name, cfg.Description, absRoot, repoURL, ghOwner, ghRepo, projectID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	scanned, err := protocol.ScanDocuments(absRoot, cfg)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to scan documents")
		return
	}

	synced := 0
	for _, doc := range scanned {
		if _, err := os.Stat(doc.FilePath); err != nil {
			continue
		}

		var existingID int64
		err := h.DB.QueryRow(
			`SELECT id FROM documents WHERE project_id = ? AND file_path = ?`,
			projectID, doc.FilePath,
		).Scan(&existingID)

		if err == sql.ErrNoRows {
			_, err = h.DB.Exec(
				`INSERT INTO documents (project_id, type, title, file_path, tags) VALUES (?, ?, ?, ?, '[]')`,
				projectID, doc.Type, doc.Title, doc.FilePath,
			)
		} else if err == nil {
			_, err = h.DB.Exec(
				`UPDATE documents SET type = ?, title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
				doc.Type, doc.Title, existingID,
			)
		}
		if err == nil {
			synced++
		}
	}

	resp := map[string]interface{}{
		"status":  "synced",
		"indexed": synced,
		"scanned": len(scanned),
		"root":    absRoot,
	}
	if repoURL != "" {
		resp["repository"] = repoURL
		resp["github_repo"] = ghOwner + "/" + ghRepo
	}
	respondJSON(w, http.StatusOK, resp)
}
