package handler

import "net/http"

func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request) {
	var docCount, skillCount int
	h.DB.QueryRow(`SELECT COUNT(*) FROM documents`).Scan(&docCount)
	h.DB.QueryRow(`SELECT COUNT(*) FROM skills`).Scan(&skillCount)

	respondJSON(w, http.StatusOK, map[string]int{
		"documents": docCount,
		"skills":    skillCount,
	})
}
