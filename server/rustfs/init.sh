#!/bin/sh
set -eu

case "${RUSTFS_BUCKET}" in
  ""|*[!a-z0-9.-]*)
    echo "RUSTFS_BUCKET must contain only lowercase letters, digits, dots, and hyphens" >&2
    exit 1
    ;;
esac

mc alias set rustfs http://rustfs:9000 "${RUSTFS_ACCESS_KEY}" "${RUSTFS_SECRET_KEY}"
mc mb --ignore-existing "rustfs/${RUSTFS_BUCKET}"
mc admin user add rustfs "${RUSTFS_SERVER_ACCESS_KEY}" "${RUSTFS_SERVER_SECRET_KEY}"

cat > /tmp/attachments-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetBucketLocation", "s3:ListBucket", "s3:ListBucketMultipartUploads"],
      "Resource": ["arn:aws:s3:::${RUSTFS_BUCKET}"]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:AbortMultipartUpload", "s3:ListMultipartUploadParts"],
      "Resource": ["arn:aws:s3:::${RUSTFS_BUCKET}/*"]
    }
  ]
}
EOF

mc admin policy create rustfs tasks-attachments-server /tmp/attachments-policy.json
mc admin policy attach rustfs tasks-attachments-server --user "${RUSTFS_SERVER_ACCESS_KEY}"
