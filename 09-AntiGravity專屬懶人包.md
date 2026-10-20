# Anti-Gravity 懶人包 #09：服務連接與工作流程設定

> 版本：v1.5
> 更新日期：2026-09-04
> 語系偏好：繁體中文（Taiwan）

這份懶人包的目標，是讓 Anti-Gravity 使用者能安全連接 NotebookLM、Firebase、GitHub、Obsidian，並建立「開工 / 收工 / 新專案初始化」工作流程。本版本對齊 AntiGravity 2 寫法：規則入口用 `AGENTS.md`、技能放 `.agents/skills/`、NotebookLM MCP 用 `nlm setup add antigravity`；Obsidian 保留為專案筆記（AntiGravity 直接讀寫 vault），不安裝 MCPVault。

本文件只放可公開教學的設定流程，不放任何個人 NotebookLM 清單、筆記本 ID、研究報告、生成圖片、帳號 token 或測試專案。

---

## 先備條件

- [ ] 已安裝 AntiGravity 2（`agy`）或可使用 MCP 的 AI 編碼助理
- [ ] 已安裝 Git
- [ ] 已安裝 GitHub CLI（`gh`）
- [ ] 已安裝 Node.js / npm
- [ ] 已安裝 Python 或 `uv`
- [ ] 有 Google 帳號，可登入 NotebookLM / Firebase
- [ ] 有 GitHub 帳號
- [ ] 已有 Obsidian vault，或知道筆記本資料夾位置

Windows 快速檢查：

```powershell
git --version
gh --version
node --version
npm.cmd --version
python --version
```

---

## 一、連接 NotebookLM

### 重點原則

`notebooklm-mcp-cli` 是第三方工具，`nlm login` 會開啟一個由它管理的獨立瀏覽器視窗取得 session，不是標準 Google OAuth，也不要去按 AntiGravity 的 MCP OAuth 按鈕。不要複製 cookie、token，也不要把 NotebookLM 匯出的 `notebooks.json` 或筆記本 ID 清單放進公開 repo。

### 安裝 NotebookLM MCP CLI

建議優先用 `uv` 安裝：

```powershell
uv tool install notebooklm-mcp-cli
nlm --version
```

如果沒有 `uv`，再用 pip：

```powershell
pip install notebooklm-mcp-cli
nlm --version
```

### 重新登入 Google 帳號

請在一般、可見的 PowerShell 視窗親自執行（不要在 AntiGravity 背景 terminal 反覆跑）。若曾經登入錯帳號，先登出再重新登入：

```powershell
$env:PYTHONUTF8 = '1'
nlm logout
nlm config set auth.browser chrome
nlm login --profile default
```

`nlm login` 會開啟一個由 `nlm` 管理的獨立 Chrome 視窗，請在裡面選擇正確的 Google 帳號完成登入。

驗證：

```powershell
nlm doctor
nlm list
```

如果 Windows 顯示 CP950 / Unicode 編碼錯誤，可在同一個 PowerShell 視窗先設定：

```powershell
$env:PYTHONUTF8 = '1'
nlm doctor
```

### 註冊 MCP

AntiGravity 2 直接用 `nlm` 內建的設定指令，不要手寫 OpenCode 的 `opencode.json` 格式（舊版 `"command": ["nlm", "mcp"]` 已失效）。修改前先預告並取得確認：

```powershell
$env:PYTHONUTF8 = '1'
nlm setup add antigravity
```

設定會寫進 workspace `.agents/mcp_config.json` 或全域 `~/.gemini/config/mcp_config.json`。若已有 `command` 指向 `notebooklm-mcp` 的 server，就不要再執行，避免重複；`nlm doctor` 或 `nlm setup list` 顯示未設定時可能是誤報，請直接看設定檔。

完成後重啟 AntiGravity（或用 `/mcp` 重新載入），請它列出 NotebookLM 筆記本。只回報是否成功與數量，不要把完整清單 commit 到 repo。

---

## 二、連接 GitHub

### 登入 GitHub CLI

```powershell
gh auth status
gh auth login --web --git-protocol https
gh auth status
```

若登入流程卡住，請在可互動的 PowerShell 視窗完成瀏覽器授權，再回來驗證。

### 設定 Git 使用者

```powershell
git config --global user.name "你的名字"
git config --global user.email "your-email@example.com"
```

若不想公開個人信箱，可使用 GitHub no-reply email。

### 安全規則

- GitHub 與 GitHub Copilot 是不同服務；本流程只需要 GitHub 帳號、Git、GitHub CLI。
- 不把 GitHub token 寫進 Markdown、AGENTS、ANTIGRAVITY、Obsidian 對外筆記或 repo。
- commit 前先檢查 diff，不要無差別提交。

---

## 三、連接 Firebase

### 安裝與登入

Windows 建議使用 `npx.cmd`，避免 PowerShell 執行原則擋到 `.ps1`：

```powershell
npx.cmd -y firebase-tools@latest --version
npx.cmd -y firebase-tools@latest login
npx.cmd -y firebase-tools@latest projects:list
```

`firebase login` 需要互動式瀏覽器登入。如果在 AI 對話裡卡住，請手動開 PowerShell 執行登入，再回來讓 AI 驗證。

### 註冊 Firebase MCP

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

完成後重啟 AntiGravity（或用 `/mcp` 重新載入），測試列出 Firebase 專案與 Firestore 集合。

### 安全規則

- Firebase 前端 config 可公開，但 Admin SDK 憑證不可公開。
- `.firebaserc` 若含私人專案 ID，公開前請確認是否適合。
- 學生資料只存班級代號與座號，不存真名。

---

## 四、連接 Obsidian

### 找到 vault

請先確認 Obsidian vault 的實體路徑。常見位置：

```text
C:\Users\<你>\OneDrive\文件\Secondbrain
C:\Users\<你>\Documents\<vault 名稱>
<你的 vault 路徑>（雲端硬碟同步資料夾等）
```

確認條件：

- 資料夾存在
- 裡面有 `.obsidian`
- 是你平常真正使用的那個 vault

### 讓 AntiGravity 直接讀寫 vault（不需要 MCP）

AntiGravity 2 可以直接讀寫檔案，Obsidian vault 就是一般 Markdown 資料夾，不必安裝任何 MCP server：

- 把 vault 路徑與專案駕駛艙位置寫進專案 `AGENTS.md` 的「Obsidian 對應筆記」欄位（本機路徑不要 commit 到公開 repo）。
- 多個候選 vault 時先詢問使用者，不猜路徑；預設只讀入口與相關筆記，不廣泛掃描私人內容。

### 建立專案駕駛艙

在 vault 內建立 `<專案名稱>/專案工作流程.md`（或使用者指定的檔名），記錄目前進度、下一步、決策、踩坑。建立前先確認路徑與欄位。

驗證：先讀取 vault 根目錄，再建立一篇測試筆記，讀回確認後刪除。

> AntiGravity 1 舊寫法：v1.4 曾用 `npm.cmd install -g @bitbonsai/mcpvault` 安裝並註冊 Obsidian MCP。AntiGravity 2 不需要，本包自 v1.5 起不再安裝 MCPVault。

---

## 五、生圖

如果 Anti-Gravity 內建生圖工具，可直接用自然語言產生圖片，不需要把 OpenAI API key 寫進 repo。

建議提示格式：

```text
生成一張圖片：
用途：
尺寸比例：
主題：
畫面內容：
風格：
色彩：
文字：
限制：
輸出位置：
```

注意：

- 重要中文文字建議後製，生圖模型可能出字錯誤。
- 專案要引用的圖片請放在專案 `assets/` 或 Obsidian 附件資料夾。
- 不要把臨時生成圖全部 commit 到懶人包 repo。

---

## 六、開工 / 收工 / 新專案初始化

AntiGravity 2 使用專案根目錄的 `AGENTS.md` 作為 AI 工作規則入口（`ANTIGRAVITY.md` 只作為指向 `AGENTS.md` 的精簡入口；AntiGravity 1 舊寫法是把規則全放 `ANTIGRAVITY.md`）。`AGENTS.md` 應記錄固定規則、路徑、專案邊界與 Do / Don't；進度、踩坑、每日紀錄應放 Obsidian 專案駕駛艙，多 Agent 交接放 `handoff.md`。

### 開工

使用者說「開工」時，AI 應：

1. 讀取專案根目錄的 `AGENTS.md`（若有 `ANTIGRAVITY.md`、`handoff.md` 一併讀）。
2. 讀取 Obsidian 專案駕駛艙。
3. 執行 `git status` 與最近 commit 檢查。
4. 回報目前狀態與建議下一步。
5. 不自動 pull、commit 或 push。

### 收工

使用者說「收工」時，AI 應：

1. 檢查是否有敏感資料：API key、token、憑證、NotebookLM 匯出清單、學生真名。
2. 更新 Obsidian 專案駕駛艙：完成事項、下一步、踩坑。
3. 只有固定規則或路徑改變時才更新 `AGENTS.md`；進度交接寫 `handoff.md`。
4. 執行 `git status` 與 diff 檢查。
5. 只 stage 本次相關檔案，不使用無差別 `git add .`。
6. 產生 commit message，確認後 commit / push。
7. 回報 Obsidian、規則檔與 GitHub 同步結果。

### 新專案初始化

使用者說「新專案初始化」時，AI 應先問清楚：

- 專案名稱
- 用途
- 工作資料夾
- 是否建立 GitHub repo
- repo 公開或私有
- 是否需要 GitHub Pages / Firebase / 其他部署
- Obsidian vault 與專案駕駛艙位置

接著建立或補齊：

- `AGENTS.md`
- `ANTIGRAVITY.md`（精簡入口，指向 AGENTS.md）
- `README.md`
- `.gitignore`
- Git repo
- GitHub repo（使用者需要時）
- Obsidian 專案駕駛艙

如果資料夾已經是既有專案，先盤點「已存在 / 缺少」清單，只補缺口，不覆蓋既有設定。

---

## 建議的 AGENTS.md 範本

```markdown
# <專案名稱> - AGENTS.md

## 專案入口

專案名稱：
專案用途：
主要工作目錄：
GitHub repo：
預設 branch：

## Obsidian 對應筆記

Obsidian vault：
專案駕駛艙：

## 工作規則

- 回應使用繁體中文。
- 涉及檔案操作時回報完整產出位置。
- 使用 PowerShell 語法。
- 開工時讀本檔、讀 Obsidian 駕駛艙、檢查 Git 狀態。
- 收工時更新 Obsidian，必要時更新本檔，檢查 diff 後只提交相關檔案。
- 不把每日流水帳寫進本檔。

## 不要做

- 不要 commit API key、token、密碼、Firebase Admin 憑證。
- 不要 commit NotebookLM 個人匯出清單或筆記本 ID 清單。
- 不要自動納入無關 git 變更。
- 不要儲存學生真名；正式資料只用班級代號與座號。
```

搭配的精簡 `ANTIGRAVITY.md`：

```markdown
# ANTIGRAVITY.md

開工先讀 `AGENTS.md` 與 README，透過 `/skills` 選擇最小需要的技能。

所有外部服務先做唯讀或 dry-run；登入、安裝、寫入、公開與刪除前先取得使用者確認。
```

---

## 完成回報格式

```markdown
## Anti-Gravity 懶人包設定完成

- NotebookLM：已登入 / 待 OAuth / 失敗
- GitHub：已登入 / 待登入 / 失敗
- Firebase：已登入 / 待登入 / 未使用
- Obsidian：已連接 / 待設定 / 失敗
- 規則檔：AGENTS.md 已建立 / 已更新 / 未建立
- Git 狀態：乾淨 / 有未提交變更
- 下一步：
```

---

## 常見問題

| 問題 | 解法 |
|---|---|
| NotebookLM 登入到錯帳號 | `nlm logout` 後在可見的 PowerShell 重新 `nlm login --profile default`，在瀏覽器選正確帳號 |
| `nlm doctor` 顯示未認證 | 重跑一次 `nlm login --profile default`，不要手動貼 cookie；第二次仍失敗就停止並回報 |
| `nlm doctor` 顯示 MCP 未設定 | 可能是誤報，直接看 `.agents/mcp_config.json` 或 `~/.gemini/config/mcp_config.json` 是否已有 `notebooklm-mcp` |
| Windows 顯示編碼錯誤 | 設定 `$env:PYTHONUTF8 = '1'` 後重試 |
| GitHub CLI 未登入 | `gh auth login --web --git-protocol https` |
| Firebase login 卡住 | 在互動式 PowerShell 手動跑 `npx.cmd -y firebase-tools@latest login` |
| PowerShell 擋 `npm.ps1` / `npx.ps1` | 改用 `npm.cmd` / `npx.cmd` |
| Obsidian 找不到 vault | 搜尋含 `.obsidian` 的資料夾，請使用者確認真正使用的 vault |
| Obsidian 需要裝 MCP 嗎 | 不需要，AntiGravity 2 直接讀寫 vault 內的 Markdown 檔 |
| 收工會納入太多檔案 | 先看 `git status` 與 diff，只 stage 本次相關檔案 |

---

## 更新紀錄

| 日期 | 版本 | 更新內容 |
|---|---|---|
| 2026-09-04 | v1.5 | 對齊 AntiGravity 2：NotebookLM MCP 改用 `nlm setup add antigravity`、規則入口改 `AGENTS.md`、技能路徑改 `.agents/skills/`、Firebase MCP 改 `mcp_config.json` 格式；Obsidian 回到直接讀寫 vault，不再安裝 MCPVault（統一 README 與本文說法） |
| 2026-05-31 | v1.4 | 重新加回 Obsidian MCPVault 設定與開工/收工自動化流程，並加入獨立 Skill 目錄 |
| 2026-05-24 | v1.2 | 移除 Obsidian MCPVault 安裝與 MCP 註冊，保留 Obsidian 作為人工專案筆記工作流 |
| 2026-05-23 | v1.1 | 移除 NotebookLM 個人資料與成果檔定位，改正 NotebookLM OAuth、Obsidian MCP、Git 收工安全流程 |
| 2026-05-22 | v1.0 | 初版 |
