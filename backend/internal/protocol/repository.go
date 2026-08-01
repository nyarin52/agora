package protocol

import (
	"fmt"
	"net/url"
	"strings"
)

// RepoRef is a normalized GitHub repository reference.
type RepoRef struct {
	Owner string
	Repo  string
	URL   string
}

// ParseRepository accepts owner/repo or a GitHub URL and returns normalized fields.
func ParseRepository(raw string) (*RepoRef, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}

	// owner/repo shorthand
	if !strings.Contains(raw, "://") && strings.Count(raw, "/") == 1 {
		parts := strings.SplitN(raw, "/", 2)
		owner := strings.TrimSpace(parts[0])
		repo := strings.Trim(strings.TrimSpace(parts[1]), "/")
		if owner == "" || repo == "" {
			return nil, fmt.Errorf("invalid repository: %s", raw)
		}
		return &RepoRef{
			Owner: owner,
			Repo:  repo,
			URL:   fmt.Sprintf("https://github.com/%s/%s", owner, repo),
		}, nil
	}

	u, err := url.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("invalid repository URL: %w", err)
	}

	path := strings.Trim(strings.TrimSuffix(u.Path, ".git"), "/")
	parts := strings.Split(path, "/")
	if len(parts) < 2 || parts[0] == "" || parts[1] == "" {
		return nil, fmt.Errorf("invalid repository URL path: %s", raw)
	}

	owner := parts[0]
	repo := parts[1]
	return &RepoRef{
		Owner: owner,
		Repo:  repo,
		URL:   fmt.Sprintf("https://github.com/%s/%s", owner, repo),
	}, nil
}
