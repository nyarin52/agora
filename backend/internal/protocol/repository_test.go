package protocol

import "testing"

func TestParseRepository(t *testing.T) {
	tests := []struct {
		in      string
		owner   string
		repo    string
		wantNil bool
	}{
		{"", "", "", true},
		{"you/repo", "you", "repo", false},
		{"https://github.com/you/repo", "you", "repo", false},
		{"https://github.com/you/repo.git", "you", "repo", false},
	}

	for _, tc := range tests {
		ref, err := ParseRepository(tc.in)
		if err != nil {
			t.Fatalf("%q: %v", tc.in, err)
		}
		if tc.wantNil {
			if ref != nil {
				t.Fatalf("%q: expected nil", tc.in)
			}
			continue
		}
		if ref.Owner != tc.owner || ref.Repo != tc.repo {
			t.Fatalf("%q: got %s/%s", tc.in, ref.Owner, ref.Repo)
		}
	}
}
