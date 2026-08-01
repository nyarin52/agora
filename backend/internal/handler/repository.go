package handler

import (
	"agora/internal/model"
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) GetRepository(w http.ResponseWriter, r *http.Request) {
	projectID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)

	var owner, repo, repoURL string
	err := h.DB.QueryRow(
		`SELECT github_owner, github_repo, repository_url FROM projects WHERE id = ?`, projectID,
	).Scan(&owner, &repo, &repoURL)
	if err != nil || owner == "" || repo == "" {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"linked": false,
			"url":    repoURL,
		})
		return
	}

	if h.GitHub == nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"linked": true,
			"url":    repoURL,
			"owner":  owner,
			"repo":   repo,
		})
		return
	}

	ghRepo, err := h.GitHub.GetRepo(context.Background(), owner, repo)
	if err != nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"linked":   true,
			"url":      repoURL,
			"owner":    owner,
			"repo":     repo,
			"fetch_error": "failed to fetch from GitHub",
		})
		return
	}

	desc := ghRepo.GetDescription()
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"linked":      true,
		"url":         repoURL,
		"owner":       owner,
		"repo":        repo,
		"html_url":    ghRepo.GetHTMLURL(),
		"description": desc,
		"stars":       ghRepo.GetStargazersCount(),
		"language":    ghRepo.GetLanguage(),
		"updated_at":  ghRepo.GetUpdatedAt().Time.Format(time.RFC3339),
	})
}

func (h *Handler) ListReleases(w http.ResponseWriter, r *http.Request) {
	projectID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)

	var owner, repo string
	err := h.DB.QueryRow(`SELECT github_owner, github_repo FROM projects WHERE id = ?`, projectID).Scan(&owner, &repo)
	if err != nil || owner == "" || repo == "" {
		respondJSON(w, http.StatusOK, []model.Release{})
		return
	}

	if h.GitHub == nil {
		respondJSON(w, http.StatusOK, []model.Release{})
		return
	}

	ghReleases, err := h.GitHub.GetReleases(context.Background(), owner, repo)
	if err != nil {
		respondError(w, http.StatusBadGateway, "failed to fetch releases from GitHub")
		return
	}

	releases := make([]model.Release, 0, len(ghReleases))
	for _, gr := range ghReleases {
		assets := make([]model.ReleaseAsset, 0, len(gr.Assets))
		for _, a := range gr.Assets {
			assets = append(assets, model.ReleaseAsset{
				Name:        a.GetName(),
				DownloadURL: a.GetBrowserDownloadURL(),
				Size:        int64(a.GetSize()),
			})
		}

		publishedAt := ""
		if !gr.GetPublishedAt().Time.IsZero() {
			publishedAt = gr.GetPublishedAt().Time.Format(time.RFC3339)
		}

		releases = append(releases, model.Release{
			TagName:     gr.GetTagName(),
			PublishedAt: publishedAt,
			Body:        gr.GetBody(),
			HTMLURL:     gr.GetHTMLURL(),
			Assets:      assets,
		})
	}

	respondJSON(w, http.StatusOK, releases)
}
