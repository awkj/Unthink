package api

import (
	"context"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/hamsterbase/tasks/server/database"
)

const maxBodyBytes = 16 << 20

type Server struct {
	store           *database.Store
	authToken       string
	corsOrigin      string
	staticDir       string
	attachmentStore AttachmentObjectStore
}

type AttachmentObjectStore interface {
	PutObject(ctx context.Context, key string, body io.Reader, size int64, contentType string) error
	StatObject(ctx context.Context, key string) (size int64, contentType string, err error)
	WriteObject(ctx context.Context, key string, destination io.Writer) error
}

type appendChangeRequest struct {
	ClientID string `json:"clientId"`
	ChangeID string `json:"changeId"`
	Payload  string `json:"payload"`
}

type putSnapshotRequest struct {
	ClientID       string `json:"clientId"`
	CoversRevision int64  `json:"coversRevision"`
	Payload        string `json:"payload"`
}

func New(
	store *database.Store,
	authToken, corsOrigin, staticDir string,
	attachmentStore ...AttachmentObjectStore,
) http.Handler {
	server := &Server{store: store, authToken: authToken, corsOrigin: corsOrigin, staticDir: staticDir}
	if len(attachmentStore) > 0 {
		server.attachmentStore = attachmentStore[0]
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health", server.health)
	mux.Handle("GET /api/v1/attachments/config", server.authorize(http.HandlerFunc(server.attachmentConfig)))
	mux.Handle("PUT /api/v1/attachments/objects/{key...}", server.authorize(http.HandlerFunc(server.putAttachment)))
	mux.Handle("GET /api/v1/attachments/objects/{key...}", server.authorize(http.HandlerFunc(server.getAttachment)))
	mux.Handle("GET /api/v1/spaces/{space}/status", server.authorize(http.HandlerFunc(server.status)))
	mux.Handle("GET /api/v1/spaces/{space}/changes", server.authorize(http.HandlerFunc(server.changes)))
	mux.Handle("POST /api/v1/spaces/{space}/changes", server.authorize(http.HandlerFunc(server.appendChange)))
	mux.Handle("PUT /api/v1/spaces/{space}/snapshot", server.authorize(http.HandlerFunc(server.putSnapshot)))
	if staticDir != "" {
		mux.Handle("/", server.spaHandler())
	}
	return server.cors(mux)
}

func (s *Server) attachmentConfig(w http.ResponseWriter, r *http.Request) {
	if s.attachmentStore == nil {
		writeError(w, http.StatusNotFound, "self-hosted attachment storage is not configured")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"transport": "server"})
}

func (s *Server) putAttachment(w http.ResponseWriter, r *http.Request) {
	if s.attachmentStore == nil {
		writeError(w, http.StatusNotFound, "self-hosted attachment storage is not configured")
		return
	}
	key := r.PathValue("key")
	if key == "" || len(key) > 2048 {
		writeError(w, http.StatusBadRequest, "attachment key is invalid")
		return
	}
	if r.ContentLength < 0 {
		writeError(w, http.StatusLengthRequired, "Content-Length is required")
		return
	}
	contentType := r.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	if err := s.attachmentStore.PutObject(r.Context(), key, r.Body, r.ContentLength, contentType); err != nil {
		writeGatewayError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) getAttachment(w http.ResponseWriter, r *http.Request) {
	if s.attachmentStore == nil {
		writeError(w, http.StatusNotFound, "self-hosted attachment storage is not configured")
		return
	}
	key := r.PathValue("key")
	if key == "" || len(key) > 2048 {
		writeError(w, http.StatusBadRequest, "attachment key is invalid")
		return
	}
	size, contentType, err := s.attachmentStore.StatObject(r.Context(), key)
	if err != nil {
		writeGatewayError(w, err)
		return
	}
	if contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}
	w.Header().Set("Content-Length", strconv.FormatInt(size, 10))
	w.Header().Set("Cache-Control", "private, max-age=3600")
	if err := s.attachmentStore.WriteObject(r.Context(), key, w); err != nil {
		fmt.Printf("attachment download failed: %v\n", err)
	}
}

func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", s.corsOrigin)
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) authorize(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			writeError(w, http.StatusUnauthorized, "invalid or missing bearer token")
			return
		}
		provided := strings.TrimPrefix(header, "Bearer ")
		if len(provided) != len(s.authToken) ||
			subtle.ConstantTimeCompare([]byte(provided), []byte(s.authToken)) != 1 {
			writeError(w, http.StatusUnauthorized, "invalid or missing bearer token")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	if err := s.store.Ping(r.Context()); err != nil {
		writeError(w, http.StatusServiceUnavailable, "database unavailable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "database": "ok"})
}

func (s *Server) status(w http.ResponseWriter, r *http.Request) {
	status, err := s.store.Status(r.Context(), r.PathValue("space"))
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]int64{
		"revision": status.Revision, "snapshotRevision": status.SnapshotRevision,
	})
}

func (s *Server) appendChange(w http.ResponseWriter, r *http.Request) {
	var request appendChangeRequest
	if err := decodeJSON(w, r, &request); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if request.ClientID == "" || request.ChangeID == "" || request.Payload == "" {
		writeError(w, http.StatusBadRequest, "clientId, changeId and payload are required")
		return
	}
	payload, err := base64.StdEncoding.DecodeString(request.Payload)
	if err != nil {
		writeError(w, http.StatusBadRequest, "payload must be valid base64")
		return
	}
	revision, duplicate, err := s.store.AppendChange(
		r.Context(), r.PathValue("space"), request.ClientID, request.ChangeID, payload,
	)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"revision": revision, "duplicate": duplicate})
}

func (s *Server) changes(w http.ResponseWriter, r *http.Request) {
	after, err := parseNonNegativeInt(r.URL.Query().Get("after"), 0)
	if err != nil {
		writeError(w, http.StatusBadRequest, "after must be a non-negative integer")
		return
	}
	limit, err := parseNonNegativeInt(r.URL.Query().Get("limit"), 500)
	if err != nil || limit < 1 || limit > 1000 {
		writeError(w, http.StatusBadRequest, "limit must be between 1 and 1000")
		return
	}
	page, err := s.store.ListChanges(
		r.Context(), r.PathValue("space"), r.URL.Query().Get("clientId"), after, int(limit),
	)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	changes := make([]map[string]any, 0, len(page.Changes))
	for _, change := range page.Changes {
		changes = append(changes, map[string]any{
			"revision":  change.Revision,
			"clientId":  change.ClientID,
			"changeId":  change.ChangeID,
			"payload":   base64.StdEncoding.EncodeToString(change.Payload),
			"createdAt": change.Created,
		})
	}
	response := map[string]any{
		"revision": page.Revision, "hasMore": page.HasMore, "changes": changes,
	}
	if page.Snapshot != nil {
		response["snapshot"] = map[string]any{
			"revision":  page.Snapshot.Revision,
			"payload":   base64.StdEncoding.EncodeToString(page.Snapshot.Payload),
			"createdAt": page.Snapshot.Created,
		}
	}
	writeJSON(w, http.StatusOK, response)
}

func (s *Server) putSnapshot(w http.ResponseWriter, r *http.Request) {
	var request putSnapshotRequest
	if err := decodeJSON(w, r, &request); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if request.ClientID == "" || request.Payload == "" || request.CoversRevision < 0 {
		writeError(w, http.StatusBadRequest,
			"clientId, payload and a non-negative coversRevision are required")
		return
	}
	payload, err := base64.StdEncoding.DecodeString(request.Payload)
	if err != nil {
		writeError(w, http.StatusBadRequest, "payload must be valid base64")
		return
	}
	status, err := s.store.PutSnapshot(
		r.Context(), r.PathValue("space"), request.CoversRevision, payload,
	)
	if err != nil {
		if strings.Contains(err.Error(), "ahead of server revision") {
			writeError(w, http.StatusConflict, err.Error())
			return
		}
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]int64{
		"revision": status.Revision, "snapshotRevision": status.SnapshotRevision,
	})
}

func (s *Server) spaHandler() http.Handler {
	files := http.FileServer(http.Dir(s.staticDir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requested := filepath.Join(s.staticDir, filepath.Clean(r.URL.Path))
		if info, err := os.Stat(requested); err == nil && !info.IsDir() {
			files.ServeHTTP(w, r)
			return
		}
		http.ServeFile(w, r, filepath.Join(s.staticDir, "index.html"))
	})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, destination any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		if errors.Is(err, io.EOF) {
			return errors.New("request body is required")
		}
		return fmt.Errorf("invalid JSON body: %w", err)
	}
	return nil
}

func parseNonNegativeInt(raw string, fallback int64) (int64, error) {
	if raw == "" {
		return fallback, nil
	}
	value, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || value < 0 {
		return 0, errors.New("invalid non-negative integer")
	}
	return value, nil
}

func writeInternalError(w http.ResponseWriter, err error) {
	fmt.Printf("request failed: %v\n", err)
	writeError(w, http.StatusInternalServerError, "internal server error")
}

func writeGatewayError(w http.ResponseWriter, err error) {
	fmt.Printf("attachment storage request failed: %v\n", err)
	writeError(w, http.StatusBadGateway, "attachment storage unavailable")
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
