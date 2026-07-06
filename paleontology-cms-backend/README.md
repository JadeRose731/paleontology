# paleontology-cms-backend

中国古生物学会 **轻量 CMS + 会员业务后端**，API 契约与 `PaleontologicalResearch` 生产栈对齐，为 `paleontology-admin-latest` 与 `paleontology-website-latest` 提供内容、栏目、会员、会议、审计等能力。

## 技术栈

| 组件 | 版本 |
|------|------|
| Java | 8（字节码目标；可用 JDK 17 编译） |
| Spring Boot | 2.5.15 |
| MyBatis-Plus | 3.4.3 |
| Flyway | 数据库迁移（V1–V32） |
| MySQL | 5.7+ |
| Redis | 可选（JWT 黑名单；默认 exclude） |
| Knife4j | 3.0.3 |

## 快速启动

### 1. 创建数据库

```sql
CREATE DATABASE paleo_cms DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

### 2. 修改配置

编辑 `src/main/resources/application-dev.yml`：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/paleo_cms?...
    username: root
    password: 你的密码
```

> 默认已 exclude Redis 自动配置，无 Redis 亦可运行。

### 3. 启动

```bash
cd paleontology-cms-backend
mvn spring-boot:run
```

| 项 | 值 |
|----|-----|
| 服务地址 | `http://localhost:8089` |
| API 文档 | `http://localhost:8089/doc.html` |
| 管理端登录 | `admin` / `admin123`（兼容）或邮箱账号见 V23 |
| 上传目录 | `${user.home}/paleo-cms/uploads` |
| 静态资源 | `/uploads/**` |

Flyway 启动时自动执行 `db/migration/V1`–`V32`。

### IntelliJ 编译提示

本仓库字节码目标为 **Java 8**。若 IDE 报「源发行版 17」：Project language level 设为 8，Maven Reload，`mvn clean compile`。

---

## 响应格式

```json
{ "code": 200, "msg": "操作成功", "data": ... }
```

分页：

```json
{ "code": 200, "msg": "查询成功", "rows": [...], "total": 100 }
```

鉴权：`Authorization: Bearer <token>`

---

## API 概览

### 管理端认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/login` | 管理员登录（邮箱/用户名 + 密码）→ JWT |
| GET | `/getInfo` | 当前管理员（role、branchId） |

### 网站用户认证 `/paleo/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/paleo/auth/register` | 用户注册 → JWT |
| POST | `/paleo/auth/login` | 用户登录 |
| GET | `/paleo/auth/info` | 当前用户 + 档案 + **`membershipStatus`** |
| PUT | `/paleo/auth/profile` | 更新资料 |
| PUT | `/paleo/auth/user-type` | 更新会员路径（regular / non_member / member） |

演示网站用户（`DemoUserInitializer`）：

| 邮箱 | 密码 |
|------|------|
| `demo@paleontology.org.cn` | `demo123` |

### CMS 内容 `/paleo/cms`

管理端 CRUD、媒体上传、发布/下架；公开接口 `/paleo/cms/public/list`、`/public/{entryId}`。

### CMS 栏目 `/paleo/cms-channels`

| 公开接口 | 说明 |
|----------|------|
| `GET /public/list` | 导航列表 |
| `GET /public/resolve?routePath=` | 页面一站式解析（栏目+区块+内容） |
| `GET /public/detail` | 按 routePath/channelCode 取详情 |

### CMS 版式 `/paleo/cms-layouts`

公开列表与 schema；管理端维护 `layoutType` 注册表。

### 会员业务 `/paleo/membership`

| 分类 | 路径（节选） | 说明 |
|------|-------------|------|
| 档案 | `/profiles/mine`、`/profiles/list` | 会员档案 |
| 申请 | `/applications/mine`、`/applications/{id}/review` | 入会/退会申请 |
| 缴费 | `/payments/mine`、`/payments/{id}/review` | 两阶段会员费 |
| 文件 | `/applications/mine/{id}/file`、`/payments/mine/{id}/files/{role}` | 申请书、凭证、发票 |
| 管理目录 | **`GET /admin/directory`** | 会员用户名录（含 `membershipStatus`） |
| 模板 | `/templates/public` | 入会/退会申请书模板 |

### 会议 `/paleo/conferences`

| 路径 | 说明 |
|------|------|
| `GET /public/list` | 开放会议列表 |
| `GET /registrations/mine` | 我的报名 |
| `POST /registrations/mine` | 创建报名 |
| `POST /registrations/mine/{id}/files/{role}` | 上传凭证/发票 |
| `POST /registrations/{id}/review` | 管理端审核 |
| `GET /registrations/reviews/pending-vouchers` | 待审凭证 |
| `GET /registrations/reviews/pending-invoices` | 待审发票 |

### 分会绑定 `/paleo/user-bindings`

`GET/POST /mine/bind`、`/mine/unbind` — 用户绑定/解绑专业分会。

### 审计 `/paleo/audit`

| 路径 | 说明 |
|------|------|
| `GET /logs` | 分页查询审计日志（中文摘要、用户详情 JSON） |
| `GET /actions` | 可筛选的操作类型列表 |

审核通过/驳回时由 `AuditLogService` 自动写入；详情面向客户展示（姓名、邮箱、中文状态变更）。

### 仪表盘 `/paleo/dashboard`

`GET /stats` — 综合统计：

| 字段 | 含义 |
|------|------|
| `memberCount` | **正式会员**（仅 `active`） |
| `activeMembers` | 同 `memberCount` |
| `pendingMembershipCount` | 入会办理中（申请/缴费/发票流水线） |
| `nonMemberCount` | 非会员及其他 |
| `studentMembers` / `nonStudentMembers` | 仅正式会员分层 |
| `branchMemberCounts` | 各分会**正式会员**绑定数 |
| `totalMembershipFee` | 已确认（CONFIRMED）会员费合计 |

状态解析：`PaleoMembershipStatusService`（与管理端、前台 `resolveMembershipStatusFromApi` 对齐）。

### 识别 `/paleo/recognition`

化石识别结果上传与人工复核（可选模块）。

### 管理端分会 `/paleo/admin/associations`

管理员与学会的绑定关系。

---

## 正式会员认定

须完成全流程后 `paleo_member_profile.member_status = ACTIVE` 且最近一笔会员费 `payment_status = CONFIRMED`：

```
入会申请 APPROVED → 凭证审核通过 → 发票审核通过 → 正式会员 (active)
```

中间状态（`PENDING` 档案、`application_approved`、`voucher_submitted`、`invoice_pending` 等）计入「入会办理中」，**不计入**正式会员统计。

---

## 模块编码（moduleCode）

与管理端 CMS 子模块一致：

`banners` · `news` · `pages` · `personnel` · `awards` · `announcements` · `timeline` · `gallery` · `international` · `downloads` · `regulations` · `science` · `tech-rewards` · `party` · `branch` · `media` · `settings` · `publish` · `public-files`

---

## 数据库迁移（Flyway）

| 版本段 | 主要内容 |
|--------|----------|
| V1–V10 | CMS 表结构、种子内容、版式注册、导航修复 |
| V11–V12 | 会议/会员基础表、网站用户表 |
| V13–V16 | 科学传播、学会服务 Tab 栏目 |
| V17–V22 | 会议报名缴费、演示会议码、管理员账号、分会 code |
| V23–V26 | 管理端账号种子、识别、审计表、退会清理 |
| V27–V32 | 下载合并、简介/组织机构同步、服务路由统一、导航顺序 |

> **迁移失败恢复**：清理 `flyway_schema_history` 中 `success=0` 的记录后重启。

---

## 前端对接

### paleontology-admin-latest（端口 3001）

```ts
proxy: {
  '/paleo': 'http://localhost:8089',
  '/login': 'http://localhost:8089',
  '/getInfo': 'http://localhost:8089',
  '/uploads': 'http://localhost:8089',
}
```

- CMS：`lib/cms-api.ts`
- 会员审核/目录：`lib/membership-api.ts`
- 审计：`lib/audit-api.ts`

### paleontology-website-latest（端口 3000）

```ts
proxy: {
  '/paleo': 'http://localhost:8089',
  '/uploads': 'http://localhost:8089',
}
```

- CMS 导航与页面：`lib/cms-api.ts`
- 会员/会议/绑定：`lib/membership-api.ts`（JWT：`paleo_user_token`）

生产环境可通过 `VITE_CMS_API_BASE` 指定 API 根路径。

---

## 功能模块与数据域

后端按领域划分 API；下表说明各模块职责及主要表/服务。

### 领域一览

| 领域 | API 前缀 | 核心表/服务 | 说明 |
|------|----------|-------------|------|
| **管理端认证** | `/login`、`/getInfo` | `cms_admin_user` | 管理员 JWT、角色（总/分会/财务） |
| **网站用户** | `/paleo/auth` | `paleo_user`、`paleo_member_profile` | 注册登录、会员路径、档案与 `membershipStatus` |
| **CMS 内容** | `/paleo/cms` | `paleo_cms_entry` | 各 moduleCode 条目，发布/下架 |
| **CMS 栏目** | `/paleo/cms-channels` | `paleo_cms_channel`、`paleo_cms_block` | 顶栏导航、页面解析、区块 |
| **CMS 版式** | `/paleo/cms-layouts` | `paleo_cms_layout` | timeline、gallery、list 等版式注册 |
| **会员申请** | `/paleo/membership/applications` | `paleo_membership_application` | 入会/退会申请书提交与审核 |
| **会员缴费** | `/paleo/membership/payments` | `paleo_membership_payment` | 会费两阶段（凭证→发票→确认） |
| **会员名录** | `/paleo/membership/admin/directory` | 多表聚合 | 管理端用户列表与 `membershipStatus` |
| **会议** | `/paleo/conferences` | `paleo_conference`、`paleo_conference_registration` | 开放会议列表、报名与两阶段缴费 |
| **分会绑定** | `/paleo/user-bindings` | `paleo_user_binding` | 用户绑定/解绑专业分会 |
| **审计** | `/paleo/audit` | `paleo_audit_log` | 审核操作自动落库，中文详情 |
| **仪表盘** | `/paleo/dashboard` | `PaleoDashboardService` | 正式会员/办理中/会费统计 |
| **状态解析** | — | `PaleoMembershipStatusService` | 统一计算 `active` 与流水线状态 |
| **识别** | `/paleo/recognition` | `paleo_recognition_result` | 化石识别与人工复核（可选） |

### 会员状态机（与前后台一致）

```
尚未入会 → 申请审核中 → 申请已通过 → 凭证审核中 → 待上传发票 → 发票审核中 → 正式会员(active)
                ↓              ↓              ↓
            申请驳回        凭证驳回        发票驳回
```

仅 `active` 计入正式会员统计；中间状态为「入会办理中」。

### CMS moduleCode 与前台路由

见 [网站 README](../paleontology-website-latest/README.md#功能模块说明)、[客户需求说明](../docs/2026-07-06-客户需求说明-基于当前实现.md) 与 [管理端 cms-nav.ts](../paleontology-admin-latest/client/src/pages/admin/cms/cms-nav.ts)。

---

## 与 PaleontologicalResearch 生产栈的差异

| 项 | 本后端 | 生产栈 |
|----|--------|--------|
| 框架 | 轻量 Spring Boot | RuoYi 全家桶 |
| 鉴权 | JWT + 角色注解 | RuoYi 菜单权限 |
| 文件存储 | 本地磁盘 | 阿里云 OSS |
| Channel/Block/Layout | ✅ 已实现 | 部分缺失 |
| 会员/会议/审计 | ✅ Phase 1–2 已实现 | 完整业务模块 |
| 管理端会议 CRUD | 前台 localStorage 为主 | 全 API |

## 后续工作

1. 管理端会议 CRUD 迁移至 API，去除 localStorage 双写
2. 前台 `AdminContext` / 统计完全 API 化
3. 可选：对接生产库数据迁移
4. 生产：OSS 存储、Redis JWT 黑名单、密钥轮换

---

## License

MIT
