





package handler

import (
	"agora/internal/model"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
)

const projectColumns = `id, name, description, github_owner, github_repo, repository_url, root_path, status, tags, created_at, updated_at`

func (h *Handler) ListProjects(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(`SELECT ` + projectColumns + ` FROM projects ORDER BY updated_at DESC`)
	if err != nil {
			respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	defer rows.Close()

	projects := []model.Project{}
	for rows.Next() {
		var p model.Project
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.GitHubOwner, &p.GitHubRepo, &p.RepositoryURL, &p.RootPath, &p.Status, &p.Tags, &p.CreatedAt, &p.UpdatedAt); err != nil {
			respondError(w, http.StatusInternalServerError, "internal server error")
			return
		}
		projects = append(projects, p)
	}
	respondJSON(w, http.StatusOK, projects)
}

func (h *Handler) GetProject(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var p model.Project
	err := h.DB.QueryRow(`SELECT `+projectColumns+` FROM projects WHERE id = ?`, id).
		Scan(&p.ID, &p.Name, &p.Description, &p.GitHubOwner, &p.GitHubRepo, &p.RepositoryURL, &p.RootPath, &p.Status, &p.Tags, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		respondError(w, http.StatusNotFound, "project not found")
		return
	}
	respondJSON(w, http.StatusOK, p)
}

func (h *Handler) CreateProject(w http.ResponseWriter, r *http.Request) {
	var p model.Project
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if p.Name == "" {
		respondError(w, http.StatusBadRequest, "name is required")
		return
	}

	result, err := h.DB.Exec(
		`INSERT INTO projects (name, description, github_owner, github_repo, status, tags) VALUES (?, ?, ?, ?, ?, ?)`,
		p.Name, p.Description, p.GitHubOwner, p.GitHubRepo,
		coalesceStr(p.Status, "active"),
		coalesceStr(p.Tags, "[]"),
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	p.ID, _ = result.LastInsertId()
	p.Status = coalesceStr(p.Status, "active")
	respondJSON(w, http.StatusCreated, p)
}

func coalesceStr(val, fallback string) string {
	if val == "" {
		return fallback
	}
	return val
}

func (h *Handler) UpdateProject(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var p model.Project
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	_, err := h.DB.Exec(
		`UPDATE projects SET name=?, description=?, github_owner=?, github_repo=?, status=?, tags=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
		p.Name, p.Description, p.GitHubOwner, p.GitHubRepo, p.Status, p.Tags, id,
	)
	if err != nil {
			respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	p.ID = id
	respondJSON(w, http.StatusOK, p)
}

func (h *Handler) DeleteProject(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	_, err := h.DB.Exec(`DELETE FROM projects WHERE id = ?`, id)
	if err != nil {
			respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	respondJSON(w, http.StatusNoContent, nil)
}

func (h *Handler) ImportProject(w http.ResponseWriter, r *http.Request) {
	var req struct {
		GitHubOwner string `json:"github_owner"`
		GitHubRepo  string `json:"github_repo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.GitHubOwner == "" || req.GitHubRepo == "" {
		respondError(w, http.StatusBadRequest, "github_owner and github_repo are required")
		return
	}

	name := req.GitHubOwner + "/" + req.GitHubRepo
	// If the name contains a slash in the repository name format, just use the repo name
	parts := strings.SplitN(name, "/", 2)
	if len(parts) == 2 {
		name = parts[1]
	}

	result, err := h.DB.Exec(
		`INSERT INTO projects (name, description, github_owner, github_repo, status, tags) VALUES (?, ?, ?, ?, 'active', '[]')`,
		name, "Imported from GitHub", req.GitHubOwner, req.GitHubRepo,
	)
	if err != nil {
			respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	id, _ := result.LastInsertId()

	// Also create a default dev context
	h.DB.Exec(`INSERT INTO dev_contexts (project_id, current_branch) VALUES (?, 'main')`, id)

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"id":           id,
		"name":         name,
		"github_owner": req.GitHubOwner,
		"github_repo":  req.GitHubRepo,
		"status":       "active",
	})
}
