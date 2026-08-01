package handler

import (
	"agora/internal/model"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) ListSkills(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(`SELECT id, name, description, category, config_template FROM skills ORDER BY name ASC`)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	skills := []model.Skill{}
	for rows.Next() {
		var s model.Skill
		if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.Category, &s.ConfigTpl); err != nil {
			respondError(w, http.StatusInternalServerError, "internal server error")
			return
		}
		skills = append(skills, s)
	}
	respondJSON(w, http.StatusOK, skills)
}

func (h *Handler) CreateSkill(w http.ResponseWriter, r *http.Request) {
	var s model.Skill
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if s.Name == "" {
		respondError(w, http.StatusBadRequest, "name is required")
		return
	}

	result, err := h.DB.Exec(
		`INSERT INTO skills (name, description, category, config_template) VALUES (?, ?, ?, ?)`,
		s.Name, s.Description, s.Category, s.ConfigTpl,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.ID, _ = result.LastInsertId()
	respondJSON(w, http.StatusCreated, s)
}

func (h *Handler) GetProjectSkills(w http.ResponseWriter, r *http.Request) {
	projectID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	rows, err := h.DB.Query(
		`SELECT s.id, s.name, s.description, s.category, s.config_template, ps.usage_notes
		FROM skills s
		JOIN project_skills ps ON s.id = ps.skill_id
		WHERE ps.project_id = ?
		ORDER BY s.name ASC`, projectID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	type SkillWithUsage struct {
		model.Skill
		UsageNotes string `json:"usage_notes"`
	}
	skills := []SkillWithUsage{}
	for rows.Next() {
		var sw SkillWithUsage
		if err := rows.Scan(&sw.ID, &sw.Name, &sw.Description, &sw.Category, &sw.ConfigTpl, &sw.UsageNotes); err != nil {
			respondError(w, http.StatusInternalServerError, "internal server error")
			return
		}
		skills = append(skills, sw)
	}
	respondJSON(w, http.StatusOK, skills)
}

func (h *Handler) LinkProjectSkill(w http.ResponseWriter, r *http.Request) {
	projectID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct {
		SkillID    int64  `json:"skill_id"`
		UsageNotes string `json:"usage_notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	_, err := h.DB.Exec(
		`INSERT OR REPLACE INTO project_skills (project_id, skill_id, usage_notes) VALUES (?, ?, ?)`,
		projectID, req.SkillID, req.UsageNotes,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "linked"})
}
