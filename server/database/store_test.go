package database

import (
	"context"
	"fmt"
	"os"
	"sync"
	"testing"
)

func TestConcurrentChangesReceiveUniqueRevisions(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is not set")
	}
	store, err := Open(context.Background(), databaseURL, "test-token")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })

	const count = 20
	revisions := make(chan int64, count)
	errors := make(chan error, count)
	var wait sync.WaitGroup
	for index := range count {
		wait.Add(1)
		go func() {
			defer wait.Done()
			revision, duplicate, err := store.AppendChange(
				context.Background(),
				"concurrent-test",
				fmt.Sprintf("client-%d", index),
				fmt.Sprintf("change-%d", index),
				[]byte(fmt.Sprintf("payload-%d", index)),
			)
			if err != nil {
				errors <- err
				return
			}
			if duplicate {
				errors <- fmt.Errorf("change %d was unexpectedly marked duplicate", index)
				return
			}
			revisions <- revision
		}()
	}
	wait.Wait()
	close(errors)
	close(revisions)
	for err := range errors {
		t.Error(err)
	}
	seen := make(map[int64]bool, count)
	for revision := range revisions {
		seen[revision] = true
	}
	if len(seen) != count {
		t.Fatalf("got %d unique revisions, want %d", len(seen), count)
	}
	for revision := int64(1); revision <= count; revision++ {
		if !seen[revision] {
			t.Errorf("revision %d is missing", revision)
		}
	}
}
