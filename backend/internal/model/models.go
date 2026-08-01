package model

import "time"

type Project struct {
	ID            int64     `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	GitHubOwner   string    `json:"github_owner"`
	GitHubRepo    string    `json:"github_repo"`
	RepositoryURL string    `json:"repository_url"`
	RootPath      string    `json:"root_path"`
	Status        string    `json:"status"`
	Tags          string    `json:"tags"`
	Progress      string    `json:"progress"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type Document struct {
	ID        int64     `json:"id"`
	ProjectID int64     `json:"project_id"`
	Type      string    `json:"type"`
	Title     string    `json:"title"`
	FilePath  string    `json:"file_path"`
	Tags      string    `json:"tags"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Skill struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Category    string `json:"category"`
	ConfigTpl   string `json:"config_template"`
}

type ProjectSkill struct {
	ProjectID  int64  `json:"project_id"`
	SkillID    int64  `json:"skill_id"`
	UsageNotes string `json:"usage_notes"`
}

type Dependency struct {
	ID          int64  `json:"id"`
	ProjectID   int64  `json:"project_id"`
	Name        string `json:"name"`
	Version     string `json:"version"`
	Ecosystem   string `json:"ecosystem"`
	IsDirect    bool   `json:"is_direct"`
	LastScanned string `json:"last_scanned_at"`
}

type DevContext struct {
	ID            int64  `json:"id"`
	ProjectID     int64  `json:"project_id"`
	CurrentBranch string `json:"current_branch"`
	CurrentTask   string `json:"current_task"`
	Notes         string `json:"notes"`
	LastActiveAt  string `json:"last_active_at"`
}

// API response types

type Release struct {
	TagName     string        `json:"tag_name"`
	PublishedAt string        `json:"published_at"`
	Body        string        `json:"body"`
	HTMLURL     string        `json:"html_url"`
	Assets      []ReleaseAsset `json:"assets"`
}

type ReleaseAsset struct {
	Name        string `json:"name"`
	DownloadURL string `json:"download_url"`
	Size        int64  `json:"size"`
}
