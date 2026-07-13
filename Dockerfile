FROM node:24-alpine AS web
WORKDIR /src
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm web:build

FROM golang:1.26-alpine AS api
WORKDIR /src
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/cmd ./cmd
COPY server/api ./api
COPY server/attachmentstore ./attachmentstore
COPY server/config ./config
COPY server/database ./database
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/tasks-server ./cmd/tasks-server

FROM alpine:3.24
RUN apk add --no-cache ca-certificates \
    && addgroup -S tasks \
    && adduser -S -G tasks tasks \
    && mkdir -p /app/static \
    && chown -R tasks:tasks /app
WORKDIR /app
COPY --from=api /out/tasks-server /app/tasks-server
COPY --from=web /src/dist /app/static
USER tasks
ENV ADDRESS=:8400 STATIC_DIR=/app/static
EXPOSE 8400
ENTRYPOINT ["/app/tasks-server"]
