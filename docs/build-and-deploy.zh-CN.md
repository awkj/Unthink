# Web、Android 与 Docker Server 构建部署说明

当前支持 Web、macOS、Android 和自部署服务端；Windows、iOS 已禁用。

## 一、公共准备

```bash
cd /Users/doctor/Developer/personal/awkj/Unthink
corepack enable
pnpm install --frozen-lockfile
pnpm check
```

建议使用 Node.js 24。`pnpm check` 会运行 TypeScript 和 ESLint 检查。

## 二、Web 打包

开发模式：

```bash
pnpm web:dev
```

生产打包：

```bash
pnpm web:build
```

Vite 从 `src/main.tsx` 加载 React 应用，打包 JavaScript、CSS 和 Loro WASM，产物写入：

```text
dist/index.html
dist/assets/
```

浏览器版使用 IndexedDB 保存本地数据库。`dist/` 可以放到支持 SPA 回退的静态服务器，但推荐使用本文后面的 Docker 部署，让 Web 和同步 API 使用同一个地址。

## 三、Android 打包

Android 使用 Tauri 2：界面是同一套 React/Vite 前端，Rust 负责原生运行层，本地数据库通过 Tauri 文件系统插件保存在应用数据目录。

### 1. 环境要求

需要安装 Rust stable、Java 17、Android SDK、Build Tools 和 NDK。

安装 Rust Android 目标：

```bash
rustup target add \
  aarch64-linux-android \
  armv7-linux-androideabi \
  i686-linux-android \
  x86_64-linux-android
```

设置环境变量，路径按实际安装位置修改：

```bash
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_NDK_HOME="$ANDROID_HOME/ndk/27.2.12479018"
export PATH="$HOME/.cargo/bin:$ANDROID_HOME/platform-tools:$PATH"
```

### 2. 首次生成工程

仅当 `src-tauri/gen/android/` 不存在时执行：

```bash
pnpm tauri:android:init
```

生成的 Gradle 工程位于 `src-tauri/gen/android/`。

### 3. 调试 APK

```bash
pnpm tauri android build --debug --apk --target aarch64
```

产物：

```text
src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```

调试 APK 使用 Android 调试签名，只适合本地安装测试。

### 4. 发布 APK/AAB

发布 APK：

```bash
pnpm tauri android build --apk --target aarch64
```

Google Play 使用的 AAB：

```bash
pnpm tauri android build --aab --target aarch64
```

正式发布前，需要在 Android Gradle 工程中配置自己的 keystore 和 release signing。不要把 keystore、密码或签名配置提交到 Git。

### 5. 内部打包流程

1. Tauri 调用 `pnpm web:build` 构建前端。
2. Rust 编译出目标架构的 Android `.so` 动态库。
3. 动态库进入 Gradle 工程的 `jniLibs/`。
4. Gradle 将 WebView、Rust 动态库和 Android 资源组合为 APK/AAB。
5. 应用通过 Tauri 插件访问文件和系统通知。

## 四、Docker Server 部署

Docker 部署包含：

- Web 静态页面
- Go 同步 API
- PostgreSQL 18
- RustFS S3 兼容附件存储

仓库根目录的 `Dockerfile` 构建 Web 和 Go 服务；`compose.yaml` 启动应用、PostgreSQL 与 RustFS。

### 1. 配置

在仓库根目录创建 `.env`：

```dotenv
AUTH_TOKEN=请替换为足够长的随机字符串
POSTGRES_PASSWORD=请替换为数据库密码
RUSTFS_ACCESS_KEY=请替换为附件存储访问密钥
RUSTFS_SECRET_KEY=请替换为足够长的附件存储密钥
RUSTFS_SERVER_ACCESS_KEY=请替换为服务端专用访问密钥
RUSTFS_SERVER_SECRET_KEY=请替换为另一条足够长的服务端专用密钥
```

`AUTH_TOKEN` 是唯一用户的身份凭证。所有 Web、Android、macOS 客户端必须使用相同 Token。

可选变量：

```dotenv
POSTGRES_DB=tasks
POSTGRES_USER=tasks
POSTGRES_BIND=127.0.0.1
POSTGRES_PORT=5432
SERVER_BIND=0.0.0.0
SERVER_PORT=8400
CORS_ORIGIN=*
RUSTFS_BUCKET=tasks-attachments
RUSTFS_REGION=us-east-1
RUSTFS_CONSOLE_BIND=127.0.0.1
RUSTFS_CONSOLE_PORT=9001
```

### 2. 构建并启动

```bash
docker compose up -d --build
```

检查容器：

```bash
docker compose ps
docker compose logs -f tasks
```

检查 Go 服务和数据库：

```bash
curl http://127.0.0.1:8400/api/v1/health
```

正常返回：

```json
{ "database": "ok", "status": "ok" }
```

Web 地址默认为 `http://服务器地址:8400`。

RustFS 的 S3 API 仅在 Docker 内部网络中提供，不映射到宿主机，也不允许客户端直接连接。
Compose 会等待 RustFS 健康后自动创建 `tasks-attachments` Bucket；附件文件保存在
`rustfs-data` volume。RustFS 管理控制台默认仅绑定 `127.0.0.1:9001`，远程管理时建议使用
SSH 隧道，不要直接暴露到公网。

### 3. 客户端附件迁移

客户端连接自托管同步服务器后，会自动启用服务端附件传输，无需填写 Endpoint、Bucket 或任何
RustFS 密钥。已经连接过自托管服务器的客户端会在下次启动时自动迁移。

自动迁移只在以下情况下进行：

- 当前没有附件存储配置；或
- 当前附件配置原本就是由自托管服务器管理。

用户手工设置的 AWS S3、R2、MinIO 等配置不会被覆盖。删除自托管同步服务器时，对应的自动管理
配置也会从客户端清除。

客户端上传和下载附件时只携带自托管服务器的 `AUTH_TOKEN`，请求
`/api/v1/attachments/objects/*`。Go 服务负责流式转发，并使用 Docker 内网中的受限账号访问
RustFS。RustFS 管理员密钥和服务端受限密钥都不会下发到客户端。

任务同步只传递文件名、大小和对象 Key 等元数据。生产环境只需要为 Tasks Web/API 地址配置
HTTPS，并把 `CORS_ORIGIN` 从 `*` 改为 Web 页面来源，例如 `https://tasks.example.com`。

### 4. Dockerfile 如何工作

根目录的 `Dockerfile` 有三个阶段：

1. `node:22-alpine` 安装 pnpm 依赖并执行 `pnpm web:build`。
2. `golang:1.25-alpine` 编译 Go 服务端。
3. `alpine:3.22` 只复制 Go 二进制和 Web `dist/`，形成小型运行镜像。

最终容器内结构：

```text
/app/tasks-server   Go API
/app/static/        Web 静态文件
```

Go 服务监听 8400 端口：

- `/api/v1/*` 处理同步 API。
- 其他路径返回 Web 静态页面，并支持 SPA 回退。

Compose 中的 Go 服务通过 Docker 内部网络连接 PostgreSQL。数据库数据保存在 `postgres-data` volume。

### 5. PostgreSQL 调试

默认只在部署机器的 `127.0.0.1:5432` 暴露 PostgreSQL：

```bash
psql 'postgres://tasks:数据库密码@127.0.0.1:5432/tasks'
```

不要直接把 5432 暴露到公网。远程调试建议使用 SSH 隧道：

```bash
ssh -L 5432:127.0.0.1:5432 user@服务器地址
```

随后本地数据库工具连接 `127.0.0.1:5432`。

### 6. 更新和停止

更新部署：

```bash
git pull
docker compose up -d --build
```

停止但保留数据库：

```bash
docker compose down
```

删除服务、数据库和全部附件：

```bash
docker compose down -v
```

最后一条命令会永久删除 PostgreSQL 数据和 RustFS 中的全部附件，只能在确认不需要数据时执行。

## 五、客户端连接服务器

部署后，在每个客户端进入“设置 → 自部署同步”，填写：

- Server URL：例如 `https://tasks.example.com`
- Token：服务端 `.env` 中的 `AUTH_TOKEN`

自动同步行为：

- 本地变化约 2 秒后上传。
- 每 15 秒拉取一次远端变化。
- 启动、网络恢复、窗口重新获得焦点时立即同步。
- 失败后按照 2 至 60 秒指数退避重试。

同步协议细节参见 [selfhosted-sync-architecture.md](selfhosted-sync-architecture.md)。
