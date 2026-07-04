# paleontology-cms-backend

中国古生物学会 **轻量 CMS 后端**，API 契约与 `PaleontologicalResearch` 生产栈对齐，供 `paleontology-admin-latest` 与 `paleontology-website-latest` 对接。

## 技术栈

| 组件 | 版本 |
|------|------|
| Java | 8 |
| Spring Boot | 2.5.15 |
| MyBatis-Plus | 3.4.3 |
| MySQL | 5.7+ |
| Redis | 可选（JWT 黑名单） |
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
  redis:
    host: localhost   # 无 Redis 时可注释掉 redis 并见下方说明
```

### 3. 启动

```bash
cd paleontology-cms-backend
mvn spring-boot:run
```

- 服务地址：`http://localhost:8089`
- API 文档：`http://localhost:8089/doc.html`
- 默认账号：`admin` / `admin123`
- 上传文件目录：`%USERPROFILE%\paleo-cms\uploads`（Windows）或 `~/paleo-cms/uploads`（Linux/macOS），可通过 `cms.upload.base-dir` 修改

### IntelliJ IDEA 编译提示「源发行版 17 需要目标发行版 17」

本仓库 **字节码目标为 Java 8**，本地可使用 **JDK 17** 编译运行。若 IDE 报错，请：

1. **Maven 重新加载**：右键 `pom.xml` → Maven → Reload Project  
2. **Project Structure**（`Ctrl+Alt+Shift+S`）  
   - **Project SDK**：JDK 17（或已安装的 JDK 8+）  
   - **Project language level**：8  
3. **Settings → Build → Compiler → Java Compiler**  
   - **Project bytecode version**：8  
   - **Per-module bytecode version**：`paleontology-cms-backend` 设为 8  
4. **Build → Rebuild Project**

命令行验证：`mvn clean compile` 应无报错。

## API 概览（与生产栈兼容）

### CMS 内容条目 `/paleo/cms`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/paleo/cms/list` | JWT | 管理端分页列表 |
| GET | `/paleo/cms/{entryId}` | JWT | 管理端详情 |
| GET | `/paleo/cms/public/list` | 匿名 | 公开列表 |
| GET | `/paleo/cms/public/{entryId}` | 匿名 | 公开详情 |
| POST | `/paleo/cms` | JWT | 新增 |
| PUT | `/paleo/cms` | JWT | 修改 |
| POST | `/paleo/cms/media/upload` | JWT | 媒体上传（本地存储） |
| POST | `/paleo/cms/{entryId}/status` | JWT | 发布/下架 |
| POST | `/paleo/cms/{entryId}/delete` | JWT | 逻辑删除 |

### CMS 栏目编排 `/paleo/cms-channels`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/paleo/cms-channels/list` | JWT | 栏目列表 |
| GET | `/paleo/cms-channels/public/list` | 匿名 | 公开导航树 |
| GET | `/paleo/cms-channels/public/detail` | 匿名 | 按 routePath/channelCode 取栏目+区块 |
| POST/PUT | `/paleo/cms-channels` | JWT | 新增/修改栏目 |
| GET/POST | `/paleo/cms-channels/{channelId}/blocks` | JWT | 区块维护 |

### 认证

```http
POST /login
Content-Type: application/json

{"username":"admin","password":"admin123"}
```

响应 `data.token` 放入后续请求头：

```http
Authorization: Bearer <token>
```

## 前端对接

### paleontology-admin-latest

在 `vite.config.ts` 增加代理：

```ts
server: {
  port: 3001,
  proxy: {
    '/paleo': { target: 'http://localhost:8089', changeOrigin: true },
    '/login': { target: 'http://localhost:8089', changeOrigin: true },
    '/uploads': { target: 'http://localhost:8089', changeOrigin: true },
  },
}
```

将 `cms-data.ts` 的 `loadCmsDatabase` / `saveCmsDatabase` 改为调用 `/paleo/cms` REST API（下一步改造）。

### paleontology-website-latest

```ts
server: {
  port: 3000,
  proxy: {
    '/paleo': { target: 'http://localhost:8089', changeOrigin: true },
    '/uploads': { target: 'http://localhost:8089', changeOrigin: true },
  },
}
```

各页面从 `/paleo/cms/public/list?moduleCode=news` 读取内容；导航从 `/paleo/cms-channels/public/list` 读取。

## 响应格式

与 RuoYi / PaleontologicalResearch 一致：

```json
{ "code": 200, "msg": "操作成功", "data": ... }
```

分页列表：

```json
{ "code": 200, "msg": "查询成功", "rows": [...], "total": 100 }
```

## 模块编码（moduleCode）

与 latest 管理端 CMS 17 个子模块一致：

`banners` · `news` · `pages` · `personnel` · `awards` · `announcements` · `timeline` · `gallery` · `international` · `downloads` · `regulations` · `science` · `tech-rewards` · `party` · `branch` · `media` · `settings` · `publish` · `public-files`

## 与 PaleontologicalResearch 的差异

| 项 | 本后端 | 生产栈 |
|----|--------|--------|
| 框架 | 轻量 Spring Boot | RuoYi 全家桶 |
| 鉴权 | 简易 JWT | RuoYi JWT + 菜单权限 |
| 文件存储 | 本地 `./uploads` | 阿里云 OSS |
| 分会隔离 | 基础 role 判断 | PaleoAdminAssociationService |
| Channel/Block | **已实现** | 文档有、代码缺失 |

## 下一步

1. 改造 `paleontology-admin-latest` CMS 层对接 API
2. 改造 `paleontology-website-latest` 各页面读 CMS
3. 可选：对接 PaleontologicalResearch 生产库做数据迁移
