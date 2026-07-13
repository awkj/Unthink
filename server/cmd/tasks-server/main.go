package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hamsterbase/tasks/server/api"
	"github.com/hamsterbase/tasks/server/attachmentstore"
	"github.com/hamsterbase/tasks/server/config"
	"github.com/hamsterbase/tasks/server/database"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	store, err := database.Open(context.Background(), cfg.DatabaseURL, cfg.AuthToken)
	if err != nil {
		log.Fatalf("initialize database: %v", err)
	}
	defer store.Close()
	var attachmentStore api.AttachmentObjectStore
	if cfg.AttachmentsAccessKey != "" {
		attachmentStore, err = attachmentstore.New(
			cfg.AttachmentsEndpoint,
			cfg.AttachmentsRegion,
			cfg.AttachmentsBucket,
			cfg.AttachmentsAccessKey,
			cfg.AttachmentsSecretKey,
		)
		if err != nil {
			log.Fatalf("initialize attachment storage: %v", err)
		}
	}

	httpServer := &http.Server{
		Addr:              cfg.Address,
		Handler:           api.New(store, cfg.AuthToken, cfg.CORSOrigin, cfg.StaticDir, attachmentStore),
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	go func() {
		log.Printf("Tasks sync server listening on %s", cfg.Address)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("serve: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
}
