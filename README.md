# 拾间 · 小型电商案例

一个可在本地运行的单店铺项目，使用 React、Node.js 和 MySQL。提供固定商品、演示账号、购物车和模拟下单流程，方便自行编写接口自动化与 UI 自动化用例。本仓库不包含自动化测试套件，也不发生真实支付或发货。

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

所有接口以 `/api` 开头，响应为 JSON。登录后将返回的 `token` 作为 `Authorization: Bearer <token>` 请求头发送。金额字段以整数分表示，例如 `8900` 表示 ¥89.00。错误响应为 `{ "error": { "code": "...", "message": "..." } }`。

| 方法 | 路径 | 说明 | 登录 |
| --- | --- | --- | --- |
| GET | `/health` | 健康检查 | 否 |
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

常见状态码：400 输入不合法或空购物车；401 未登录、token 无效或密码错误；404 商品或本人可访问的订单不存在；409 库存不足；500 服务端错误。数量范围为 1～99 的整数，购物车中商品数量不能超过当前库存。下单时再次检查库存，使用事务保存商品名称与成交单价快照、扣减库存并清空购物车。

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

后端构建产物在 `apps/api/dist`，前端在 `apps/web/dist`。`npm run start -w apps/api` 可启动已构建的 API；前端可通过 `npm run preview -w apps/web` 本地预览。正式部署时需将 `/api` 反向代理到 API 服务，并设置独立的 `JWT_SECRET` 与数据库凭据。
