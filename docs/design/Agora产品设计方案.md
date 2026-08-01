# Agora 产品设计方案

> 本文档是 Agora 项目的**主设计依据**，整合产品定位、架构、数据模型、协议与迭代路线。  
> 细分决策见同目录下其他设计文档；协议细节见 `specs/agora-protocol.md`。

**版本**: v0.2  
**日期**: 2026-08-01  
**状态**: Tier 0 进行中

---

## 1. 产品定位

### 1.1 是什么

**Agora** 是一个自用的 **Personal Dev Hub（个人开发中枢）**，通过 Web 界面统一管理多个软件项目相关的：

- GitHub 仓库与 Release
- 开发文档（设计、笔记、变更、总结）
- Cursor Skills / Rules 等开发工具链
- （规划中）第三方依赖、开发上下文

### 1.2 不是什么

- **不是** 文档编辑器或 Wiki 系统 —— 文档在各项目仓库内维护
- **不是** 代码托管平台 —— 代码仍在 GitHub
- **不是** 多用户 SaaS —— 面向个人/小团队自用

### 1.3 核心价值

| 痛点 | Agora 的解法 |
|------|-------------|
| 项目分散，记不住每个仓库的状态 | 统一 Dashboard + 项目详情页 |
| 文档散落在各仓库，难以检索 | `.agora.yaml` 声明 + DB 索引 |
| Release / Skill 信息需要手动翻 GitHub | 聚合展示，一键跳转 |
| 换电脑后开发上下文丢失 | （Tier 2）开发上下文恢复 |

---

## 2. 核心设计原则

### 2.1 索引，不存储

```
各项目仓库                    Agora
┌─────────────────┐          ┌──────────────────┐
│ docs/design/    │          │ agora-db/        │
│ docs/dev_note/  │ ──扫描──▶│  projects        │
│ .agora.yaml     │          │  documents (索引) │
│ package-lock... │          │  skills          │
└─────────────────┘          └──────────────────┘
```

- **文档内容**存在于各项目自己的目录（如 `docs/`），随 Git 管理
- **Agora 只存元数据索引**：路径、标题、类型、标签、关联关系
- 读取文档内容时，Agora 根据索引中的 `file_path` 读文件（只读）

### 2.2 声明式协议

每个被管理项目在仓库根目录放置 `.agora.yaml`，主动声明：

- 项目类型、描述
- 文档目录映射
- 使用的 Skills
- 依赖生态（lock 文件）

Agora **导入/同步**时解析协议，写入索引，不依赖轮询猜测。

### 2.3 渐进增强

按 Tier 分阶段交付，Tier 0 先跑通核心闭环，后续迭代叠加能力。

---

## 3. 系统架构

### 3.1 技术栈

| 层 | 选型 | 说明 |
|----|------|------|
| 后端 | Go 1.23 + chi | 单二进制，Docker 友好 |
| 数据库 | SQLite | MVP 零配置，路径 `agora-db/agora.db` |
| GitHub | go-github v68 | Release、仓库信息 |
| 前端 | React 18 + TypeScript + Vite | |
| 样式 | Tailwind CSS v3（深色主题） | agora-* 组件类 |
| 状态 | React Query v5 | 服务端状态缓存 |
| 部署 | Docker Compose | Nginx + Go + 前端静态 |

### 3.2 目录结构

```
Goodsx/                        # Agora 自身仓库
├── docs/                        # Agora 项目文档（源码的一部分）
│   ├── design/                  # 设计决策
│   ├── dev_note/                # 开发笔记
│   ├── changelog/               # 变更记录（规划）
│   └── summary/                 # 阶段总结（规划）
├── specs/
│   └── agora-protocol.md        # .agora.yaml 协议规范
├── agora-db/
│   └── agora.db                 # SQLite 运行时数据（gitignore）
├── backend/
│   ├── cmd/server/              # HTTP 服务入口
│   └── internal/
│       ├── config/              # 环境变量
│       ├── database/            # DB 初始化
│       ├── handler/             # REST API
│       ├── middleware/          # 鉴权
│       ├── model/               # 数据模型
│       ├── protocol/            # .agora.yaml 解析
│       └── service/             # GitHub 等外部服务
├── frontend/
│   └── src/
│       ├── layouts/             # 主布局（侧边栏）
│       ├── pages/               # 页面（按路由）
│       └── lib/api.ts           # API 客户端
├── .cursor/rules/               # Cursor 持久规则
└── docker-compose.yml
```

### 3.3 部署拓扑

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Nginx   │────▶│ Frontend │     │ Backend  │
│  :3000   │     │  (静态)   │     │  :8080   │
│          │────▶│          │     │          │
└──────────┘     └──────────┘     └────┬─────┘
                                       │
                                  agora-db/
                                  (volume)
```

环境变量：

| 变量 | 默认 | 说明 |
|------|------|------|
| `AGORA_PORT` | 8080 | 后端端口 |
| `AGORA_DB_DIR` | `../agora-db` | SQLite 目录 |
| `AGORA_AUTH_TOKEN` | 空 | 空则跳过鉴权 |
| `GITHUB_TOKEN` | 空 | GitHub API（Release 等） |

---

## 4. 数据模型

### 4.1 实体关系

```
projects 1──N documents
projects N──M skills (via project_skills)
projects 1──N dependencies (Tier 1)
projects 1──1 dev_context (Tier 2)
```

### 4.2 核心表

**projects**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | |
| name | TEXT | 项目名 |
| description | TEXT | 描述 |
| github_owner | TEXT | GitHub 用户名/组织 |
| github_repo | TEXT | 仓库名 |
| status | TEXT | active / archived / paused |
| tags | TEXT | JSON 数组 |

**documents**（索引表，不存内容）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | |
| project_id | INTEGER FK | |
| type | TEXT | dev_note / design / changelog / summary |
| title | TEXT | 文档标题 |
| file_path | TEXT | 绝对或相对路径，指向项目仓库内文件 |
| tags | TEXT | JSON 数组 |

**skills**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | |
| name | TEXT UNIQUE | Skill 名称 |
| description | TEXT | |
| category | TEXT | 分类 |
| config_template | TEXT | 配置模板 |

**project_skills**

| 字段 | 类型 | 说明 |
|------|------|------|
| project_id | INTEGER FK | |
| skill_id | INTEGER FK | |
| usage_notes | TEXT | 使用说明 |

---

## 5. `.agora.yaml` 协议

详见 `specs/agora-protocol.md`。核心结构：

```yaml
name: my-project
description: "项目描述"
type: web-app                    # web-app | cli-tool | library | service

dependencies:
  ecosystems: [npm, go]
  lock_files: [package-lock.json, go.sum]

skills:
  - review-bugbot
  - review-security

documents:
  dev-notes: docs/dev_note/
  changelogs: docs/changelog/
  summaries: docs/summary/
  design: docs/design/

custom: {}                       # 预留扩展
```

### 同步工作流

1. 项目仓库根目录创建 `.agora.yaml`
2. 在 Agora 中 **导入 GitHub 仓库** 或 **手动注册项目**
3. Agora 解析 `.agora.yaml`：
   - 更新项目元信息
   - 扫描 `documents.*` 目录下的 `.md` 文件
   - 为每个文件创建/更新 `documents` 索引记录（title 取自文件名或 frontmatter）
4. 用户在 Web 面板查看、筛选、跳转原文

> **当前实现状态**：协议解析器已有骨架（`internal/protocol/`），自动扫描同步尚未完整实现（Tier 0 待完成）。

---

## 6. API 设计

所有路由前缀 `/api`，统一 JSON 响应。

### 6.1 项目

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/projects` | 列表 |
| POST | `/projects` | 创建 |
| POST | `/projects/import` | 从 GitHub 导入 |
| GET | `/projects/{id}` | 详情 |
| PUT | `/projects/{id}` | 更新 |
| DELETE | `/projects/{id}` | 删除 |

### 6.2 文档（纯索引）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/projects/{id}/documents` | 列表（支持 `?type=`） |
| POST | `/projects/{id}/documents` | 创建索引（需 `file_path`，不写文件） |
| GET | `/projects/{id}/documents/{docID}` | 元数据 |
| GET | `/projects/{id}/documents/{docID}/content` | 读取文件内容（只读） |
| PUT | `/projects/{id}/documents/{docID}` | 更新元数据 |
| DELETE | `/projects/{id}/documents/{docID}` | 删除索引（不删文件） |

### 6.3 Release / Skills

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/projects/{id}/releases` | GitHub Release 列表 |
| GET | `/skills` | 全局 Skill 注册表 |
| POST | `/skills` | 注册 Skill |
| GET | `/projects/{id}/skills` | 项目关联的 Skills |
| POST | `/projects/{id}/skills` | 关联 Skill |

### 6.4 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | `{ "status": "healthy" }` |

---

## 7. 前端页面设计

### 7.1 路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | Dashboard | 概览：项目数、健康状态、最近项目 |
| `/projects` | Projects | 项目列表、创建、GitHub 导入 |
| `/projects/:id` | ProjectDetail | 项目详情（见下） |
| `/projects/:id/docs` | Documents | 按类型浏览文档 |
| `/skills` | Skills | 全局 Skill 注册表 |

### 7.2 项目详情页（ProjectDetail）

从上到下五个区域，无数据时显示空状态提示：

| 区域 | 内容 | 数据来源 |
|------|------|---------|
| 描述 | 项目名称、描述、状态、标签 | `projects` 表 |
| 仓库 | GitHub 链接（有则显示） | `github_owner/repo` |
| Releases | 最近版本、变更说明 | GitHub API |
| 文档 | 按 type 分组列表 | `documents` 索引 |
| Skills | 关联的 Skill 列表 | `project_skills` + `skills` |

### 7.3 设计系统

- 深色主题（`surface-*` 灰度 + `agora-*` 蓝紫主色）
- 组件类前缀 `agora-*`（btn、card、input、badge）
- 动画：`animate-fade-in`、`animate-slide-up`
- 图标：Lucide React

---

## 8. 鉴权

MVP 阶段使用轻量 Token 认证，不做用户登录系统。

- `AGORA_AUTH_TOKEN` 为空 → 跳过鉴权（本地开发）
- 有值 → 所有 API 需 `Authorization: Bearer <token>`
- 前端 token 存 `localStorage.agora_token`
- 升级 GitHub OAuth 时只改 middleware + 登录页

---

## 9. 功能分层与迭代路线

### Tier 0 — MVP（当前阶段）

| 功能 | 状态 |
|------|------|
| 项目 CRUD + GitHub 导入 | ✅ 已完成 |
| 项目详情页（五区域布局） | ✅ 已完成 |
| 文档索引 CRUD（纯元数据） | ✅ 已完成 |
| 文档内容只读 | ✅ 已完成 |
| Skill 注册表 + 项目关联 | ✅ 已完成 |
| Release 列表（GitHub API） | ✅ 已完成 |
| Docker Compose 部署 | ✅ 已完成 |
| 可选 Token 鉴权 | ✅ 已完成 |
| `.agora.yaml` 自动扫描同步 | ⬜ 待实现 |
| Agora 自身 `.agora.yaml` + 文档索引 | ⬜ 待实现 |

### Tier 1 — Quick Wins

- 依赖自动扫描（读 lock 文件写入 `dependencies` 表）
- 全文搜索（跨项目文档 + Skill）
- 标签/分类筛选增强

### Tier 2 — IDE 集成

- Cursor 深度链接（从 Agora 一键打开项目/文档）
- 开发上下文恢复（`dev_context` 表）
- Release 资产下载

### Tier 3 — 未来规划

- CLI 工具（`agora sync`、`agora push-context`）
- CI/CD 可视化
- 开发时间线
- Plugin 系统

---

## 10. Agora 自身作为第一个被管理项目

Agora 仓库本身就是第一个测试用例：

```
Goodsx/
├── .agora.yaml          # 待创建：声明 docs/ 目录映射
├── docs/
│   ├── design/          # 5 篇设计文档（含本文）
│   └── dev_note/        # 4 篇开发笔记
└── agora-db/            # 运行时索引（documents 表指向 docs/ 下文件）
```

**验证清单**（Tier 0 收尾）：

- [ ] 创建 `Goodsx/.agora.yaml`
- [ ] 实现协议扫描：解析 yaml → 索引 `docs/` 下所有 md
- [ ] Web 面板：Agora 项目详情页正确展示 9 篇文档
- [ ] 点击文档可读取并展示内容
- [ ] Dashboard 统计文档数（当前为占位 `—`）

---

## 11. 相关文档索引

| 文档 | 路径 | 说明 |
|------|------|------|
| **本文** | `docs/design/Agora产品设计方案.md` | 主设计依据 |
| 产品定位与功能分层 | `docs/design/产品定位与功能分层.md` | Tier 划分原始决策 |
| 技术选型决策 | `docs/design/技术选型决策.md` | 技术栈选型理由 |
| 文档存储策略 | `docs/design/文档存储策略.md` | ⚠️ 已过时，见本文 §2.1 |
| Agora 协议设计 | `docs/design/Agora协议设计.md` | 协议设计决策 |
| 鉴权方案设计 | `docs/design/鉴权方案设计.md` | Token 鉴权方案 |
| 协议规范 | `specs/agora-protocol.md` | `.agora.yaml` 完整格式 |
| 项目约定 | `.cursor/rules/agora-conventions.mdc` | 代码规范 |

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-08-01 | 初版：整合分散设计文档，确立「索引不存储」架构 |
| 2026-08-01 | v0.2：反映 docs/ + agora-db/ 目录结构，移除 agora-data |
