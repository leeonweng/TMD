---
name: antigravity-firebase
description: 在 AntiGravity 連接 Firebase MCP。說「連接 Firebase」「設定 Firebase」時載入。
---

# 連接 Firebase（AntiGravity 版）

## 步驟

### 1. 安裝與登入
```bash
npx.cmd -y firebase-tools@latest --version
npx.cmd -y firebase-tools@latest login
npx.cmd -y firebase-tools@latest projects:list
```

### 2. 註冊 MCP
寫進 AntiGravity 2 的 MCP 設定檔（workspace `.agents/mcp_config.json` 或全域 `~/.gemini/config/mcp_config.json`），修改前先取得確認：
```json
{
  "mcpServers": {
    "firebase": {
      "command": "npx.cmd",
      "args": ["-y", "firebase-tools@latest", "mcp"]
    }
  }
}
```
完成後重啟 AntiGravity 或用 `/mcp` 重新載入。

### 3. 安全規則
- Admin SDK 憑證不可公開
- 學生資料只存班級代號與座號
