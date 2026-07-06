# 中国古生物学会网站 (Paleontological Society of China)

中国古生物学会官方门户网站 — 包含学会主站（面向公众）和党建文化子系统（面向内部）的 React SPA。

- **页面内容与导航**：由 `paleontology-cms-backend` CMS API 驱动
- **会员 / 会议业务**：已对接 CMS 后端 REST API（JWT 持久化）；无 token 时回退 `localStorage` 演示数据

## 技术栈

| 技术 | 版本 / 工具 |
|------|------------|
| **框架** | React 19 |
| **构建** | Vite 7 |
| **CSS** | Tailwind CSS 4 + shadcn/ui (New York 风格) |
| **路由** | wouter (pushState / hash 双模式) |
| **服务端** | Express (生产环境静态文件托管) |
| **语言** | TypeScript 5.6 |
| **包管理** | pnpm 10.4 |

### 核心依赖

- **CMS 数据**：`lib/cms-api.ts` → `paleontology-cms-backend`
- **会员/会议 API**：`lib/membership-api.ts` → `/paleo/auth`、`/paleo/membership`、`/paleo/conferences`、`/paleo/user-bindings`
- **表单**: react-hook-form + zod
- **动画**: framer-motion + tw-animate-css
- **图表**: recharts · **轮播**: embla-carousel-react
- **Markdown**: streamdown · **Toast**: sonner
- **图标**: lucide-react + Material Symbols
- **地图**: Google Maps（Manus 代理，无需 API Key）

## 快速开始

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm check        # TypeScript 检查
pnpm format       # Prettier
```

### 联调 CMS 后端（推荐）

```bash
# 终端 1
cd ../paleontology-cms-backend && mvn spring-boot:run

# 终端 2
cd ../paleontology-website-latest && pnpm dev
```

`vite.config.ts` 已将 `/paleo`、`/uploads` 代理到 `http://localhost:8089`。

- 后端未启动：导航回退 `FALLBACK_*` 常量；CMS 页面可能 404/空数据
- 会员业务无 token：回退 `localStorage` 演示态；**注册/登录需后端**才能写入 MySQL

### 演示账号

| 邮箱 | 密码 | 说明 |
|------|------|------|
| `demo@paleontology.org.cn` | `demo123` | 启动时由后端自动创建 |

## 构建与部署

```bash
pnpm build          # dist/public + dist/index.js (Express)
pnpm build:singlefile # hash 路由，支持 file://
pnpm start          # 生产启动，默认端口 3000
```

- `PORT` 环境变量控制生产端口
- `VITE_HASH_ROUTING=true` 由 singlefile 构建自动设置

## 项目结构

```
├── client/
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── App.tsx             # 显式路由 + CMS catch-all
│       ├── pages/              # 定制页（Home、Services、PersonalCenter 等）
│       ├── components/
│       │   ├── ui/             # shadcn/ui
│       │   ├── cms/            # CMS 版式与 CmsDynamicPage
│       │   ├── services/       # 国际交流、科学传播等内容面板
│       │   ├── PartyLayout.tsx # 全局布局壳
│       │   ├── LoginJoinDialog.tsx
│       │   └── MembershipChoiceDialog.tsx
│       ├── contexts/
│       │   └── MembershipContext.tsx  # 认证 + 会员/会议状态
│       ├── hooks/              # useCmsChannels、useCmsPageResolve 等
│       └── lib/
│           ├── cms-api.ts
│           └── membership-api.ts
├── server/index.ts
├── shared/
│   ├── constants.ts            # 分会、费用、状态枚举
│   └── service-content-sections.ts
└── patches/wouter@3.7.1.patch
```

### 路径别名

| 别名 | 路径 |
|------|------|
| `@/*` | `client/src/*` |
| `@shared/*` | `shared/*` |
| `@assets/*` | `attached_assets/*` |

## 架构：CMS 驱动 + 定制页

### 路由策略

**显式定制页**（独立 React 实现）：

| 路由 | 说明 |
|------|------|
| `/` | 学会首页 |
| `/intro` | 学会简介 |
| `/structure` | 组织机构（分会子站） |
| `/services` | 学会服务（会员/会议/国际交流/科学传播等 Tab） |
| `/international` | 国际交流（与 services 数据同源） |
| `/science` | 科学传播（与 services 数据同源） |
| `/personal-center` | 个人中心 |
| `/party` 及子路由 | 党建文化 |

**CMS catch-all**：其余路径由 `CmsDynamicPage` 经 `/paleo/cms-channels/public/resolve` 解析渲染。

定制页注册（`pageType=CUSTOM`）：`services`、`public_files`、`downloads` 等。

### 版式注册表（节选）

| layoutType | 典型页面 |
|------------|----------|
| `timeline` | 学会沿革 |
| `gallery-grid` | 历史相册 |
| `personnel-cards` | 组织机构 |
| `international` | 国际交流 CMS 页 |
| `science` | 科学传播 CMS 页 |
| `file-list` | 资料/公开文件下载 |

### 导航

`useCmsChannels()` 从 `/paleo/cms-channels/public/list` 构建顶栏与党建侧栏；CMS 不可用时回退内置常量。顶栏顺序可由 Flyway 迁移调整（如：国际交流 → 规章条例 → 公开文件）。

## 功能模块说明

以下与顶栏导航一致，内容主要由 CMS 管理端维护，业务交互类模块对接后端 API。

### 主站顶栏

| 模块 | 路由 | 面向用户 | 功能说明 | 管理端 moduleCode |
|------|------|----------|----------|-------------------|
| **首页** | `/` | 公众 | 学会形象展示：轮播图、要闻摘要、快捷入口、学会概况引导 | `banners`、`news` |
| **学会简介** | `/intro` | 公众 | 学会概况、章程、发展规划、领导机构、获奖成果等富文本/结构化内容 | `pages`、`awards` |
| **组织机构** | `/structure` | 公众 | 总学会组织架构图；可进入各**专业分会子站**（概况、动态、科学传播、下载等） | `personnel`、`branch` |
| **学会服务** | `/services` | 注册/会员用户 | 核心业务入口（见下方子 Tab）；含会员入会、会议报名、分会绑定、缴费与发票上传 | `services`（定制页） |
| **党建文化** | `/party` | 党员/内部 | 党建子系统首页；左侧 12 个子栏目导航（见下方） | `party` |
| **学会沿革** | `/history` | 公众 | 学会发展历史时间轴，按年代节点浏览重要事件 | `timeline` |
| **历史相册** | `/gallery` | 公众 | 历史照片分类浏览，支持图册与大图展示 | `gallery` |
| **会员公告** | `/society-announcements` | 会员/公众 | 学会及分会发布的通知公告列表 | `announcements` |
| **新闻发布** | `/news-publish` | 公众 | 会议通知、党务公开、重要新闻；支持封面与附件下载 | `publish` |
| **国际交流** | `/international` | 公众 | 外事手续、国际会议申报、合作机构等（与学会服务 Tab **同源数据**） | `services` / `international` |
| **规章条例** | `/regulations` | 公众 | 学会章程、管理办法等规章制度正文与附件 | `regulations` |
| **公开文件** | `/public-downloads` | 公众 | 无需登录即可下载的公开文档、音视频、照片等资料 | `public-files` |

### 学会服务子模块（`/services` 内 Tab）

| Tab | 路由跳转 | 功能说明 |
|-----|----------|----------|
| **服务大厅** | 页内 | 服务总览与快捷入口 |
| **专业分会** | 页内 | 浏览 11 个分会，跳转组织机构/分会子站 |
| **会员服务** | 页内 | 注册登录、路径选择（非会员/正式会员）、入会申请、会费缴纳（凭证+发票）、分会绑定、个人会员状态 |
| **学术会议** | 页内 | 总学会及各分会会议列表、会议费报名（两阶段缴费）、摘要/住宿/野外路线填报 |
| **科学传播** | `/science` | 科普文章、视频、化石保护等 CMS 内容 |
| **国际交流** | `/international` | 同顶栏国际交流 |
| **科技奖励** | 页内 | 奖项介绍与申报指南（CMS） |

**正式会员认定**（会员服务）：入会申请书通过 → 会费凭证通过 → 发票通过 → 成为正式会员（`active`）。

### 党建文化子栏目（`/party` 侧栏）

| 子栏目 | 路由 | 功能说明 |
|--------|------|----------|
| 通知公告 | `/announcements` | 党建相关通知 |
| 党群机构 | `/organizations` | 组织架构与职责 |
| 党委纪委 | `/committees` | 党委、纪委成员与分工 |
| 党建工作 | `/work` | 年度党建计划与落实情况 |
| 组织生活 | `/activities` | 三会一课、主题党日等活动 |
| 党员队伍建设 | `/team-building` | 党员发展与培训 |
| 理论学习专栏 | `/theory-study` | 理论学习资料 |
| 工作动态 | `/dynamics` | 党建新闻动态 |
| 党建专题 | `/special-topics` | 专题学习页面 |
| 先进典型 | `/exemplars` | 优秀党员与事迹 |
| 违法违纪举报 | `/reporting` | 在线举报表单（定制页） |
| 下载中心 | `/downloads` | 党建资料下载 |

### 用户中心

| 模块 | 路由 | 功能说明 |
|------|------|----------|
| **个人中心** | `/personal-center` | 资料修改、会员状态、缴费记录、会议报名、通知、注销账号 |

### 管理后台对应模块（`paleontology-admin-latest`）

| 后台菜单 | 说明 |
|----------|------|
| **仪表盘** | 用户总数、正式会员、入会办理中、待审核、会费/会议费统计 |
| **审核工作台** | 入会/退会申请、会员费与会议费两阶段审核 |
| **审计追溯** | 只读操作日志，中文摘要与用户详情 |
| **会员用户管理** | 仅**正式会员**（全流程完成） |
| **非会员用户管理** | 非会员 + 入会办理中用户 |
| **会议管理** | 会议发布、费用档位、模板与报名数据 |
| **统计中心 / 财务记录** | 三级统计、ZIP 导出 |
| **CMS 内容管理** | 上表各 `moduleCode` 的增删改发 |
| **栏目编排** | 顶栏顺序、版式类型、路由与区块 |

详见 [管理后台 README](../paleontology-admin-latest/README.md) 与 [CMS 后端 README](../paleontology-cms-backend/README.md)。

> **客户可读版**：完整业务说明见 [docs/2026-07-06-功能模块说明.md](../docs/2026-07-06-功能模块说明.md)；详细需求与验收清单见 [docs/2026-07-06-客户需求说明-基于当前实现.md](../docs/2026-07-06-客户需求说明-基于当前实现.md)。

## 会员业务（MembershipContext）

### 数据模式

| 场景 | 行为 |
|------|------|
| 已登录且有 `paleo_user_token` | 注册/登录/申请/缴费/报名均走 API；状态每 5s 轮询 + 页面聚焦时刷新 |
| 无 token | 回退 `localStorage`（`paleo_*` 前缀），仅用于离线演示 |

Token 存于 `localStorage.paleo_user_token`；用户信息存 `paleo_current_user`。

### 认证

- `POST /paleo/auth/register`、`/paleo/auth/login`
- `GET /paleo/auth/info` 返回 `user`、`profile`、`membershipStatus`
- `PUT /paleo/auth/user-type` 保存会员路径选择

### 会员双路径

| 路径 | userType | 说明 |
|------|----------|------|
| **非会员** | `non_member` | 无需缴费，会议费 = 会员价 × 1.1 |
| **正式会员** | `member` | 须完成入会全流程（见下） |

首次登录且 `userType === regular` 时弹出 `MembershipChoiceDialog`；选择结果持久化到后端与 `localStorage`，**重复登录不再弹出**。

### 正式会员认定（与后台一致）

须依次完成：

1. 入会申请书审核通过 → `application_approved`
2. 会费凭证审核通过 → `invoice_pending`
3. 发票审核通过 → `active`（正式会员）

状态解析：`resolveMembershipStatusFromApi()` 与后端 `PaleoMembershipStatusService` 对齐。

### 主要 API

| 模块 | 路径前缀 |
|------|----------|
| 入会/退会申请 | `/paleo/membership/applications/mine` |
| 会员费 | `/paleo/membership/payments/mine` |
| 会议报名 | `/paleo/conferences/registrations/mine` |
| 分会绑定 | `/paleo/user-bindings/mine` |

### localStorage 对照（用户端 ↔ 管理端）

| 语义 | 用户端 | 管理端 |
|------|--------|--------|
| 会议报名 | `paleo_confs_{email}` | `paleo_admin_confs_{email}` |
| 会员状态 | `paleo_society_membership_{email}` | `paleo_admin_society_membership_{email}` |
| 分会绑定 | `paleo_bound_branches_{email}` | `paleo_admin_bound_branches_{email}` |
| 用户类型 | `paleo_user_type_{email}` | — |
| 路径已选 | `paleo_choice_made_{email}` | — |

有 API token 时，业务状态**优先从后端同步**，不读上述缓存。

## 视觉设计：地层次韵 (Strata & Heritage)

| 角色 | 色值 |
|------|------|
| 地层深蓝 | `#002B49` |
| 党建红 | `#C41E3A` |
| 典雅金 | `#D9C5A0` |
| 纸色亮白 | `#FCFAF7` |
| 化石石色 | `#E5E1DA` |

详见 `ideas.md`、`CLAUDE.md`。

## 环境变量

| 变量 | 说明 |
|------|------|
| `PORT` | 生产端口（默认 3000） |
| `VITE_HASH_ROUTING` | 启用 hash 路由（singlefile 构建） |
| `VITE_CMS_API_BASE` | CMS API 根路径（默认空，走 Vite 代理） |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | Storage Proxy |

## 补充说明

- 暂无自动化测试（`vitest` 在 devDependencies 但无测试文件）
- CMS 依赖 `paleontology-cms-backend`；完整会员流程需后端 + MySQL
- 更详细的开发约定见仓库根目录 `CLAUDE.md`
