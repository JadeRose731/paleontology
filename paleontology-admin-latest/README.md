# 中国古生物学会 · 管理后台

中国古生物学会（Palaeontological Society of China）管理后台 —— 基于 React 的浏览器端单页应用（SPA），用于管理学会及其 11 个分会的会员、学术会议、财务审核、统计数据、分支机构，以及 CMS 内容与栏目编排。

> **架构说明：** 本应用采用**混合数据模式**：
> - **CMS 内容**（轮播、新闻、栏目、版式等）通过 `paleontology-cms-backend` REST API 读写（MySQL 持久化）
> - **业务数据**（会员、会议报名、审核、财务）仍存储在浏览器 `localStorage`，首次加载自动填充演示数据
>
> 开发 CMS 功能时需先启动后端（`http://localhost:8089`）；仅体验会员/审核模块时可不启动后端。

---

## 技术栈

| 类别 | 技术 |
|------|------|
| **框架** | React 19 |
| **语言** | TypeScript 5.6 |
| **构建工具** | Vite 7 |
| **包管理器** | pnpm 10.4 |
| **CSS 框架** | Tailwind CSS v4 |
| **组件库** | shadcn/ui (New York 风格) + Radix UI 原语 |
| **路由** | wouter (支持 Hash 路由) |
| **表单** | react-hook-form + zod 校验 |
| **图表** | recharts |
| **动画** | framer-motion |
| **Toast** | sonner |
| **图标** | lucide-react |
| **文件导出** | JSZip + file-saver |

---

## 项目结构

```
paleontology-admin-latest/
├── client/                          # 应用源码（Vite root）
│   ├── index.html                   # 开发入口 HTML
│   ├── 中国古生物学会_管理后台.html  # 单文件构建入口 HTML
│   └── src/
│       ├── main.tsx                 # 应用入口
│       ├── App.tsx                  # 路由定义
│       ├── index.css                # Tailwind + CSS 变量主题
│       ├── components/              # 布局与 UI 组件
│       │   ├── AdminLayout.tsx      # 认证布局（侧边栏 + 顶栏 + 内容区）
│       │   ├── AdminSidebar.tsx     # 导航侧边栏（角色 + CMS 栏目树过滤）
│       │   ├── AdminTopBar.tsx      # 顶栏（通知 + 用户菜单）
│       │   └── ui/                  # shadcn/ui 组件（25+）
│       ├── contexts/
│       │   └── AdminContext.tsx     # 全局状态（认证/业务 CRUD/审计/统计/菜单）
│       ├── lib/
│       │   ├── cms-api.ts           # CMS REST 客户端（JWT、条目/栏目/版式/仪表盘）
│       │   ├── cms-sync.ts          # CmsDatabase ↔ ApiCmsEntry 双向映射
│       │   ├── cms-channel-nav.ts   # CMS 栏目树 → 侧边栏菜单
│       │   ├── cms-layout-schemas.ts# 版式参数 JSON Schema
│       │   └── utils.ts             # cn() 工具函数
│       ├── hooks/
│       │   └── useComposition.ts    # 中文输入法 composition 事件处理
│       └── pages/admin/
│           ├── LoginPage.tsx        # 登录页（业务登录 + CMS JWT）
│           ├── Dashboard.tsx        # 仪表盘（业务统计 + CMS API 汇总）
│           ├── AuditWorkbench.tsx   # 财务审核工作台
│           ├── MemberManagement.tsx # 会员管理
│           ├── NonMemberManagement.tsx
│           ├── ConferenceManagement.tsx
│           ├── Statistics.tsx       # 三级统计
│           ├── FinanceRecords.tsx   # 财务记录与 ZIP 导出
│           ├── BranchManagement.tsx
│           ├── cms/
│           │   ├── ContentManagement.tsx  # 17 个 CMS 子模块内容编辑
│           │   ├── ChannelManagement.tsx  # 栏目编排与版式参数
│           │   ├── LayoutParamsEditor.tsx
│           │   ├── cms-data.ts      # CMS 领域类型 + fetch/save API 封装
│           │   ├── cms-nav.ts       # 子模块元数据与党建栏目码
│           │   └── cms-ui.tsx       # CMS 共享 UI 片段
│           └── NotFound.tsx
├── shared/                          # 共享常量
│   ├── const.ts
│   └── constants.ts                 # 费用配置、状态枚举、分会映射等
├── vite.config.ts                   # Vite 配置（含 CMS 后端代理）
├── vite.singlefile.config.ts        # 单文件构建配置
├── tsconfig.json
├── components.json                  # shadcn/ui 配置
└── package.json
```

---

## 快速开始

### 环境要求

- **Node.js** ≥ 18
- **pnpm** ≥ 10（推荐使用 `corepack enable && corepack prepare pnpm@latest --activate`）
- **CMS 功能**：MySQL + `paleontology-cms-backend`（见 [CMS 后端 README](../paleontology-cms-backend/README.md)）

### 安装与运行

```bash
# 安装依赖
pnpm install

# 启动开发服务器（默认 http://localhost:3001，局域网可访问）
pnpm dev

# TypeScript 类型检查
pnpm check

# 代码格式化
pnpm format
```

### 联调 CMS 后端

```bash
# 终端 1：启动 CMS 后端
cd ../paleontology-cms-backend
mvn spring-boot:run

# 终端 2：启动管理端（vite.config.ts 已配置代理）
cd ../paleontology-admin-latest
pnpm dev
```

`vite.config.ts` 已将 `/paleo`、`/login`、`/getInfo`、`/uploads` 代理到 `http://localhost:8089`。

### 构建

```bash
# 标准 SPA 构建 → dist/
pnpm build

# 预览构建结果
pnpm preview

# 单文件 HTML 构建 → dist/singlefile/
pnpm build:singlefile
```

---

## 功能模块

### 认证与权限

登录与角色以 **CMS 后端 JWT** 为准（`paleontology-cms-backend`），不再写死 `admin/admin123`。

系统内置三种角色，共 13 个演示账号（密码统一 `admin123`，由 Flyway V23 + `AdminUserInitializer` 种子）：

| 角色 | 权限范围 | 演示账号 |
|------|----------|----------|
| **学会总管理员** (super_admin) | 全部功能 + 全部 CMS 模块 | `admin@paleontology.org.cn` |
| **分会管理员** (branch_admin) | 本分会会议、统计、分会 CMS | 11 个分会各一个账号，如 `branch_gjzdw@paleo.org.cn` |
| **财务审核员** (finance_reviewer) | 审核、财务记录、统计 | `finance@paleontology.org.cn` |

> 登录流程：`adminLogin` → `POST /login`（邮箱+密码）→ JWT 写入 `paleo_cms_token`；会话恢复调用 `/getInfo` 获取真实 `role` / `branchId`。  
> CMS API 返回 401 时自动清 token 并跳转 `/admin/login`。  
> 后端未启动时仅允许 `BUILT_IN_ADMINS` 离线 fallback，并明确提示 API 不可用。

### 业务页面

| 路由 | 页面 | 功能描述 |
|------|------|----------|
| `/admin/login` | 登录 | 表单登录，zod 校验，演示账号提示 |
| `/admin/dashboard` | 仪表盘 | 统计卡片、柱状图/饼图、审核队列、缴费趋势 |
| `/admin/audit` | 审核工作台 | 两阶段缴费审核、入会/退会审核、批量操作 |
| `/admin/users/members` | 会员管理 | 搜索/筛选、详情、手动激活/到期 |
| `/admin/users/non-members` | 非会员管理 | 非会员用户管理 |
| `/admin/conferences` | 会议管理 | 会议 CRUD、4 档费用、模板上传、住宿/考察路线 |
| `/admin/statistics` | 统计中心 | 三级钻取：全局 → 分会 → 会议 |
| `/admin/finance` | 财务记录 | 缴费记录浏览/筛选，ZIP 分类导出 |
| `/admin/branches` | 分会管理 | 编辑分会名称/简介/Logo，启用/禁用 |

### CMS 内容管理

| 路由 | 页面 | 功能描述 |
|------|------|----------|
| `/admin/cms` | 重定向 | 跳转至角色默认 CMS 子模块 |
| `/admin/cms/:section` | 内容管理 | 17 个子模块 CRUD（见下方 moduleCode 列表） |
| `/admin/cms/channels` | 栏目编排 | 频道树、版式类型、layoutParams、区块维护 |

CMS 子模块（`:section`）与 `moduleCode` 对应：

`banners` · `news` · `pages` · `personnel` · `awards` · `announcements` · `timeline` · `gallery` · `international` · `downloads` · `regulations` · `science` · `tech-rewards` · `party` · `branch` · `media` · `settings` · `publish` · `public-files`

数据流：`ContentManagement` → `fetchCmsDatabase()` / `saveCmsDatabase()` → `cms-api.ts` → `/paleo/cms` REST API。本地 `localStorage`（`paleo_admin_cms_db`）仅作缓存。

---

## 数据模型

### 业务数据（localStorage，`paleo_admin_*` 前缀）

- **Users** — 管理员账号
- **Memberships** — 会员记录（2 阶段缴费流程）
- **Conferences** — 学术会议（4 档费用、截止日期、分会场等）
- **Branches** — 11 个分会 + 1 个总会
- **Audit Logs** — 审核操作日志
- **Notifications** — 管理员通知

首次加载时 `seedDemoData()` 自动生成 30+ 位模拟研究者数据。

### CMS 数据（MySQL，经 API）

- **Entries** — 内容条目（`moduleCode` + `columnCode` + `extraJson`）
- **Channels** — 栏目编排（路由、版式、导航、内容过滤）
- **Blocks** — 栏目内区块
- **Layouts** — 版式注册表（`layoutType` → React 组件映射）

JWT 存于 `localStorage` 的 `paleo_cms_token`。

---

## 构建模式

### 标准 SPA 构建

```bash
pnpm build
```

- 输出到 `dist/`
- 使用 HTML5 History 路由
- 适合部署到 Web 服务器（需配置 SPA fallback）

### 单文件 HTML 构建

```bash
pnpm build:singlefile
```

- 输出到 `dist/singlefile/`
- 所有 JS/CSS 内联为单个 HTML 文件
- 强制 Hash 路由（兼容 `file://` 协议）
- 文件上限 100MB

---

## 配置说明

### Vite 路径别名

| 别名 | 路径 |
|------|------|
| `@` | `client/src/` |
| `@shared` | `shared/` |

### 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_HASH_ROUTING` | 设为 `"true"` 时启用 Hash 路由（单文件构建自动设置） |

---

## 开发指南

### 组件约定

- 页面组件位于 `client/src/pages/admin/`
- 布局组件位于 `client/src/components/`
- UI 基础组件位于 `client/src/components/ui/`（shadcn/ui）
- 业务状态集中在 `AdminContext.tsx`；CMS API 在 `lib/cms-api.ts`

### 样式

- Tailwind CSS v4 工具类 + `@theme` 自定义变量（`index.css`）
- `cn()` 合并类名（`clsx` + `tailwind-merge`）
- 组件变体使用 `class-variance-authority`

### 中文输入

- `useComposition` hook 处理 IME 组合输入，避免中文输入过程中误触发搜索

---

## 三级统计字段（MRD 对齐）

所有会议相关数字均通过 `collectConferenceAttendees` 从 `paleo_admin_confs_*` 实收聚合，**禁止**用 `registrations` 字段估算。

| 层级 | 主要指标 |
|------|----------|
| **全局** | 总注册/会员/非会员（含学生分层）、会员费累计、12 学会会议费分项 |
| **学会/分会** | 累计确认参会人数、四类人群人数、四类会议费笔数/金额 |
| **单次会议** | 四类费用笔数/金额、确认参会总人数、口头/展板报告、住宿、野外 |

## ZIP 导出目录规范

```
export_{scope}_{id}_{date}/
├── 学生会员/缴费凭证/、电子发票/
├── 非学生会员/…
├── 学生（非会员）/…
├── 非学生（非会员）/…
└── 汇总台账.csv
```

- 全局导出：`export_global_all_{date}/{学会名}/…`
- 单文件命名：`{姓名}_{身份}_{日期}_{流水号}.ext`
- 超过 1GB 自动拆分为多个 ZIP 包

## 与用户端 localStorage 联调

管理端审核/导出读取 `paleo_admin_*` key；审核写回时同步 `paleo_*` key：

| 管理端 | 用户端 |
|--------|--------|
| `paleo_admin_membership_application_{email}` | `paleo_membership_application_{email}` |
| `paleo_admin_withdrawal_application_{email}` | `paleo_withdrawal_application_{email}` |
| `paleo_admin_society_membership_{email}` | `paleo_society_membership_{email}` |
| `paleo_admin_confs_{email}` | `paleo_confs_{email}` |

用户端通过 `storage` 事件 + 轮询刷新状态。

---

## 路线图

- **Phase 0–3** — 数据模型、分会隔离、三级统计、ZIP 导出、审核联调 ✅
- **Phase 4（进行中）** — CMS 内容/栏目已对接 `paleontology-cms-backend`；会员/会议业务仍待对接生产 API
- **Phase 5** — 文档同步与验收

---

## License

MIT
