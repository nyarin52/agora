package protocol

import (
	"os"

	"gopkg.in/yaml.v3"
)

// AgoraConfig represents the .agora.yaml file format in a managed project.
type AgoraConfig struct {
	Name         string              `yaml:"name"`
	Description  string              `yaml:"description"`
	Type         string              `yaml:"type"` // web-app, cli-tool, library, service
	Repository   string              `yaml:"repository"`
	Dependencies DependenciesConfig  `yaml:"dependencies"`
	Skills       []string            `yaml:"skills"`
	Documents    map[string]string   `yaml:"documents"` // type -> relative_path
	Custom       map[string]any      `yaml:"custom,omitempty"`
}

type DependenciesConfig struct {
	Ecosystems []string `yaml:"ecosystems"`  // npm, pip, cargo, go, etc.
	LockFiles  []string `yaml:"lock_files"`  // package-lock.json, Cargo.lock, etc.
}

// LoadFromFile reads and parses an .agora.yaml from the given file path.
func LoadFromFile(path string) (*AgoraConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg AgoraConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}
