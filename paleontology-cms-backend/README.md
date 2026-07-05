# paleontology-cms-backend

中国古生物学会 **轻量 CMS 后端**，API 契约与 `PaleontologicalResearch` 生产栈对齐，为 `paleontology-admin-latest` 与 `paleontology-website-latest` 提供内容、栏目编排与媒体存储。

## 技术栈

| 组件 | 版本 |
|------|------|
| Java | 8（字节码目标；可用 JDK 17 编译） |
| Spring Boot | 2.5.15 |
| MyBatis-Plus | 3.4.3 |
| Flyway | 数据库迁移 |
| MySQL | 5.7+ |
| Redis | 可选（JWT 黑名单；默认已 exclude） |
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

> 默认 `application-dev.yml` 已 exclude Redis 自动配置，无 Redis 亦可运行。

### 3. 启动

```bash
cd paleontology-cms-backend
mvn spring-boot:run
```

- 服务地址：`http://localhost:8089`
- API 文档：`http://localhost:8089/doc.html`
- 默认账号：`admin` / `admin123`
- 上传目录：`${user.home}/paleo-cms/uploads`（可通过 `cms.upload.base-dir` 修改）
- 上传 URL 前缀：`/uploads`（静态资源映射）

Flyway 启动时自动执行 `src/main/resources/db/migration/V1`–`V11` 迁移脚本（建表 + 种子数据 + 栏目/版式注册）。

### IntelliJ IDEA 编译提示「源发行版 17 需要目标发行版 17」

本仓库 **字节码目标为 Java 8**。若 IDE 报错：

1. **Maven 重新加载**：右键 `pom.xml` → Maven → Reload Project
2. **Project Structure** → Project language level：**8**
3. **Settings → Compiler → Java Compiler** → Project bytecode version：**8**
4. **Build → Rebuild Project**

命令行验证：`mvn clean compile`

## API 概览

响应格式与 RuoYi / PaleontologicalResearch 一致：

```json
{ "code": 200, "msg": "操作成功", "data": ... }
```

分页列表：

```json
{ "code": 200, "msg": "查询成功", "rows": [...], "total": 100 }
```

### 认证

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/login` | 匿名 | **管理端**登录，返回 JWT |
| GET | `/getInfo` | JWT | 当前管理员信息（role、branchId） |
| POST | `/paleo/auth/register` | 匿名 | **网站用户**注册 |
| POST | `/paleo/auth/login` | 匿名 | **网站用户**登录 |
| GET | `/paleo/auth/info` | JWT | 当前用户 + 会员档案 |
| PUT | `/paleo/auth/profile` | JWT | 更新个人资料 |
| PUT | `/paleo/auth/user-type` | JWT | 更新会员路径（regular/non_member/member） |

```http
POST /login
Content-Type: application/json

{"username":"admin","password":"admin123"}
```

网站用户登录：

```http
POST /paleo/auth/login
Content-Type: application/json

{"email":"demo@paleontology.org.cn","password":"demo123"}
```

演示账号（启动时自动创建）：

| 邮箱 | 密码 |
|------|------|
| `demo@paleontology.org.cn` | `demo123` |
| `member@paleontology.org.cn` | `password123` |
| `student@paleontology.org.cn` | `password123` |

后续请求：

```http
Authorization: Bearer <token>
```

### CMS 内容条目 `/paleo/cms`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/paleo/cms/list` | JWT | 管理端分页列表 |
| GET | `/paleo/cms/{entryId}` | JWT | 管理端详情 |
| GET | `/paleo/cms/public/list` | 匿名 | 公开已发布列表 |
| GET | `/paleo/cms/public/{entryId}` | 匿名 | 公开详情 |
| POST | `/paleo/cms` | JWT | 新增 |
| PUT | `/paleo/cms` | JWT | 修改 |
| POST | `/paleo/cms/media/upload` | JWT | 媒体上传（本地存储） |
| POST | `/paleo/cms/{entryId}/status` | JWT | 发布/下架 |
| POST | `/paleo/cms/{entryId}/delete` | JWT | 逻辑删除 |

### CMS 栏目编排 `/paleo/cms-channels`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/paleo/cms-channels/tree` | JWT | 管理端栏目树 |
| GET | `/paleo/cms-channels/list` | JWT | 管理端分页列表 |
| GET | `/paleo/cms-channels/{channelId}` | JWT | 栏目详情 |
| GET | `/paleo/cms-channels/public/list` | 匿名 | 公开导航列表 |
| GET | `/paleo/cms-channels/public/detail` | 匿名 | 按 routePath/channelCode 取栏目+区块 |
| GET | `/paleo/cms-channels/public/resolve` | 匿名 | **页面一站式解析**（栏目+区块+内容+子栏目） |
| POST/PUT | `/paleo/cms-channels` | JWT | 新增/修改栏目 |
| POST | `/paleo/cms-channels/{channelId}/status` | JWT | 发布/下架 |
| POST | `/paleo/cms-channels/{channelId}/delete` | JWT | 逻辑删除 |
| GET/POST | `/paleo/cms-channels/{channelId}/blocks` | JWT | 区块列表/新增 |
| POST | `/paleo/cms-channels/blocks/{blockId}/delete` | JWT | 删除区块 |

### CMS 版式注册表 `/paleo/cms-layouts`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/paleo/cms-layouts/list` | JWT | 管理端版式列表 |
| GET | `/paleo/cms-layouts/public/list` | 匿名 | 公开版式列表 |
| GET | `/paleo/cms-layouts/public/{layoutCode}` | 匿名 | 版式详情含 schemaJson |

### 仪表盘 `/paleo/dashboard`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/paleo/dashboard/stats` | JWT | 综合统计（用户数、会员数、内容数等） |

### 会员业务 `/paleo/membership`（Phase 1 ✅）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/paleo/membership/profiles/list` | JWT | 管理端会员档案列表 |
| GET | `/paleo/membership/profiles/mine` | JWT | 我的会员档案 |
| PUT | `/paleo/membership/profiles/mine` | JWT | 更新我的会员类别 |
| GET | `/paleo/membership/applications/list` | JWT | 管理端入会/退会申请 |
| GET | `/paleo/membership/applications/mine` | JWT | 我的申请列表 |
| POST | `/paleo/membership/applications/mine` | JWT | 提交入会/退会申请 |
| POST | `/paleo/membership/applications/{id}/review` | JWT | 管理端审核申请 |
| POST | `/paleo/membership/applications/mine/{id}/file` | JWT | 上传申请书 |
| GET | `/paleo/membership/payments/list` | JWT | 管理端会员费列表 |
| GET | `/paleo/membership/payments/mine` | JWT | 我的会员费记录 |
| POST | `/paleo/membership/payments/mine` | JWT | 提交会员费 |
| POST | `/paleo/membership/payments/{id}/review` | JWT | 管理端审核会员费 |
| POST | `/paleo/membership/payments/mine/{id}/files/{role}` | JWT | 上传凭证/发票（`voucher`/`invoice`） |
| GET | `/paleo/membership/payments/stats` | JWT | 会员费统计 |

## 模块编码（moduleCode）

与管理端 CMS 17 个子模块一致：

`banners` · `news` · `pages` · `personnel` · `awards` · `announcements` · `timeline` · `gallery` · `international` · `downloads` · `regulations` · `science` · `tech-rewards` · `party` · `branch` · `media` · `settings` · `publish` · `public-files`

## 数据库迁移

| 版本 | 说明 |
|------|------|
| V1 | 初始化 schema（CMS 条目/栏目/区块/管理员） |
| V2–V3 | 种子内容与扩展 |
| V4 | URL 列加宽 |
| V5–V6 | 管理端栏目字段、菜单子项 |
| V7 | 学会资料下载种子 |
| V8 | 版式注册表 |
| V9–V10 | 导航名称修复、简介区块种子 |
| V11 | 会员/会议相关表（基础结构 + 演示种子） |
| V12 | 网站用户表、入会/退会申请表、会员档案/缴费字段扩展 |

> **Flyway 迁移失败恢复**：若 V12 曾中途失败，需先清理失败记录再重启：
> ```sql
> DELETE FROM flyway_schema_history WHERE version = '12' AND success = 0;
> ```
> 然后重新启动应用。`paleo_user` 等已创建的表会由 `CREATE TABLE IF NOT EXISTS` 安全跳过。

## 前端对接（已集成）

### paleontology-admin-latest

`vite.config.ts` 已配置代理：

```ts
server: {
  port: 3001,
  proxy: {
    '/paleo': { target: 'http://localhost:8089', changeOrigin: true },
    '/login': { target: 'http://localhost:8089', changeOrigin: true },
    '/getInfo': { target: 'http://localhost:8089', changeOrigin: true },
    '/uploads': { target: 'http://localhost:8089', changeOrigin: true },
  },
}
```

- `lib/cms-api.ts` — REST 客户端
- `pages/admin/cms/cms-data.ts` — `fetchCmsDatabase()` / `saveCmsDatabase()` 经 API 读写
- `pages/admin/cms/ChannelManagement.tsx` — 栏目编排
- 登录成功后自动获取 CMS JWT（`admin` / `admin123`）

### paleontology-website-latest

`vite.config.ts` 已配置代理：

```ts
server: {
  port: 3000,
  proxy: {
    '/paleo': { target: 'http://localhost:8089', changeOrigin: true },
    '/uploads': { target: 'http://localhost:8089', changeOrigin: true },
  },
}
```

- 顶栏/党建侧栏导航：`/paleo/cms-channels/public/list`
- 通用页面渲染：`/paleo/cms-channels/public/resolve?routePath=...`
- 首页轮播/新闻：`/paleo/cms/public/list?moduleCode=...`
- 会员/会议业务仍使用前端 `localStorage`（尚未对接 V11 业务表）

生产部署可通过 `VITE_CMS_API_BASE` 指定 API 根路径（默认空字符串，走同源代理）。

## 与 PaleontologicalResearch 的差异

| 项 | 本后端 | 生产栈 |
|----|--------|--------|
| 框架 | 轻量 Spring Boot | RuoYi 全家桶 |
| 鉴权 | 简易 JWT | RuoYi JWT + 菜单权限 |
| 文件存储 | 本地 `${user.home}/paleo-cms/uploads` | 阿里云 OSS |
| 分会隔离 | 基础 role + branchId 判断 | PaleoAdminAssociationService |
| Channel/Block/Layout | **已实现** | 生产栈文档有、部分代码缺失 |
| 会员/会议业务 | **Phase 1 用户/会员 API 已实现**；会议/报名 API 待 Phase 2 | 完整业务模块 |

## 后续工作

1. **Phase 2**：会议 CRUD、报名、分会绑定 API（`/paleo/conferences`、`/paleo/registrations`、`/paleo/user-bindings`）
2. 改造 `paleontology-website-latest` / `paleontology-admin-latest` 的 `MembershipContext` / `AdminContext`，替换 localStorage
3. 可选：对接 PaleontologicalResearch 生产库做数据迁移
4. 生产环境：OSS 存储、Redis JWT 黑名单、JWT secret 轮换
