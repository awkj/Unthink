package api

import (
	"bufio"
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestRevisionEvents(t *testing.T) {
	server := &Server{authToken: "test-token", revisions: newRevisionHub()}
	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/spaces/{space}/events", server.authorize(server.canonicalizeSpace(http.HandlerFunc(server.events))))
	httpServer := httptest.NewServer(mux)
	defer httpServer.Close()

	url := httpServer.URL + "/api/v1/spaces/DEFAULT/events"
	unauthorized, err := http.Get(url)
	if err != nil {
		t.Fatal(err)
	}
	unauthorized.Body.Close()
	if unauthorized.StatusCode != http.StatusUnauthorized {
		t.Fatalf("unauthorized status = %d", unauthorized.StatusCode)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, url+"?clientId=web-1", nil)
	if err != nil {
		t.Fatal(err)
	}
	request.Header.Set("Authorization", "Bearer test-token")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("event stream status = %d", response.StatusCode)
	}
	if contentType := response.Header.Get("Content-Type"); contentType != "text/event-stream" {
		t.Fatalf("event stream content type = %q", contentType)
	}

	received := make(chan string, 1)
	go func() {
		scanner := bufio.NewScanner(response.Body)
		var lines []string
		for scanner.Scan() {
			line := scanner.Text()
			if line == "" {
				contents := strings.Join(lines, "\n")
				if strings.Contains(contents, "event: revision") {
					received <- contents
					return
				}
				lines = nil
				continue
			}
			lines = append(lines, line)
		}
	}()

	server.revisions.publish("default", revisionEvent{clientID: "web-1", revision: 1})
	server.revisions.publish("default", revisionEvent{clientID: "android-1", revision: 2})
	select {
	case event := <-received:
		if !strings.Contains(event, "id: 2") || !strings.Contains(event, "data: 2") {
			t.Fatalf("unexpected event: %q", event)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for revision event")
	}
}
