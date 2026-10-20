---
name: antigravity-notebooklm
description: 在 AntiGravity 連接 NotebookLM MCP。說「連接 NotebookLM」「設定 NotebookLM」時載入。
---

# 連接 NotebookLM（AntiGravity 版）

## 步驟

### 1. 安裝
```bash
uv tool install notebooklm-mcp-cli
nlm --version
```

### 2. 登入
請使用者在一般、可見的 PowerShell 視窗親自執行（不要在 AntiGravity 背景 terminal 反覆跑）：
```powershell
$env:PYTHONUTF8 = '1'
nlm config set auth.browser chrome
nlm login --profile default
```
（會開啟一個由 `nlm` 管理的獨立 Chrome 視窗，選正確的 Google 帳號完成登入；這是第三方 CLI 的 session 登入，不是 AntiGravity 的 MCP OAuth 按鈕）

### 3. 驗證
```bash
nlm doctor
nlm list
```
若 Windows 有 CP950 編碼錯誤：先執行 `$env:PYTHONUTF8 = '1'` 再重跑

### 4. 註冊 MCP
先預告會修改 AntiGravity MCP 設定並取得確認，再用 `nlm` 內建的 AntiGravity 設定指令：
```powershell
$env:PYTHONUTF8 = '1'
nlm setup add antigravity
```
設定會寫進 workspace `.agents/mcp_config.json` 或全域 `~/.gemini/config/mcp_config.json`。完成後重新啟動 AntiGravity 或用 `/mcp` 重新載入，再請它列出筆記本數量驗證。

- 已有 `command` 指向 `notebooklm-mcp` 的 server 就不要再執行，避免重複。
- 舊版 `"command": ["nlm", "mcp"]` 是 OpenCode `opencode.json` 的寫法，AntiGravity 2 不適用。

⚠️ 不要複製 cookie/token，不把筆記本清單 commit 到 repo。
