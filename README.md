# 拾间 · 小型电商案例

一个可在本地运行的单店铺项目，使用 React、Node.js 和 MySQL。提供固定商品、账号注册与登录、演示账号、购物车和模拟下单流程，方便自行编写接口自动化与 UI 自动化用例。不发生真实支付或发货。

## 环境要求

- Node.js 20.19+ 或 22.12+（推荐 Node.js 24）
- npm 10+
- Docker Desktop 或可运行 Docker Compose 的 Docker 环境

## 启动

```bash
cp .env.example .env
docker compose up -d mysql
npm install
npm run db:seed
npm run dev
```

MySQL 首次启动需要几秒。如果 `db:seed` 报连接失败，请等待容器健康后重试。前端地址为 [http://localhost:5173](http://localhost:5173)，API 地址为 `http://localhost:3001`，健康检查为 `GET /api/health`。Vite 会把前端的 `/api` 请求代理到 API 服务。

停止前后端用 `Ctrl+C`，停止数据库用 `docker compose down`。`docker compose down -v` 会删除本项目的数据库卷。

## 演示账号和商品

登录页预填主账号；两个账号的密码都是 `Demo123456!`。

也可以从登录页进入注册页，用昵称、邮箱和密码创建账号。注册成功后会自动登录。密码为 8 至 72 字节；同一邮箱不能重复注册。

| 用途 | 邮箱 |
| --- | --- |
| 主演示账号 | `demo@example.com` |
| 第二账号（验证订单隔离） | `other@example.com` |

| ID | 商品 | 分类 | 价格 | 初始库存 |
| --- | --- | --- | ---: | ---: |
| 1 | 云朵陶瓷杯 | 居家 | ¥89.00 | 25 |
| 2 | 晨光帆布包 | 配饰 | ¥129.00 | 18 |
| 3 | 木质香氛蜡烛 | 居家 | ¥159.00 | 12 |
| 4 | 山野笔记本 | 文具 | ¥49.00 | 40 |
| 5 | 亚麻桌布 | 居家 | ¥199.00 | 10 |
| 6 | 午后玻璃花瓶 | 居家 | ¥119.00 | 16 |

`npm run db:seed` 可重复执行，不会覆盖购物车、订单或当前库存。**`npm run db:reset` 会清除当前配置的项目数据库中的用户、商品、购物车和订单，再填入以上固定数据。**请只对可清除的本地演示库执行重置。数据库连接由根目录 `.env` 中的 `DB_*` 变量控制。

## API 概览

交互式 Swagger 文档：[http://localhost:3001/api/docs](http://localhost:3001/api/docs)。可点击 **Authorize**，填入登录接口返回的 `token`（不用添加 `Bearer` 前缀），然后使用 **Try it out** 调试需要登录的接口。机器可读的 OpenAPI 3.0 文档位于 [http://localhost:3001/api/openapi.json](http://localhost:3001/api/openapi.json)。

所有接口以 `/api` 开头，响应为 JSON。登录后将返回的 `token` 作为 `Authorization: Bearer <token>` 请求头发送。金额字段以整数分表示，例如 `8900` 表示 ¥89.00。错误响应为 `{ "error": { "code": "...", "message": "..." } }`。

| 方法 | 路径 | 说明 | 登录 |
| --- | --- | --- | --- |
| GET | `/health` | 健康检查 | 否 |
| POST | `/auth/register` | 注册账号，传 `name`、`email`、`password`，成功后返回 token | 否 |
| POST | `/auth/login` | 邮箱、密码登录 | 否 |
| GET | `/auth/me` | 当前用户 | 是 |
| GET | `/products?q=&category=` | 商品列表，可搜索和筛选 | 否 |
| GET | `/products/:id` | 商品详情 | 否 |
| GET | `/cart` | 购物车 | 是 |
| POST | `/cart/items` | 加入购物车，传 `productId`、`quantity` | 是 |
| PATCH | `/cart/items/:productId` | 改数量，传 `quantity` | 是 |
| DELETE | `/cart/items/:productId` | 移除商品 | 是 |
| POST | `/orders` | 根据购物车创建模拟已支付订单 | 是 |
| GET | `/orders` | 本人订单列表 | 是 |
| GET | `/orders/:id` | 本人订单详情 | 是 |

常见状态码：400 输入不合法或空购物车；401 未登录、token 无效或密码错误；404 商品或本人可访问的订单不存在；409 邮箱已注册或库存不足；500 服务端错误。数量范围为 1～99 的整数，购物车中商品数量不能超过当前库存。下单时再次检查库存，使用事务保存商品名称与成交单价快照、扣减库存并清空购物车。

例如：

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"Demo123456!"}'

curl 'http://localhost:3001/api/products?category=居家'
```

## 构建

```bash
npm run build
```

后端构建产物在 `apps/api/dist`，前端在 `apps/web/dist`。`npm run start -w apps/api` 可启动已构建的 API；前端可通过 `npm run preview -w apps/web` 本地预览。

## 腾讯云服务器部署（三容器）

以下步骤适用于已安装 Docker Engine 和 Docker Compose 插件的 Linux 服务器。生产配置在 `compose.prod.yaml`：Caddy 容器提供前端并转发 `/api`，Node 容器运行 API，MySQL 容器使用持久化卷。只有 Caddy 对外映射 80/443；不要在腾讯云防火墙或安全组中放通 3001、3306。先确认服务器的 80/443 没有被其他服务占用，再在腾讯云控制台放通 80/443。

在本机仓库目录上传代码（将登录用户和公网 IP 换成实际值；SSH 私钥留在本机）：

```bash
rsync -az --exclude='.git' --exclude='node_modules' --exclude='dist' \
  --exclude='.superpowers' --exclude='.DS_Store' --exclude='.env' \
  --exclude='.env.production' ./ USER@SERVER_IP:~/s-mall/
ssh USER@SERVER_IP
cd ~/s-mall
```

复制配置并填写每个空值。`DB_PASSWORD`、`MYSQL_ROOT_PASSWORD` 和 `JWT_SECRET` 请分别使用不同的随机值，不能沿用本地演示配置；例如可用 `openssl rand -hex 32` 生成。无域名时填 `SITE_ADDRESS=http://公网IP`；有域名时填 `SITE_ADDRESS=你的域名`，并先把域名解析到服务器公网 IP，Caddy 才能自动申请 HTTPS 证书。不要把 `.env.production` 上传到仓库。

```bash
cp .env.production.example .env.production
${EDITOR:-vi} .env.production
docker compose --env-file .env.production -f compose.prod.yaml up -d --build --wait mysql
docker compose --env-file .env.production -f compose.prod.yaml run --rm api node dist/seed.js
docker compose --env-file .env.production -f compose.prod.yaml up -d --build --wait
docker compose --env-file .env.production -f compose.prod.yaml ps
```

首次初始化使用 `seed`，它可重复执行且不会覆盖已有库存、购物车或订单。**部署和更新时不要运行 `db:reset`，也不要使用 `docker compose down -v`，它们会删除业务数据。**

在浏览器检查首页、`/orders`、`/api/docs/`，并检查 `GET /api/health` 返回 `{ "status": "ok" }`。可用下列命令查看状态和日志：

```bash
docker compose --env-file .env.production -f compose.prod.yaml ps
docker compose --env-file .env.production -f compose.prod.yaml logs -f --tail=100
```

后续更新只需重新上传代码，在服务器目录执行 `docker compose --env-file .env.production -f compose.prod.yaml up -d --build --wait`，等待三个容器恢复健康后再访问网站。Compose 会重建有变化的镜像，MySQL 命名卷和订单数据会保留。停止服务使用 `docker compose --env-file .env.production -f compose.prod.yaml down`；该命令保留卷。上线前请确认服务器本身可以拉取 `node:24-alpine`、`caddy:2-alpine` 和 `mysql:8.4` 基础镜像。

### GitHub Actions 自动部署

`.github/workflows/deploy.yml` 在代码推送到 `main` 时自动运行，也可以在 GitHub 的 **Actions → Deploy to server → Run workflow** 手动运行。它会先执行 `npm ci`、`npm test` 和 `npm run build`，再通过 SSH/rsync 上传源码，并在服务器重建 `api`、`web` 容器。此流程使用上面的 `compose.prod.yaml` 源码部署方式；如果服务器使用 `compose.tcr.yaml`，请改用下节的镜像发布流程。

先按上面的步骤在服务器完成首次部署，确认 `~/s-mall/.env.production` 已配置、Docker Compose 可运行。给 Actions 准备一个只用于部署的 SSH 密钥，将公钥加入服务器部署用户的 `~/.ssh/authorized_keys`；私钥只放在 GitHub Secrets。使用可信渠道核对服务器 SSH 主机公钥指纹后，将对应的 `known_hosts` 记录也放入 Secrets。

在仓库 **Settings → Secrets and variables → Actions** 添加以下四个 Repository secrets：

| Secret | 内容 |
| --- | --- |
| `DEPLOY_HOST` | 服务器公网 IP 或域名（不含 `user@`） |
| `DEPLOY_USER` | 有权运行 Docker Compose 的 SSH 用户 |
| `DEPLOY_SSH_KEY` | 部署专用 SSH 私钥的完整内容 |
| `DEPLOY_KNOWN_HOSTS` | 经核对的服务器 SSH `known_hosts` 记录 |

工作流不会上传或覆盖服务器的 `.env.production`，也不会执行数据库重置或删除 Docker 数据卷。服务器构建镜像仍需能获取 Dockerfile 中的基础镜像。首次启用前，先确认推送到 `main` 的代码已准备好部署。

## 从腾讯云 TCR 拉取镜像部署

如果不想把源码上传服务器，使用 `compose.tcr.yaml`。它只拉取镜像，不包含 `build`。前端镜像推送至 `ccr.ccs.tencentyun.com/dev-s-mall-image/s_mall_web`，API 镜像推送至 `ccr.ccs.tencentyun.com/dev-s-mall-image/s_mall_api`，两个仓库使用相同版本标签。确保命名空间和仓库已创建，并在本机登录 TCR。仓库凭据不要写进 `.env.production` 或命令参数。

在本机仓库目录构建并推送两种 CPU 架构的应用镜像。每次发布使用新的版本标签，并把命令输出的标签填进服务器 `.env.production`：

```bash
VERSION=$(git rev-parse --short HEAD)
docker buildx build --platform linux/amd64,linux/arm64 \
  --build-arg NODE_IMAGE=public.ecr.aws/docker/library/node:24-alpine \
  -f apps/api/Dockerfile \
  -t "ccr.ccs.tencentyun.com/dev-s-mall-image/s_mall_api:${VERSION}" --push .
docker buildx build --platform linux/amd64,linux/arm64 \
  --build-arg NODE_IMAGE=public.ecr.aws/docker/library/node:24-alpine \
  --build-arg CADDY_IMAGE=public.ecr.aws/docker/library/caddy:2-alpine \
  -f apps/web/Dockerfile \
  -t "ccr.ccs.tencentyun.com/dev-s-mall-image/s_mall_web:${VERSION}" --push .
```

服务器只需要 `compose.tcr.yaml` 和 `.env.production.example`，无需源码或 Node.js。将它们传到服务器后，在服务器执行：

```bash
ssh USER@SERVER_IP 'mkdir -p ~/s-mall'
scp compose.tcr.yaml .env.production.example USER@SERVER_IP:~/s-mall/
ssh USER@SERVER_IP
cd ~/s-mall
cp .env.production.example .env.production
${EDITOR:-vi} .env.production
docker login ccr.ccs.tencentyun.com
docker compose --env-file .env.production -f compose.tcr.yaml pull
docker compose --env-file .env.production -f compose.tcr.yaml up -d --wait mysql
docker compose --env-file .env.production -f compose.tcr.yaml run --rm api node dist/seed.js
docker compose --env-file .env.production -f compose.tcr.yaml up -d --wait
```

将 `API_IMAGE`、`WEB_IMAGE` 填为刚推送的完整镜像地址，`SITE_ADDRESS` 和数据库密钥按上一节填写。服务器上的私有仓库需要单独登录；本机登录状态不会随文件传输。MySQL 默认仍从 Docker Hub 拉取 `mysql:8.4`；若服务器不能访问 Docker Hub，可将该镜像镜像到可访问的仓库并填写 `MYSQL_IMAGE`。更新时替换两个应用镜像标签，执行 `docker compose --env-file .env.production -f compose.tcr.yaml pull api web` 和 `docker compose --env-file .env.production -f compose.tcr.yaml up -d --wait`。数据库卷不随镜像更新删除；不要执行 `down -v` 或 `db:reset`。
