# Skills 与 Rules 配置

## 背景

搭建完项目骨架后，需要配置开发辅助工具提升质量和效率。

## 讨论过程

### Skills 选择

- review-bugbot：Cursor 官方代码审查工具，月均 200 万+ PR 审查，70%+ 问题在 merge 前解决
- review-security：同底层代理的安全审查维度，发现 SQL 注入、XSS、路径穿越等
- babysit：PR 自动看护（推到 GitHub 后启用）
- loop：循环执行 skill（后台跑测试）

### Rules 配置（4 条）

| Rule | 作用域 | 内容 |
|------|--------|------|
| agora-conventions.mdc | alwaysApply | 技术栈、架构、存储、鉴权约定 |
| go-standards.mdc | backend/**/*.go | Handler 模式、错误处理、SQLite 规范 |
| frontend-standards.mdc | frontend/**/*.{ts,tsx} | Tailwind 类名、API 调用、表单验证 |
| documentation-autolog.mdc | alwaysApply | 开发过程自动记录规范 |

## 决策

- MVP 阶段安装 review-bugbot 和 review-security
- 创建 4 条 Rules 固化项目约定
- babysit 和 loop 后续阶段启用

## 审查发现（首次运行）

- Bugbot：5 个问题（路由参数不匹配、Dockerfile 缺 go.sum、CreateProject 忽略输入、前端无表单校验、日志重复）
- Security：3 个问题（路径穿越、路由参数不匹配、错误信息泄露）
- 两个代理交叉验证了同一个路由参数 bug

## 日期

2026-08-01
