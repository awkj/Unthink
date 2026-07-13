package database

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

const defaultUserID = "default"

type Store struct {
	db *sql.DB
}

type Status struct {
	Revision         int64
	SnapshotRevision int64
}

type Change struct {
	Revision int64
	ClientID string
	ChangeID string
	Payload  []byte
	Created  int64
}

type Snapshot struct {
	Revision int64
	Payload  []byte
	Created  int64
}

type ChangePage struct {
	Revision int64
	Snapshot *Snapshot
	Changes  []Change
	HasMore  bool
}

type executor interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func Open(ctx context.Context, databaseURL, authToken string) (*Store, error) {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("open postgres: %w", err)
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxIdleTime(5 * time.Minute)
	db.SetConnMaxLifetime(30 * time.Minute)
	store := &Store{db: db}
	if err := store.migrate(ctx, authToken); err != nil {
		db.Close()
		return nil, err
	}
	return store, nil
}

func (s *Store) migrate(ctx context.Context, authToken string) error {
	if err := s.db.PingContext(ctx); err != nil {
		return fmt.Errorf("connect to postgres: %w", err)
	}
	schema := `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  token_hash BYTEA NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS spaces (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  revision BIGINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE(user_id, name)
);
CREATE TABLE IF NOT EXISTS changes (
  id BIGSERIAL PRIMARY KEY,
  space_id BIGINT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  revision BIGINT NOT NULL,
  client_id TEXT NOT NULL,
  change_id TEXT NOT NULL,
  payload BYTEA NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE(space_id, revision),
  UNIQUE(space_id, client_id, change_id)
);
CREATE INDEX IF NOT EXISTS changes_space_revision_idx ON changes(space_id, revision);
CREATE TABLE IF NOT EXISTS snapshots (
  space_id BIGINT PRIMARY KEY REFERENCES spaces(id) ON DELETE CASCADE,
  revision BIGINT NOT NULL,
  payload BYTEA NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS clients (
  space_id BIGINT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  last_seen_revision BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY(space_id, client_id)
);
INSERT INTO schema_migrations(version, applied_at)
VALUES(1, (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT)
ON CONFLICT(version) DO NOTHING;`
	if _, err := s.db.ExecContext(ctx, schema); err != nil {
		return fmt.Errorf("migrate postgres: %w", err)
	}
	hash := sha256.Sum256([]byte(authToken))
	_, err := s.db.ExecContext(ctx, `
INSERT INTO users(id, token_hash, created_at) VALUES($1, $2, $3)
ON CONFLICT(id) DO UPDATE SET token_hash = excluded.token_hash`,
		defaultUserID, hash[:], time.Now().UnixMilli())
	if err != nil {
		return fmt.Errorf("initialize user: %w", err)
	}
	return nil
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) Ping(ctx context.Context) error { return s.db.PingContext(ctx) }

func (s *Store) ensureSpace(ctx context.Context, e executor, name string) (int64, error) {
	name = strings.ToLower(strings.TrimSpace(name))
	if name == "" {
		return 0, errors.New("space name must not be empty")
	}
	now := time.Now().UnixMilli()
	var id int64
	err := e.QueryRowContext(ctx, `
INSERT INTO spaces(user_id, name, created_at, updated_at) VALUES($1, $2, $3, $3)
ON CONFLICT(user_id, name) DO UPDATE SET name = excluded.name
RETURNING id`, defaultUserID, name, now).Scan(&id)
	return id, err
}

func (s *Store) Status(ctx context.Context, space string) (Status, error) {
	spaceID, err := s.ensureSpace(ctx, s.db, space)
	if err != nil {
		return Status{}, err
	}
	var status Status
	err = s.db.QueryRowContext(ctx, `
SELECT s.revision, COALESCE(sn.revision, 0)
FROM spaces s LEFT JOIN snapshots sn ON sn.space_id = s.id
WHERE s.id = $1`, spaceID).Scan(&status.Revision, &status.SnapshotRevision)
	return status, err
}

func (s *Store) AppendChange(ctx context.Context, space, clientID, changeID string, payload []byte) (int64, bool, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, false, err
	}
	defer tx.Rollback()
	spaceID, err := s.ensureSpace(ctx, tx, space)
	if err != nil {
		return 0, false, err
	}
	var existing int64
	err = tx.QueryRowContext(ctx, `
SELECT revision FROM changes WHERE space_id = $1 AND client_id = $2 AND change_id = $3`,
		spaceID, clientID, changeID).Scan(&existing)
	if err == nil {
		return existing, true, tx.Commit()
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return 0, false, err
	}
	var revision int64
	err = tx.QueryRowContext(ctx, `
UPDATE spaces SET revision = revision + 1, updated_at = $1 WHERE id = $2 RETURNING revision`,
		time.Now().UnixMilli(), spaceID).Scan(&revision)
	if err != nil {
		return 0, false, err
	}
	_, err = tx.ExecContext(ctx, `
INSERT INTO changes(space_id, revision, client_id, change_id, payload, created_at)
VALUES($1, $2, $3, $4, $5, $6)`,
		spaceID, revision, clientID, changeID, payload, time.Now().UnixMilli())
	if err != nil {
		return 0, false, err
	}
	if err := tx.Commit(); err != nil {
		return 0, false, err
	}
	return revision, false, nil
}

func (s *Store) ListChanges(ctx context.Context, space, clientID string, after int64, limit int) (ChangePage, error) {
	spaceID, err := s.ensureSpace(ctx, s.db, space)
	if err != nil {
		return ChangePage{}, err
	}
	page := ChangePage{Changes: []Change{}}
	seenRevision := after
	if err := s.db.QueryRowContext(ctx, "SELECT revision FROM spaces WHERE id = $1", spaceID).
		Scan(&page.Revision); err != nil {
		return ChangePage{}, err
	}
	var snapshot Snapshot
	err = s.db.QueryRowContext(ctx,
		"SELECT revision, payload, created_at FROM snapshots WHERE space_id = $1", spaceID).
		Scan(&snapshot.Revision, &snapshot.Payload, &snapshot.Created)
	if err == nil && after < snapshot.Revision {
		page.Snapshot = &snapshot
		after = snapshot.Revision
		seenRevision = snapshot.Revision
	} else if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return ChangePage{}, err
	}
	rows, err := s.db.QueryContext(ctx, `
SELECT revision, client_id, change_id, payload, created_at
FROM changes WHERE space_id = $1 AND revision > $2 ORDER BY revision ASC LIMIT $3`,
		spaceID, after, limit+1)
	if err != nil {
		return ChangePage{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var change Change
		if err := rows.Scan(&change.Revision, &change.ClientID, &change.ChangeID, &change.Payload, &change.Created); err != nil {
			return ChangePage{}, err
		}
		if len(page.Changes) == limit {
			page.HasMore = true
			break
		}
		page.Changes = append(page.Changes, change)
		seenRevision = change.Revision
	}
	if err := rows.Err(); err != nil {
		return ChangePage{}, err
	}
	if clientID != "" {
		_, err = s.db.ExecContext(ctx, `
INSERT INTO clients(space_id, client_id, last_seen_revision, updated_at) VALUES($1, $2, $3, $4)
ON CONFLICT(space_id, client_id) DO UPDATE SET
  last_seen_revision = GREATEST(clients.last_seen_revision, excluded.last_seen_revision),
  updated_at = excluded.updated_at`,
			spaceID, clientID, seenRevision, time.Now().UnixMilli())
	}
	return page, err
}

func (s *Store) PutSnapshot(ctx context.Context, space string, coversRevision int64, payload []byte) (Status, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Status{}, err
	}
	defer tx.Rollback()
	spaceID, err := s.ensureSpace(ctx, tx, space)
	if err != nil {
		return Status{}, err
	}
	var current, previous int64
	if err := tx.QueryRowContext(ctx, "SELECT revision FROM spaces WHERE id = $1 FOR UPDATE", spaceID).
		Scan(&current); err != nil {
		return Status{}, err
	}
	if coversRevision > current {
		return Status{}, fmt.Errorf("snapshot revision %d is ahead of server revision %d", coversRevision, current)
	}
	_ = tx.QueryRowContext(ctx, "SELECT revision FROM snapshots WHERE space_id = $1", spaceID).Scan(&previous)
	if coversRevision > previous {
		_, err = tx.ExecContext(ctx, `
INSERT INTO snapshots(space_id, revision, payload, created_at) VALUES($1, $2, $3, $4)
ON CONFLICT(space_id) DO UPDATE SET
  revision = excluded.revision, payload = excluded.payload, created_at = excluded.created_at`,
			spaceID, coversRevision, payload, time.Now().UnixMilli())
		if err != nil {
			return Status{}, err
		}
		if _, err := tx.ExecContext(ctx,
			"DELETE FROM changes WHERE space_id = $1 AND revision <= $2", spaceID, coversRevision); err != nil {
			return Status{}, err
		}
		previous = coversRevision
	}
	if err := tx.Commit(); err != nil {
		return Status{}, err
	}
	return Status{Revision: current, SnapshotRevision: previous}, nil
}
