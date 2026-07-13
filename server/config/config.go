package config

import (
	"errors"
	"os"
)

type Config struct {
	Address              string
	AuthToken            string
	DatabaseURL          string
	StaticDir            string
	CORSOrigin           string
	AttachmentsEndpoint  string
	AttachmentsBucket    string
	AttachmentsRegion    string
	AttachmentsAccessKey string
	AttachmentsSecretKey string
}

func Load() (Config, error) {
	cfg := Config{
		Address:              envOrDefault("ADDRESS", ":8400"),
		AuthToken:            os.Getenv("AUTH_TOKEN"),
		DatabaseURL:          os.Getenv("DATABASE_URL"),
		StaticDir:            os.Getenv("STATIC_DIR"),
		CORSOrigin:           envOrDefault("CORS_ORIGIN", "*"),
		AttachmentsEndpoint:  os.Getenv("ATTACHMENTS_ENDPOINT"),
		AttachmentsBucket:    envOrDefault("ATTACHMENTS_BUCKET", "tasks-attachments"),
		AttachmentsRegion:    envOrDefault("ATTACHMENTS_REGION", "us-east-1"),
		AttachmentsAccessKey: os.Getenv("ATTACHMENTS_ACCESS_KEY"),
		AttachmentsSecretKey: os.Getenv("ATTACHMENTS_SECRET_KEY"),
	}
	if cfg.AuthToken == "" {
		return Config{}, errors.New("AUTH_TOKEN must be set")
	}
	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("DATABASE_URL must be set")
	}
	if (cfg.AttachmentsAccessKey == "") != (cfg.AttachmentsSecretKey == "") {
		return Config{}, errors.New("ATTACHMENTS_ACCESS_KEY and ATTACHMENTS_SECRET_KEY must be set together")
	}
	if cfg.AttachmentsAccessKey != "" && cfg.AttachmentsEndpoint == "" {
		return Config{}, errors.New("ATTACHMENTS_ENDPOINT must be set when attachment storage is configured")
	}
	return cfg, nil
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
