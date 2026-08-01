package handler

import (
	"agora/internal/model"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) ListDocuments(w http.ResponseWriter, r *http.Request) {
	projectID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	docType := r.URL.Query().Get("type")

	query := `SELECT id, project_id, type, title, file_path, tags, created_at, updated_at FROM documents WHERE project_id = ?`
	args := []interface{}{projectID}
	if docType != "" {
		query += ` AND type = ?`
		args = append(args, docType)
	}
	query += ` ORDER BY updated_at DESC`

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	defer rows.Close()

	docs := []model.Document{}
	for rows.Next() {
		var d model.Document
		if err := rows.Scan(&d.ID, &d.ProjectID, &d.Type, &d.Title, &d.FilePath, &d.Tags, &d.CreatedAt, &d.UpdatedAt); err != nil {
			respondError(w, http.StatusInternalServerError, "internal server error")
			return
		}
		docs = append(docs, d)
	}
	respondJSON(w, http.StatusOK, docs)
}

func (h *Handler) GetDocument(w http.ResponseWriter, r *http.Request) {
	projectID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	docID, _ := strconv.ParseInt(chi.URLParam(r, "docID"), 10, 64)
	var d model.Document
	err := h.DB.QueryRow(
		`SELECT id, project_id, type, title, file_path, tags, created_at, updated_at FROM documents WHERE id = ? AND project_id = ?`,
		docID, projectID,
	).Scan(&d.ID, &d.ProjectID, &d.Type, &d.Title, &d.FilePath, &d.Tags, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		respondError(w, http.StatusNotFound, "document not found")
		return
	}
	respondJSON(w, http.StatusOK, d)
}

func (h *Handler) ReadDocumentContent(w http.ResponseWriter, r *http.Request) {
	projectID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	docID, _ := strconv.ParseInt(chi.URLParam(r, "docID"), 10, 64)

	var filePath, rootPath string
	err := h.DB.QueryRow(
		`SELECT d.file_path, COALESCE(p.root_path, '') FROM documents d
		JOIN projects p ON p.id = d.project_id
		WHERE d.id = ? AND d.project_id = ?`,
		docID, projectID,
	).Scan(&filePath, &rootPath)
	if err != nil {
		respondError(w, http.StatusNotFound, "document not found")
		return
	}

	// Validate file_path is under project root_path to prevent path traversal
	if rootPath == "" {
		respondError(w, http.StatusBadRequest, "project root_path is not set")
		return
	}
	absRoot, err := filepath.Abs(rootPath)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "invalid project root_path")
		return
	}
	absFile, err := filepath.Abs(filePath)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "invalid document file_path")
		return
	}
	if !strings.HasPrefix(absFile, absRoot+string(filepath.Separator)) && absFile != absRoot {
		respondError(w, http.StatusForbidden, "file_path is outside project root")
		return
	}

	content, err := os.ReadFile(filePath)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to read document content")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"content": string(content)})
}

// CreateDocument creates a metadata-only record pointing to an external document.
// No files are written — documents live in their own project repos.
func (h *Handler) CreateDocument(w http.ResponseWriter, r *http.Request) {
	projectID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)

	var req struct {
		Type     string `json:"type"`
		Title    string `json:"title"`
		FilePath string `json:"file_path"`
		Tags     string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Type == "" || req.Title == "" || req.FilePath == "" {
		respondError(w, http.StatusBadRequest, "type, title, and file_path are required")
		return
	}

	tags := req.Tags
	if tags == "" {
		tags = "[]"
	}

	result, err := h.DB.Exec(
		`INSERT INTO documents (project_id, type, title, file_path, tags) VALUES (?, ?, ?, ?, ?)`,
		projectID, req.Type, req.Title, req.FilePath, tags,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	id, _ := result.LastInsertId()

	respondJSON(w, http.StatusCreated, model.Document{
		ID:        id,
		ProjectID: projectID,
		Type:      req.Type,
		Title:     req.Title,
		FilePath:  req.FilePath,
		Tags:      tags,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	})
}

// UpdateDocument updates metadata only (title, tags). Does not modify the file.
func (h *Handler) UpdateDocument(w http.ResponseWriter, r *http.Request) {
	projectID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	docID, _ := strconv.ParseInt(chi.URLParam(r, "docID"), 10, 64)

	var req struct {
		Title    string `json:"title"`
		Type     string `json:"type"`
		FilePath string `json:"file_path"`
		Tags     string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Build dynamic UPDATE
	query := `UPDATE documents SET updated_at = CURRENT_TIMESTAMP`
	args := []interface{}{}
	if req.Title != "" {
		query += `, title = ?`
		args = append(args, req.Title)
	}
	if req.Type != "" {
		query += `, type = ?`
		args = append(args, req.Type)
	}
	if req.FilePath != "" {
		query += `, file_path = ?`
		args = append(args, req.FilePath)
	}
	if req.Tags != "" {
		query += `, tags = ?`
		args = append(args, req.Tags)
	}
	query += ` WHERE id = ? AND project_id = ?`
	args = append(args, docID, projectID)

	result, err := h.DB.Exec(query, args...)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		respondError(w, http.StatusNotFound, "document not found in this project")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *Handler) DeleteDocument(w http.ResponseWriter, r *http.Request) {
	projectID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	docID, _ := strconv.ParseInt(chi.URLParam(r, "docID"), 10, 64)
	result, err := h.DB.Exec(`DELETE FROM documents WHERE id = ? AND project_id = ?`, docID, projectID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		respondError(w, http.StatusNotFound, "document not found in this project")
		return
	}
	respondJSON(w, http.StatusNoContent, nil)
}
