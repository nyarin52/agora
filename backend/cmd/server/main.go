package main

import (
	"agora/internal/config"
	"agora/internal/database"
	"agora/internal/handler"
	"agora/internal/middleware"
	"agora/internal/service"
	"fmt"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/cors"
)

func main() {
	cfg := config.Load()
	db := database.New(cfg)
	defer db.Close()

	ghSvc := service.NewGitHubService(cfg.GitHubToken)
	h := &handler.Handler{DB: db, GitHub: ghSvc}

	r := chi.NewRouter()

	// CORS
	r.Use(chimw.Handler(chimw.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Auth middleware (no-op if AGORA_AUTH_TOKEN is empty)
	r.Use(middleware.Auth(cfg.AuthToken))

	// API routes
	r.Route("/api", func(r chi.Router) {
		r.Get("/health", h.HealthCheck)
		r.Get("/stats", h.GetStats)

		// Projects
		r.Route("/projects", func(r chi.Router) {
			r.Get("/", h.ListProjects)
			r.Post("/", h.CreateProject)
			r.Post("/import", h.ImportProject)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", h.GetProject)
				r.Put("/", h.UpdateProject)
				r.Delete("/", h.DeleteProject)

				r.Post("/sync", h.SyncProject)

				r.Get("/repository", h.GetRepository)

				// Documents under a project
				r.Get("/documents", h.ListDocuments)
				r.Post("/documents", h.CreateDocument)
				r.Route("/documents/{docID}", func(r chi.Router) {
					r.Get("/", h.GetDocument)
					r.Get("/content", h.ReadDocumentContent)
					r.Put("/", h.UpdateDocument)
					r.Delete("/", h.DeleteDocument)
				})

				// Releases
				r.Get("/releases", h.ListReleases)

				// Skills linked to this project
				r.Get("/skills", h.GetProjectSkills)
				r.Post("/skills", h.LinkProjectSkill)
			})
		})

		// Skills (global registry)
		r.Route("/skills", func(r chi.Router) {
			r.Get("/", h.ListSkills)
			r.Post("/", h.CreateSkill)
		})
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Agora server starting on %s", addr)
	log.Printf("Auth:  enabled=%v", cfg.AuthToken != "")
	log.Printf("DB dir: %s", cfg.DBDir)

	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
