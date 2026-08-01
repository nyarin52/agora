package handler

import (
	"agora/internal/service"
	"database/sql"
	"encoding/json"
	"net/http"
)

type Handler struct {
	DB     *sql.DB
	GitHub *service.GitHubService
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if data != nil {
		json.NewEncoder(w).Encode(data)
	}
}

func respondError(w http.ResponseWriter, status int, msg string) {
	respondJSON(w, status, map[string]string{"error": msg})
}
