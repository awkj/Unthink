package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/hamsterbase/tasks/server/api"
	"github.com/hamsterbase/tasks/server/database"
)

type memoryAttachmentStore struct {
	objects map[string][]byte
	types   map[string]string
}

func newMemoryAttachmentStore() *memoryAttachmentStore {
	return &memoryAttachmentStore{objects: make(map[string][]byte), types: make(map[string]string)}
}

func (s *memoryAttachmentStore) PutObject(
	_ context.Context,
	key string,
	body io.Reader,
	_ int64,
	contentType string,
) error {
	contents, err := io.ReadAll(body)
	if err != nil {
		return err
	}
	s.objects[key] = contents
	s.types[key] = contentType
	return nil
}

func (s *memoryAttachmentStore) StatObject(_ context.Context, key string) (int64, string, error) {
	contents, ok := s.objects[key]
	if !ok {
		return 0, "", os.ErrNotExist
	}
	return int64(len(contents)), s.types[key], nil
}

func (s *memoryAttachmentStore) WriteObject(_ context.Context, key string, destination io.Writer) error {
	contents, ok := s.objects[key]
	if !ok {
		return os.ErrNotExist
	}
	_, err := destination.Write(contents)
	return err
}

const testToken = "test-token-with-enough-entropy"

func TestSyncAPI(t *testing.T) {
	store, err := database.Open(context.Background(), testDatabaseURL(t), testToken)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })
	server := httptest.NewServer(api.New(store, testToken, "*", ""))
	t.Cleanup(server.Close)

	response := request(t, server.URL, http.MethodGet, "/api/v1/health", "", nil)
	if response.StatusCode != http.StatusOK {
		t.Fatalf("health status = %d", response.StatusCode)
	}
	response.Body.Close()

	response = request(t, server.URL, http.MethodGet, "/api/v1/spaces/default/status", "", nil)
	if response.StatusCode != http.StatusUnauthorized {
		t.Fatalf("unauthorized status = %d", response.StatusCode)
	}
	response.Body.Close()

	first := map[string]any{"clientId": "web-1", "changeId": "change-1", "payload": "Zmlyc3Q="}
	result := requestJSON(t, server.URL, http.MethodPost, "/api/v1/spaces/default/changes", first)
	if result["revision"].(float64) != 1 || result["duplicate"].(bool) {
		t.Fatalf("unexpected first append response: %#v", result)
	}
	result = requestJSON(t, server.URL, http.MethodPost, "/api/v1/spaces/default/changes", first)
	if result["revision"].(float64) != 1 || !result["duplicate"].(bool) {
		t.Fatalf("unexpected duplicate append response: %#v", result)
	}

	second := map[string]any{"clientId": "android-1", "changeId": "change-2", "payload": "c2Vjb25k"}
	result = requestJSON(t, server.URL, http.MethodPost, "/api/v1/spaces/default/changes", second)
	if result["revision"].(float64) != 2 {
		t.Fatalf("unexpected second append response: %#v", result)
	}

	result = requestJSON(t, server.URL, http.MethodGet,
		"/api/v1/spaces/default/changes?after=0&clientId=web-1", nil)
	changes := result["changes"].([]any)
	if result["revision"].(float64) != 2 || len(changes) != 2 {
		t.Fatalf("unexpected change page: %#v", result)
	}

	snapshot := map[string]any{"clientId": "web-1", "coversRevision": 1, "payload": "c25hcHNob3Q="}
	result = requestJSON(t, server.URL, http.MethodPut, "/api/v1/spaces/default/snapshot", snapshot)
	if result["snapshotRevision"].(float64) != 1 {
		t.Fatalf("unexpected snapshot response: %#v", result)
	}

	result = requestJSON(t, server.URL, http.MethodGet,
		"/api/v1/spaces/default/changes?after=0&clientId=new-device", nil)
	if result["snapshot"].(map[string]any)["revision"].(float64) != 1 {
		t.Fatalf("snapshot missing from compacted page: %#v", result)
	}
	changes = result["changes"].([]any)
	if len(changes) != 1 || changes[0].(map[string]any)["revision"].(float64) != 2 {
		t.Fatalf("unexpected changes after snapshot: %#v", changes)
	}
}

func TestRejectsSnapshotAheadOfServer(t *testing.T) {
	store, err := database.Open(context.Background(), testDatabaseURL(t), testToken)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })
	server := httptest.NewServer(api.New(store, testToken, "*", ""))
	t.Cleanup(server.Close)

	body := map[string]any{"clientId": "web-1", "coversRevision": 1, "payload": "c25hcHNob3Q="}
	encoded, _ := json.Marshal(body)
	response := request(t, server.URL, http.MethodPut, "/api/v1/spaces/snapshot-ahead/snapshot", testToken, encoded)
	defer response.Body.Close()
	if response.StatusCode != http.StatusConflict {
		contents, _ := io.ReadAll(response.Body)
		t.Fatalf("status = %d, body = %s", response.StatusCode, contents)
	}
}

func TestAttachmentConfig(t *testing.T) {
	attachments := newMemoryAttachmentStore()
	handler := api.New(nil, testToken, "*", "", attachments)
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)

	unauthorized := request(t, server.URL, http.MethodGet, "/api/v1/attachments/config", "", nil)
	defer unauthorized.Body.Close()
	if unauthorized.StatusCode != http.StatusUnauthorized {
		t.Fatalf("unauthorized status = %d", unauthorized.StatusCode)
	}

	response := request(t, server.URL, http.MethodGet, "/api/v1/attachments/config", testToken, nil)
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("attachment config status = %d", response.StatusCode)
	}
	var result map[string]any
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result["transport"] != "server" || len(result) != 1 {
		t.Fatalf("unexpected attachment config: %#v", result)
	}

	upload := request(
		t,
		server.URL,
		http.MethodPut,
		"/api/v1/attachments/objects/local/attachments/test.txt",
		testToken,
		[]byte("attachment contents"),
	)
	upload.Body.Close()
	if upload.StatusCode != http.StatusNoContent {
		t.Fatalf("upload status = %d", upload.StatusCode)
	}

	download := request(
		t,
		server.URL,
		http.MethodGet,
		"/api/v1/attachments/objects/local/attachments/test.txt",
		testToken,
		nil,
	)
	defer download.Body.Close()
	contents, err := io.ReadAll(download.Body)
	if err != nil {
		t.Fatal(err)
	}
	if download.StatusCode != http.StatusOK || string(contents) != "attachment contents" {
		t.Fatalf("download status = %d, body = %q", download.StatusCode, contents)
	}
}

func testDatabaseURL(t *testing.T) string {
	t.Helper()
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is not set")
	}
	return databaseURL
}

func requestJSON(
	t *testing.T,
	baseURL string,
	method string,
	path string,
	payload map[string]any,
) map[string]any {
	t.Helper()
	var body []byte
	if payload != nil {
		body, _ = json.Marshal(payload)
	}
	response := request(t, baseURL, method, path, testToken, body)
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		contents, _ := io.ReadAll(response.Body)
		t.Fatalf("%s %s status = %d, body = %s", method, path, response.StatusCode, contents)
	}
	var result map[string]any
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	return result
}

func request(
	t *testing.T,
	baseURL string,
	method string,
	path string,
	token string,
	body []byte,
) *http.Response {
	t.Helper()
	request, err := http.NewRequest(method, baseURL+path, bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	return response
}
