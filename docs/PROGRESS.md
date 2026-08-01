# Agora Progress & TODOs

> 当前阶段：Tier 0 MVP 收尾

## Done ✅

- [x] 项目 CRUD + GitHub 导入
- [x] 项目详情页（6 区域布局：描述、进度、仓库、Releases、文档、Skills）
- [x] 文档索引 CRUD（纯元数据）
- [x] 文档内容只读预览（modal）
- [x] Skill 注册表 + 项目关联
- [x] Release 列表（GitHub API）
- [x] Docker Compose 部署
- [x] 可选 Token 鉴权
- [x] 项目 Progress/TODOs 字段（行内编辑）
- [x] 一键启动脚本（start.ps1）
- [x] 项目命名为 Agora，清理旧名 Goodsx

## In Progress 🔧

- [ ] `.agora.yaml` 协议自动扫描同步
- [ ] Agora 自身项目文档索引（docs/ 下 Markdown 索引入库）
- [ ] Web 面板：Agora 项目详情页正确展示 docs/ 下的文档
- [ ] Dashboard 统计值改为真实数据（当前文档数和 Skill 数为占位 `—`）

## Up Next 📋

### Tier 1 — Quick Wins
- [ ] 依赖自动扫描（读 lock 文件写入 dependencies 表）
- [ ] 全文搜索（跨项目文档 + Skill）
- [ ] 标签/分类筛选增强

### Tier 2 — IDE 集成
- [ ] Cursor 深度链接
- [ ] 开发上下文恢复（dev_contexts 表已有，前后端未打通）
- [ ] Release 资产下载

## Notes

- DB 迁移使用 `ALTER TABLE ADD COLUMN` 追加字段，首次运行时自动执行
- 前端通过 Vite proxy 代理 `/api` 到 `localhost:8080`
- GOROOT 环境变量在部分机器上指向不存在的路径，start.ps1 已做自动修正
