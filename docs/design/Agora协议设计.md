# Agora 协议设计

## 背景

被管理项目需要一种方式让 Agora 发现其配置，类似 MCP 协议的概念。

## 讨论过程

- Q: Agora 如何发现项目配置？轮询扫描 vs 声明式文件？
- A: 声明式更优：项目主动声明自己的状态，不依赖 Agora 轮询。
- Q: 文件放哪？叫什么？
- A: .agora.yaml，放在项目仓库根目录。

## 决策

### .agora.yaml 格式

    name: my-project
    description: "项目描述"
    type: web-app

    dependencies:
      ecosystems: [npm, go]
      lock_files: [package-lock.json]

    skills:
      - react-component-generator
      - security-auditor

    documents:
      dev-notes: docs/dev/
      changelogs: docs/changelog/
      summaries: docs/summary/
      design: docs/design/

    custom: {}

### 设计原则

- 声明式：项目声明自己的状态，不依赖 Agora 轮询
- 可选字段：所有字段可选，Agora 优雅降级
- 向后兼容：新增字段不影响旧版本
- 可扩展：custom 字段预留给未来

### 工作流

1. 项目创建 .agora.yaml
2. Agora 导入 GitHub 仓库
3. 自动解析依赖、关联 Skill、索引文档
4. 用户在面板中补充额外信息

## 日期

2026-08-01
