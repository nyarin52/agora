package service

import (
	"context"
	"fmt"

	"github.com/google/go-github/v68/github"
)

type GitHubService struct {
	client *github.Client
}

func NewGitHubService(token string) *GitHubService {
	if token == "" {
		return &GitHubService{client: github.NewClient(nil)}
	}
	return &GitHubService{client: github.NewClient(nil).WithAuthToken(token)}
}

func (s *GitHubService) GetReleases(ctx context.Context, owner, repo string) ([]*github.RepositoryRelease, error) {
	releases, _, err := s.client.Repositories.ListReleases(ctx, owner, repo, &github.ListOptions{
		PerPage: 20,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list releases: %w", err)
	}
	return releases, nil
}

func (s *GitHubService) GetRepo(ctx context.Context, owner, repo string) (*github.Repository, error) {
	r, _, err := s.client.Repositories.Get(ctx, owner, repo)
	if err != nil {
		return nil, fmt.Errorf("failed to get repository: %w", err)
	}
	return r, nil
}

func (s *GitHubService) GetRepoContent(ctx context.Context, owner, repo, path string) ([]*github.RepositoryContent, error) {
	_, contents, _, err := s.client.Repositories.GetContents(ctx, owner, repo, path, &github.RepositoryContentGetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get contents: %w", err)
	}
	return contents, nil
}

func (s *GitHubService) GetFileContent(ctx context.Context, owner, repo, path string) (string, error) {
	content, _, _, err := s.client.Repositories.GetContents(ctx, owner, repo, path, &github.RepositoryContentGetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get file content: %w", err)
	}

	str, err := content.GetContent()
	if err != nil {
		return "", fmt.Errorf("failed to decode content: %w", err)
	}
	return str, nil
}
