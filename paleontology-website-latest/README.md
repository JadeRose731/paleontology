# 中国古生物学会网站 (Paleontological Society of China)

中国古生物学会官方门户网站 — 包含学会主站（面向公众）和党建文化子系统（面向内部）的 React SPA。**页面内容与导航由 CMS 后端驱动**；会员/会议业务仍使用浏览器 `localStorage` 原型。

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
- **表单**: react-hook-form + zod
- **动画**: framer-motion + tw-animate-css
- **图表**: recharts · **轮播**: embla-carousel-react
- **Markdown**: streamdown · **Toast**: sonner
- **图标**: lucide-react + Material Symbols
- **地图**: Google Maps（Manus 代理，无需 API Key）

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器 (http://localhost:3000)
pnpm dev

# TypeScript 类型检查
pnpm check

# 代码格式化
pnpm format
```

### 联调 CMS 后端

```bash
# 终端 1
cd ../paleontology-cms-backend && mvn spring-boot:run

# 终端 2
cd ../paleontology-website-latest && pnpm dev
```

后端未启动时，导航回退到内置 `FALLBACK_*` 常量，CMS 页面显示 404 或空数据。

## 构建与部署

```bash
# 标准构建 — dist/ (pushState 路由 + Express 服务端)
pnpm build

# 单文件构建 — hash 路由，支持 file:// 协议
pnpm build:singlefile

# 生产环境启动
pnpm start
```

- `pnpm build` = Vite 构建客户端 + esbuild 打包 Express → `dist/public/` + `dist/index.js`
- `pnpm build:singlefile` 会先执行 `scripts/download-fonts.ts`，再内联为单 HTML
- 生产端口：`PORT` 环境变量，默认 3000

## 项目结构

```
├── client/
│   ├── index.html              # HTML 入口（Google Fonts <link> 加在这里）
│   ├── public/                 # favicon、robots.txt 等小文件
│   └── src/
│       ├── main.tsx
│       ├── App.tsx             # 显式路由 + CMS catch-all
│       ├── index.css           # 设计 Token、Tailwind
│       ├── pages/              # 定制页（不走通用版式）
│       ├── components/
│       │   ├── ui/             # shadcn/ui 基础组件
│       │   ├── cms/            # CMS 版式组件与动态页壳
│       │   │   ├── CmsDynamicPage.tsx   # 通用 CMS 页面入口
│       │   │   ├── CmsPageShell.tsx
│       │   │   ├── layout-registry.tsx  # layoutType → React 组件
│       │   │   └── cms-layouts/         # timeline/list/gallery 等版式
│       │   ├── party/          # 党建专用组件
│       │   ├── PartyLayout.tsx # 全局布局壳（顶栏、侧栏、面包屑、页脚）
│       │   ├── LoginJoinDialog.tsx
│       │   ├── MembershipChoiceDialog.tsx
│       │   └── Map.tsx
│       ├── contexts/
│       │   ├── MembershipContext.tsx  # 会员/认证/会议（localStorage）
│       │   └── ThemeContext.tsx
│       ├── hooks/
│       │   ├── useCmsChannels.ts      # 顶栏/党建导航
│       │   ├── useCmsPageResolve.ts   # 页面一站式解析
│       │   ├── useCmsEntries.ts       # 按 moduleCode 拉内容
│       │   ├── useCmsChannel.ts       # 单栏目元数据
│       │   └── useSiteConfig.ts       # 站点配置
│       └── lib/
│           ├── cms-api.ts      # 公开 CMS REST 客户端
│           └── cms-types.ts
├── server/index.ts             # 生产 Express 静态托管
├── shared/constants.ts         # 分会、会议费用、状态枚举
├── scripts/download-fonts.ts   # 单文件构建字体下载
└── patches/wouter@3.7.1.patch
```

### 路径别名

| 别名 | 实际路径 |
|------|---------|
| `@/*` | `client/src/*` |
| `@shared/*` | `shared/*` |
| `@assets/*` | `attached_assets/*` |

## 架构：CMS 驱动 + 定制页

### 路由策略（`App.tsx`）

**显式注册的定制页**（保留独立 React 实现）：

| 路由 | 组件 | 说明 |
|------|------|------|
| `/` | SocietyHome | 学会首页（CMS 轮播/新闻 + 定制布局） |
| `/intro` | Intro | 学会简介 |
| `/branches` | Branches | 分支机构 |
| `/personal-center` | PersonalCenter | 个人中心（会员业务） |
| `/party` | Home | 党建首页 |
| `/reporting` | Reporting | 违法违纪举报（定制表单） |
| `/society-announcements` | SocietyAnnouncements | 会员公告 |

**CMS catch-all**：其余路径（如 `/structure`、`/history`、`/services`、`/announcements` 等）由 `CmsDynamicPage` 处理：

1. 调用 `/paleo/cms-channels/public/resolve?routePath=...`
2. 若 `pageType === "CUSTOM"`，渲染 `CUSTOM_PAGE_REGISTRY` 中的定制组件
3. 否则按 `layoutType` 从 `layout-registry.tsx` 选择版式组件

定制页注册（`pageType=CUSTOM`）：

| channelCode | 组件 |
|-------------|------|
| `services` | Services（会员服务） |
| `public_files` | PublicDownloads |
| `downloads` | DownloadsCenter |

### 版式注册表（`layout-registry.tsx`）

| layoutType | 组件 | 典型页面 |
|------------|------|----------|
| `timeline` | CmsTimelineLayout | 学会沿革 |
| `list` | CmsListLayout | 通知、动态 |
| `list-multi-column` | CmsListMultiColumnLayout | 多栏列表 |
| `gallery-grid` | CmsGalleryLayout | 历史相册 |
| `personnel-cards` | CmsPersonnelLayout | 组织机构 |
| `richtext-single` / `mixed` | CmsRichTextLayout | 富文本页 |
| `file-list` | CmsFileListLayout | 资料下载 |
| `international` | CmsInternationalLayout | 国际交流 |

频道编码覆盖：`regulations` → 规章条例专用版式；`party_topics` → 党建专题。

### 导航

`PartyLayout` 通过 `useCmsChannels()` 从 `/paleo/cms-channels/public/list` 构建：

- **顶栏**：顶级栏目（`parentId = 0`）
- **党建侧栏**：`party` 频道的子栏目

CMS 不可用时回退到 `FALLBACK_MAIN_NAV` / `FALLBACK_PARTY_NAV`。

## 布局规则

`PartyLayout.tsx` 根据路径或 CMS 传入的 `fullWidth` / `showPartySidebar` 决定布局：

| 页面类型 | 布局方式 |
|---------|---------|
| 首页 (`/`)、会员服务 (`/services`) 等 | 全宽，无党建侧栏 |
| 党建子栏目 | **双栏**：左侧党建导航 + 右侧内容 |
| 其他 CMS 页 | 全宽 + 面包屑 |

`isFullWidthPage` 内置了常见全宽路径；CMS 版式组件也可通过 props 覆盖。

## 核心状态：MembershipContext

`MembershipContext` 管理会员业务（**localStorage**，前缀 `paleo_*`）：

### 认证

- 注册 / 登录 / 登出 / 注销账号（`paleo_user_db`）
- 弹窗：`LoginJoinDialog.tsx`

### 会员双路径

| 路径 | userType | 说明 |
|------|----------|------|
| **非会员** | `non_member` | 无需缴费，会议费 = 会员价 × 1.1 |
| **正式会员** | `member` | 两阶段缴费审核后享受会员价 |

首次登录强制 `MembershipChoiceDialog` 选择路径。

### 业务功能

- 学会会费（member）、分会绑定、会议报名（四类费用 + `feeType` 锁定）
- 入会/退会申请（与管理端 AuditWorkbench 双写联调）
- 顶栏通知铃铛

### localStorage Key 对照（用户端 ↔ 管理端）

| 语义 | 用户端 | 管理端 |
|------|--------|--------|
| 会议报名 | `paleo_confs_{email}` | `paleo_admin_confs_{email}` |
| 会员状态 | `paleo_society_membership_{email}` | `paleo_admin_society_membership_{email}` |
| 分会绑定 | `paleo_bound_branches_{email}` | `paleo_admin_bound_branches_{email}` |
| 入会申请 | `paleo_membership_application_{email}` | `paleo_admin_membership_application_{email}` |
| 退会申请 | `paleo_withdrawal_application_{email}` | `paleo_admin_withdrawal_application_{email}` |

总学会虚拟绑定：`isSocietyAccessible(boundBranches, "zgswxh")` 恒为 `true`。

> 共享常量（分会 ID、费用、状态枚举）在 `shared/constants.ts`，页面中勿硬编码。

## 视觉设计：地层次韵 (Strata & Heritage)

| 角色 | 色值 | 用途 |
|------|------|------|
| 地层深蓝 | `#002B49` | 导航栏、标题 |
| 党建红 | `#C41E3A` | 强调、侧栏激活态 |
| 典雅金 | `#D9C5A0` | 高亮、页脚 |
| 纸色亮白 | `#FCFAF7` | 页面背景 |
| 化石石色 | `#E5E1DA` | 边框、卡片 |

- 圆角 `0.25rem`，主题锁定 `light`
- 自定义类：`.party-gradient`、`.party-card-border`、`.xingkai-script`
- 详见 `ideas.md`

## 开发要点

### CMS 扩展

1. 在管理端 **栏目编排** 新增频道（设置 `routePath`、`layoutType`、`contentModule`）
2. 用户端无需改 `App.tsx` — catch-all 自动解析
3. 若需全新交互，设置 `pageType=CUSTOM` 并在 `CmsDynamicPage` 的 `CUSTOM_PAGE_REGISTRY` 注册

### 组件与路由

- shadcn/ui 在 `components/ui/`，禁止重复实现
- 使用 `<Link href="...">` 导航，勿嵌套 `<a>`
- `<Select.Item>` 必须有非空 `value`

### Vite 开发插件

- Manus Runtime、JSX Loc、调试日志收集（`.manus-logs/`）、Storage Proxy（`/manus-storage/*`）

## 环境变量

| 变量 | 说明 |
|------|------|
| `PORT` | 生产服务端口（默认 3000） |
| `VITE_HASH_ROUTING` | 启用 hash 路由（singlefile 构建自动设置） |
| `VITE_CMS_API_BASE` | CMS API 根路径（默认空，走 Vite 代理） |
| `NODE_ENV` | `production` 时启用生产模式 |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | Storage Proxy 所需 |

## 补充说明

- 暂无自动化测试（`vitest` 在 devDependencies 但无测试文件）
- `patches/wouter@3.7.1.patch` 为 wouter 补丁
- CMS 内容与导航依赖 `paleontology-cms-backend`；会员/会议仍为前端原型数据
