package handler

import "net/http"

func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	if err := h.DB.Ping(); err != nil {
		respondError(w, http.StatusServiceUnavailable, "service unavailable")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "healthy"})
}
