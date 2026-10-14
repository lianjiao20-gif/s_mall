# 小型电商项目实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付能本地启动的 React + Node.js + MySQL 电商案例，供用户自行编写接口与 UI 自动化测试。

**Architecture:** Vite React 前端通过 `/api` 调用 Express REST 服务；API 使用 mysql2 访问 MySQL。数据库脚本建立固定演示数据，购物车与下单由服务端处理。前端和 API 分别启动，开发代理统一入口。

**Tech Stack:** Node.js 24、npm workspaces、React、Vite、TypeScript、Express、mysql2、MySQL 8、Docker Compose。

**Spec:** `docs/superpowers/specs/2026-10-14-ecommerce-automation-design.md`

## Global Constraints

- 用户自行实现接口自动化和 UI 自动化；本计划不创建 Playwright 用例或其他自动化测试套件。
- 金额使用整数分，支付为模拟成功，不调用外部支付服务。
- 固定演示数据与重置命令必须可重复；重置只作用于配置的项目数据库。
- 接口错误结构为 `{ error: { code, message } }`；状态码遵循设计文档。
- 页面控件提供可访问名称，支持桌面和手机宽度。

## Review Focus

- 空购物车下单：返回 400，不产生订单；在下单手工验证步骤检查。
- 库存不足或并发下单：返回 409，库存不变；在下单手工验证步骤检查。
- 非本人订单访问：返回 404；在订单手工验证步骤检查。
- 非法数量（零、负数、小数）：返回 400；在购物车手工验证步骤检查。
- 无效或过期 token：返回 401；在认证手工验证步骤检查。

## 文件职责

- 根目录 `package.json`、`.env.example`、`compose.yaml`：工作区命令、配置示例、MySQL 服务。
- `apps/api/src/db.ts`、`apps/api/sql/schema.sql`、`apps/api/src/seed.ts`：连接、数据库结构与固定数据。
- `apps/api/src/auth.ts`、`routes/products.ts`、`routes/cart.ts`、`routes/orders.ts`、`app.ts`、`server.ts`：认证、业务路由、错误边界和启动。
- `apps/web/src/api.ts`、`auth.tsx`、`App.tsx`、`pages/*`、`styles.css`：请求封装、登录状态、路由、页面和样式。
- `README.md`：安装、启动、重置、账号、商品与接口示例。

### Task 1: 工作区与可重置数据库

**Files:** 创建根目录 `package.json`、`.gitignore`、`.env.example`、`compose.yaml`、`apps/api/package.json`、`apps/api/tsconfig.json`、`apps/api/sql/schema.sql`、`apps/api/src/db.ts`、`apps/api/src/seed.ts`。

**Interfaces:** 输出 `getPool(): Pool`、`seedDatabase(): Promise<void>`；根命令 `npm run db:seed` 和 `npm run db:reset`。演示账号 `demo@example.com` / `Demo123456!`，隔离验证账号 `other@example.com` / `Demo123456!`；至少六个固定商品，ID 和价格可预期。

- [ ] 建立 npm workspace、API TypeScript 配置、MySQL Compose 和环境变量样例；运行 `npm install`，检查依赖安装成功。
- [ ] 建立用户、商品、购物车、订单、订单明细表，金额列为整数分，必要外键及索引齐备；运行 `npm run db:seed`，确认首次初始化成功。
- [ ] 实现幂等种子和显式重置命令；连续运行 `db:seed` 两次，确认不重复插入，运行 `db:reset` 后确认固定数据恢复。
- [ ] 提交该任务变更。

### Task 2: 商品与认证 API

**Files:** 创建 `apps/api/src/app.ts`、`apps/api/src/server.ts`、`apps/api/src/auth.ts`、`apps/api/src/http.ts`、`apps/api/src/routes/products.ts`、`apps/api/src/routes/auth.ts`。

**Interfaces:** `createApp(): Express`；`requireUser(req,res,next)` 注入 `req.userId`；公开 `POST /api/auth/login`、`GET /api/auth/me`、`GET /api/products`、`GET /api/products/:id`。Bearer token 由 `JWT_SECRET` 签发并验证。

- [ ] 实现健康检查、JSON 错误边界、商品列表搜索与分类过滤、商品详情；启动 API，使用 curl 检查正常与不存在的商品。
- [ ] 实现密码哈希验证、登录和认证中间件；用演示账号 curl 检查登录与 `/me`，再检查错误密码和无效 token 返回 401。
- [ ] 运行 `npm run build -w apps/api`，确认类型检查和编译通过。
- [ ] 提交该任务变更。

### Task 3: 购物车与订单 API

**Files:** 创建 `apps/api/src/routes/cart.ts`、`apps/api/src/routes/orders.ts`；修改 `apps/api/src/app.ts`。

**Interfaces:** 公开设计文档列出的购物车和订单路径；订单详情仅限所属用户。`POST /api/orders` 在数据库事务中锁定商品、验证库存、创建价格快照与订单明细、扣库存和清空购物车。

- [ ] 实现购物车查询、加入、改数量和移除；用 curl 检查正常数量，以及零、负数、小数、无货商品的错误响应。
- [ ] 实现订单创建和本人订单列表/详情；用 curl 检查金额、库存扣减、购物车清空和空购物车 400。
- [ ] 使用两个演示账号手工检查非本人订单 404，并用库存不足的购物车检查 409 后库存未变。
- [ ] 运行 `npm run build -w apps/api` 并提交该任务变更。

### Task 4: 可操作的 React 商店

**Files:** 创建 `apps/web/package.json`、`apps/web/tsconfig.json`、`apps/web/vite.config.ts`、`apps/web/index.html`、`apps/web/src/main.tsx`、`apps/web/src/App.tsx`、`apps/web/src/api.ts`、`apps/web/src/auth.tsx`、`apps/web/src/pages/{Home,Product,Login,Cart,Orders}.tsx`、`apps/web/src/styles.css`，以及本地商品图片资源。

**Interfaces:** 所有请求走 `api.ts` 的 `/api` 路径；登录 token 存入 `localStorage` 并在失效时清理；页面路径 `/`、`/products/:id`、`/login`、`/cart`、`/orders`。

- [ ] 建立 Vite 前端、API 代理与布局；商品列表、搜索、分类、详情可加载，检查加载/空/失败状态。
- [ ] 加入登录、购物车数量管理和订单提交；浏览器手工走通登录→加购→修改数量→结算→查看订单。
- [ ] 完成响应式样式、可访问名称和表单反馈；在桌面与手机宽度查看页面。
- [ ] 运行 `npm run build -w apps/web` 并提交该任务变更。

### Task 5: 启动文档与交付检查

**Files:** 创建 `README.md`；必要时修改启动命令与环境变量样例。

**Interfaces:** README 提供 Node/npm/Docker 前置条件、启动/停止/重置命令、演示凭据、固定商品、接口路径与 curl 示例。

- [ ] 从 README 的步骤在空数据库启动 MySQL、API、前端，检查首页和健康接口可访问。
- [ ] 补齐 API 请求示例和状态码说明，明确 `db:reset` 会清除项目库业务数据。
- [ ] 运行两端 build、复核完整购物流程和 `git diff --check`；记录任何环境限制。
- [ ] 提交文档及收尾变更。
