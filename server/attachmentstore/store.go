package attachmentstore

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"strings"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Store struct {
	client *minio.Client
	bucket string
}

func New(endpoint, region, bucket, accessKey, secretKey string) (*Store, error) {
	parsed, err := url.Parse(strings.TrimRight(endpoint, "/"))
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return nil, fmt.Errorf("invalid attachment storage endpoint %q", endpoint)
	}
	client, err := minio.New(parsed.Host, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: parsed.Scheme == "https",
		Region: region,
	})
	if err != nil {
		return nil, fmt.Errorf("create attachment storage client: %w", err)
	}
	return &Store{client: client, bucket: bucket}, nil
}

func (s *Store) PutObject(
	ctx context.Context,
	key string,
	body io.Reader,
	size int64,
	contentType string,
) error {
	_, err := s.client.PutObject(ctx, s.bucket, key, body, size, minio.PutObjectOptions{
		ContentType: contentType,
		PartSize:    5 << 20,
	})
	return err
}

func (s *Store) StatObject(ctx context.Context, key string) (int64, string, error) {
	info, err := s.client.StatObject(ctx, s.bucket, key, minio.StatObjectOptions{})
	if err != nil {
		return 0, "", err
	}
	return info.Size, info.ContentType, nil
}

func (s *Store) WriteObject(ctx context.Context, key string, destination io.Writer) error {
	object, err := s.client.GetObject(ctx, s.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return err
	}
	defer object.Close()
	_, err = io.Copy(destination, object)
	return err
}
