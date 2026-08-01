# Agora — Personal Dev Hub

自用项目管理中枢，统一管理所有 GitHub 仓库的代码、文档、依赖和开发工具链。

**技术栈**: Go + chi + SQLite / React + Vite + Tailwind / Docker Compose

## 启动

```bash
# 后端
cd backend && go run ./cmd/server

# 前端
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

## 协议

被管理项目通过 `.agora.yaml` 声明配置，详见 [Agora Protocol](specs/agora-protocol.md)。
