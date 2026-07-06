# 中国古生物学会 · 管理后台

中国古生物学会（Palaeontological Society of China）管理后台 — 基于 React 的 SPA，用于管理学会及 11 个分会的会员、学术会议、财务审核、统计数据、分支机构，以及 CMS 内容与栏目编排。

> **架构说明（混合数据模式）**
>
> | 数据类型 | 存储 | 说明 |
> |----------|------|------|
> | CMS 内容/栏目/版式 | MySQL + REST API | 完整对接 `paleontology-cms-backend` |
> | 会员名录/审核/审计 | MySQL + REST API | 目录、申请审核、缴费审核、审计日志已对接 API |
> | 会议管理/部分统计 | 浏览器 `localStorage` | 演示数据 + 与用户端双写；逐步迁移中 |
>
> 开发会员审核、审计、仪表盘统计等功能时**必须启动后端**（`http://localhost:8089`）。

---

## 技术栈

| 类别 | 技术 |
|------|------|
| **框架** | React 19 + TypeScript 5.6 |
| **构建** | Vite 7 · pnpm 10.4 |
| **CSS** | Tailwind CSS v4 + shadcn/ui (New York) |
| **路由** | wouter（支持 Hash 路由） |
| **表单** | react-hook-form + zod |
| **图表** | recharts · **动画** framer-motion |
| **Toast** | sonner · **图标** lucide-react |
| **导出** | JSZip + file-saver |

---

## 快速开始

### 环境要求

- Node.js ≥ 18 · pnpm ≥ 10
- MySQL 5.7+ · `paleontology-cms-backend`（见 [CMS 后端 README](../paleontology-cms-backend/README.md)）

```bash
pnpm install
pnpm dev      # http://localhost:3001
pnpm check
pnpm format
```

### 联调 CMS 后端

```bash
# 终端 1
cd ../paleontology-cms-backend && mvn spring-boot:run

# 终端 2
cd ../paleontology-admin-latest && pnpm dev
```

代理：`/paleo`、`/login`、`/getInfo`、`/uploads` → `http://localhost:8089`

### 构建

```bash
pnpm build           # → dist/
pnpm preview
pnpm build:singlefile # → dist/singlefile/（Hash 路由，支持 file://）
```

---

## 认证与角色

登录以 **CMS 后端 JWT** 为准（`POST /login`），token 存 `paleo_cms_token`。

| 角色 | 权限范围 | 演示账号（密码 `admin123`） |
|------|----------|---------------------------|
| **学会总管理员** `super_admin` | 全部功能 + 全部 CMS | `admin@paleontology.org.cn` |
| **分会管理员** `branch_admin` | 本分会会议、统计、CMS | `branch_gjzdw@paleo.org.cn` 等 11 个 |
| **财务审核员** `finance_reviewer` | 审核工作台、财务记录、统计 | `finance@paleontology.org.cn` |

账号由 Flyway V23 + `AdminUserInitializer` 种子。API 401 时清 token 并跳转 `/admin/login`。

---

## 功能模块

### 业务页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/admin/login` | 登录 | JWT 登录 |
| `/admin/dashboard` | 仪表盘 | 正式会员/入会办理中/待审核等统计（API + 本地聚合） |
| `/admin/audit` | 审核工作台 | 入会/退会、会员费两阶段、会议费两阶段审核 |
| `/admin/audit-trail` | 审计追溯 | 只读操作日志（`GET /paleo/audit/logs`） |
| `/admin/users/members` | 会员用户管理 | **仅正式会员**（`membershipStatus === active`） |
| `/admin/users/non-members` | 非会员用户管理 | 非会员 + **入会办理中**（申请/缴费/发票各环节） |
| `/admin/conferences` | 会议管理 | 会议 CRUD、费用档位（localStorage 为主） |
| `/admin/statistics` | 统计中心 | 三级钻取 |
| `/admin/finance` | 财务记录 | 缴费记录、ZIP 导出 |
| `/admin/branches` | 分会管理 | 分会信息维护 |

### CMS 内容管理

| 路由 | 说明 |
|------|------|
| `/admin/cms/:section` | 17+ 子模块内容编辑 |
| `/admin/cms/channels` | 栏目编排、版式参数、区块 |

学会服务相关子模块已合并：`international`、`science`、`tech-rewards` 等内容归入 `services` 统一管理（与前台 `/services`、`/international`、`/science` 同源）。

数据流：`cms-api.ts` → `/paleo/cms`、`/paleo/cms-channels` REST API。

---

## 正式会员与统计规则

与前台、后端 `PaleoMembershipStatusService` **一致**：

**正式会员** = 入会申请书通过 + 会费凭证通过 + 发票通过 → `membershipStatus === active`

| 统计项 | 计入范围 |
|--------|----------|
| **正式会员** | 仅 `active` |
| **入会办理中** | `application_*`、`voucher_*`、`invoice_*` 等流水线状态 |
| **非会员/其他** | `not_member`、已退会、已过期等 |
| **分会会员数** | 已绑定且为正式会员的用户 |
| **饼图学生/非学生会员** | 仅正式会员 |

仪表盘 `GET /paleo/dashboard/stats` 返回 `memberCount`（= 正式会员）、`pendingMembershipCount`、`nonMemberCount` 等。

工具函数（`shared/constants.ts`）：`isFormalMemberStatus()`、`isMembershipPipelineStatus()`。

---

## 数据模型

### API 持久化（MySQL）

- **CMS**：条目、栏目、区块、版式
- **网站用户**：`paleo_user`、`paleo_member_profile`
- **入会/退会申请**：`paleo_membership_application`
- **会员费**：`paleo_membership_payment`
- **会议报名**：`paleo_conference_registration`
- **分会绑定**：`paleo_user_binding`
- **审计日志**：`paleo_audit_log`

管理端主要客户端：

| 文件 | 用途 |
|------|------|
| `lib/cms-api.ts` | CMS + 仪表盘 API |
| `lib/membership-api.ts` | 会员目录、待审列表、审核操作 |
| `lib/audit-api.ts` | 审计追溯（中文摘要/详情） |

会员目录：`GET /paleo/membership/admin/directory`

### localStorage 演示数据（`paleo_admin_*`）

会议 CRUD、部分统计、ZIP 导出仍读取本地演示数据；审核写回时同步用户端 `paleo_*` key：

| 管理端 | 用户端 |
|--------|--------|
| `paleo_admin_society_membership_{email}` | `paleo_society_membership_{email}` |
| `paleo_admin_confs_{email}` | `paleo_confs_{email}` |
| `paleo_admin_membership_application_{email}` | `paleo_membership_application_{email}` |

---

## 项目结构（节选）

```
client/src/
├── contexts/AdminContext.tsx    # 全局状态、菜单、统计、API 同步
├── lib/
│   ├── cms-api.ts
│   ├── membership-api.ts
│   ├── audit-api.ts
│   └── cms-channel-nav.ts
└── pages/admin/
    ├── Dashboard.tsx
    ├── AuditWorkbench.tsx
    ├── AuditTrail.tsx
    ├── MemberManagement.tsx
    ├── NonMemberManagement.tsx
    └── cms/
```

---

## 三级统计与 ZIP 导出

会议相关数字通过 `collectConferenceAttendees` 从 `paleo_admin_confs_*` 实收聚合（localStorage 路径）。

ZIP 导出目录按四类人群分文件夹：`学生会员/`、`非学生会员/`、`学生（非会员）/`、`非学生（非会员）/`。

---

## 配置

| 别名 | 路径 |
|------|------|
| `@` | `client/src/` |
| `@shared` | `shared/` |

| 变量 | 说明 |
|------|------|
| `VITE_HASH_ROUTING` | `"true"` 启用 Hash 路由（singlefile 构建） |

详见 [管理后台 README](../paleontology-admin-latest/README.md) 与 [CMS 后端 README](../paleontology-cms-backend/README.md)。

---

## 功能模块说明

与前台顶栏、侧栏一一对应；CMS 子模块在 `/admin/cms/:section` 维护。

### 业务管理

| 模块 | 路由 | 角色 | 功能说明 |
|------|------|------|----------|
| **仪表盘** | `/admin/dashboard` | 总/分会/财务 | 正式会员数、入会办理中、待审核队列、会费/会议费趋势与分会分布 |
| **审核工作台** | `/admin/audit` | 总管理员、财务 | 入会/退会申请审核；会员费、会议费凭证与发票两阶段审核 |
| **审计追溯** | `/admin/audit-trail` | 总管理员、分会 | 关键操作只读日志；面向客户的中文摘要与用户信息 |
| **会员用户管理** | `/admin/users/members` | 总管理员 | 仅**正式会员**（申请书+凭证+发票全流程通过） |
| **非会员用户管理** | `/admin/users/non-members` | 总管理员 | 非会员及入会办理中（申请已通过待缴费等） |
| **会议管理** | `/admin/conferences` | 总/分会 | 会议信息、四类费用、报名截止、摘要/住宿/野外配置 |
| **统计中心** | `/admin/statistics` | 总/分会/财务 | 全局 → 分会 → 单会三级钻取 |
| **财务记录** | `/admin/finance` | 财务 | 缴费记录查询、按人群分类 ZIP 导出 |
| **分会管理** | `/admin/branches` | 总管理员 | 分会名称、简介、启用状态 |

### CMS 内容子模块（`CMS_SECTION_META`）

| section | 标题 | 维护内容 | 前台对应 |
|---------|------|----------|----------|
| `banners` | 轮播图 | 首页大图与链接 | `/` |
| `news` | 新闻动态 | 学会要闻 | 首页摘要 |
| `pages` | 学会简介 | 概况、章程、领导机构等 | `/intro` |
| `personnel` | 组织机构 | 架构图与管理系列 | `/structure` |
| `branch` | 分会栏目 | 各分会子站栏目 | `/structure/branch/*` |
| `awards` | 获奖成果 | 奖项与获奖人 | 简介内展示 |
| `announcements` | 会员公告 | 学会/分会公告 | `/society-announcements` |
| `timeline` | 学会沿革 | 时间线节点 | `/history` |
| `gallery` | 历史相册 | 分类相册 | `/gallery` |
| `services` | 学会服务 | 会员/会议服务说明 + 国际交流/科学传播/科技奖励内容 | `/services`、`/international`、`/science` |
| `regulations` | 规章条例 | 制度正文与附件 | `/regulations` |
| `publish` | 新闻发布 | 会议通知、党务公开、重要新闻 | `/news-publish` |
| `public-files` | 公开文件 | 公开下载资料 | `/public-downloads` |
| `party` | 党建文化 | 12 个党建子栏目文章 | `/party` 及子路由 |
| `media` | 媒体库 | 图片与附件统一存储 | 全站引用 |
| `settings` | 站点配置 | 版权、联系方式、快捷入口 | 全站页脚等 |

> `international`、`science`、`tech-rewards` 已合并至 `services`，编辑时请进入「学会服务」。

### 栏目编排

`/admin/cms/channels` — 配置顶栏顺序、路由路径、`layoutType`、可见性与页面区块；变更后前台导航自动更新。

> **客户可读版**：[docs/2026-07-06-功能模块说明.md](../docs/2026-07-06-功能模块说明.md)、[docs/2026-07-06-客户需求说明-基于当前实现.md](../docs/2026-07-06-客户需求说明-基于当前实现.md)

---

## 路线图

| 阶段 | 状态 |
|------|------|
| Phase 0–3 | 数据模型、分会隔离、三级统计、ZIP 导出 ✅ |
| Phase 4 | CMS + 用户/会员/审核/审计 API 对接 ✅；会议管理 localStorage 迁移进行中 |
| Phase 5 | 全业务 API 化、生产部署、文档验收 |

---

## License

MIT
