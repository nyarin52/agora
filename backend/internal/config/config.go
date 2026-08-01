package config

import (
	"fmt"
	"os"
	"path/filepath"
)

type Config struct {
	Port        string
	DBDir       string // database file directory
	AuthToken   string // empty means auth disabled
	DBPath      string
	GitHubToken string
}

func Load() *Config {
	cfg := &Config{
		Port:        envOrDefault("AGORA_PORT", "8080"),
		DBDir:       envOrDefault("AGORA_DB_DIR", "../agora-db"),
		AuthToken:   os.Getenv("AGORA_AUTH_TOKEN"),
		GitHubToken: os.Getenv("GITHUB_TOKEN"),
	}

	absDBDir, err := filepath.Abs(cfg.DBDir)
	if err != nil {
		panic(fmt.Sprintf("failed to resolve db dir: %v", err))
	}
	cfg.DBDir = absDBDir

	cfg.DBPath = filepath.Join(cfg.DBDir, "agora.db")

	if err := os.MkdirAll(cfg.DBDir, 0755); err != nil {
		panic(fmt.Sprintf("failed to create db dir: %v", err))
	}

	return cfg
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
