package protocol

import (
	"os"
	"path/filepath"
	"strings"
)

// docTypeAliases maps .agora.yaml document keys to internal type names.
var docTypeAliases = map[string]string{
	"design":     "design",
	"dev-notes":  "dev_note",
	"dev_note":   "dev_note",
	"changelogs": "changelog",
	"changelog":  "changelog",
	"summaries":  "summary",
	"summary":    "summary",
}

// ScannedDocument represents a markdown file discovered during sync.
type ScannedDocument struct {
	Type     string
	Title    string
	FilePath string
}

// ScanDocuments walks document directories declared in config and returns indexed entries.
func ScanDocuments(rootPath string, cfg *AgoraConfig) ([]ScannedDocument, error) {
	var docs []ScannedDocument

	for key, relDir := range cfg.Documents {
		docType, ok := docTypeAliases[key]
		if !ok {
			docType = strings.ReplaceAll(key, "-", "_")
		}

		absDir := filepath.Join(rootPath, filepath.FromSlash(relDir))
		info, err := os.Stat(absDir)
		if err != nil || !info.IsDir() {
			continue
		}

		err = filepath.Walk(absDir, func(path string, fi os.FileInfo, err error) error {
			if err != nil || fi.IsDir() {
				return err
			}
			if !strings.HasSuffix(strings.ToLower(fi.Name()), ".md") {
				return nil
			}

			base := strings.TrimSuffix(fi.Name(), filepath.Ext(fi.Name()))
			docs = append(docs, ScannedDocument{
				Type:     docType,
				Title:    base,
				FilePath: path,
			})
			return nil
		})
		if err != nil {
			return nil, err
		}
	}

	return docs, nil
}
