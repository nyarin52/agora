# Agora Project Protocol

`.agora.yaml` 是 Agora 管理项目的**声明式协议文件**。放置在项目仓库根目录，Agora 导入项目时自动解析。

## 完整格式

```yaml
# 项目元信息
name: my-project              # 项目名称
description: "项目描述"        # 简要描述
type: web-app                 # web-app | cli-tool | library | service
repository: https://github.com/owner/repo  # 可选，GitHub 仓库地址或 owner/repo

# 依赖声明
dependencies:
  ecosystems:                 # 依赖生态 (Agora 自动扫描对应 lock 文件)
    - npm
    - pip
    - cargo
    - go
  lock_files:                 # 显式指定 lock 文件路径
    - package-lock.json
    - yarn.lock

# Skills 声明
skills:                       # 本项目使用的 Cursor Skills
  - react-component-generator
  - api-testing
  - security-auditor
  - review-bugbot

# 文档目录声明
documents:
  dev-notes: docs/dev/        # 开发笔记目录
  changelogs: docs/changelog/ # 变更记录目录
  summaries: docs/summary/    # 总结文档目录
  design: docs/design/        # 设计文档目录

# 自定义扩展 (预留)
custom:
  cursor_workspace: .cursor/
  lint_config: .eslintrc.js
```

## 最小示例

```yaml
name: agora
type: web-app
dependencies:
  ecosystems: [npm]
skills:
  - react-component-generator
documents:
  dev-notes: docs/dev/
  changelogs: docs/changelog/
```

## 工作流

1. 在项目中创建 `.agora.yaml`
2. 在 Agora 面板中导入该 GitHub 仓库
3. Agora 读取 `.agora.yaml`，自动：
   - 解析 `repository` 并缓存 GitHub 仓库信息
   - 通过 GitHub API 展示 Release（只读）
   - 解析依赖列表（从 `lock_files` 或 `ecosystems` 推断）
   - 关联已注册的 Skills
   - 索引文档目录中的 Markdown 文件
4. 用户在 Agora 面板中补充额外信息

## 设计原则

- **声明式**：项目声明自己的状态，不依赖 Agora 轮询
- **可选字段**：所有字段都是可选的，Agora 会优雅降级
- **向后兼容**：新增字段不影响旧版本 Agora 解析
- **可扩展**：`custom` 字段预留给未来扩展
