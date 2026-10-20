---
name: antigravity-obsidian
description: 在 AntiGravity 連接 Obsidian 專案筆記（直接讀寫 vault，不裝 MCP）。說「連接 Obsidian」「設定 Obsidian」時載入。
---

# 連接 Obsidian（AntiGravity 版）

## 步驟

### 1. 找到 vault
請先確認 Obsidian vault 的實體路徑。常見位置：
- `C:\Users\<你>\OneDrive\文件\Secondbrain`
- `C:\Users\<你>\Documents\<vault 名稱>`
- `<你的 vault 路徑>`（雲端硬碟同步資料夾等）

### 2. 讓 AntiGravity 直接讀寫 vault（不需要 MCP）
AntiGravity 2 可以直接讀寫檔案，Obsidian vault 就是一般 Markdown 資料夾，不必安裝任何 MCP server。做法：
- 把 vault 路徑寫進專案 `AGENTS.md` 的「Obsidian 對應筆記」欄位（本機路徑不要 commit 到公開 repo）。
- 多個候選 vault 時先詢問使用者，不猜路徑；預設只讀入口與相關筆記，不廣泛掃描私人內容。

### 3. 建立專案駕駛艙
在 vault 內建立 `<專案名稱>/專案工作流程.md`（或使用者指定的檔名），記錄：目前進度、下一步、決策、踩坑。建立前先確認路徑與欄位。

### 4. 驗證
先讀取 vault 根目錄，再建立一篇測試筆記並讀回確認，最後刪除測試筆記。

> AntiGravity 1 舊寫法：曾用 `npm.cmd install -g @bitbonsai/mcpvault` 安裝並註冊 Obsidian MCP。AntiGravity 2 不需要，本包不再安裝 MCPVault。

⚠️ 安全提醒：請勿將你的實體 vault 路徑或任何敏感筆記內容 commit 到公開儲存庫中。
