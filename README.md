# TMD - 科技與自主學習整合教案設計

本專案為 TMD 課程教學活動設計與教案公開展示平台，透過結構化 Markdown 與響應式靜態網頁，提供師生公開存取、瀏覽與列印教案之完整解決方案。

## 🌐 公開存取與專案連結

- **線上公開教案網頁**：[https://leeonweng.github.io/TMD/](https://leeonweng.github.io/TMD/)
- **GitHub 專案儲存庫**：[https://github.com/leeonweng/TMD](https://github.com/leeonweng/TMD)

## 📁 專案架構

```text
├── index.html                  # 教案公開靜態網頁（支援 RWD、深淺主題、A4 列印）
├── content/
│   └── lesson.md               # 教案核心內容 Markdown（十二年國教 108 課綱格式）
├── .github/
│   └── workflows/
│       └── deploy-pages.yml    # GitHub Actions 自動部署至 GitHub Pages
├── .agents/
│   └── skills/                 # AntiGravity 2 技能目錄 (00 ~ 06)
├── AGENTS.md                   # AI 協作規則與環境規範
├── ANTIGRAVITY.md              # 快速指引入口
└── README.md                   # 專案說明文件
```

## ✨ 功能特色

- **108 課綱標準格式**：完整涵蓋核心素養（A2、B2、C2）、學習表現、學習內容、教學歷程（引起動機、發展活動、綜合活動）及評量規準（Rubrics）。
- **列印友善設計**：內建 `@media print` 樣式，點擊「列印 / 匯出 PDF」即可自動轉化為標準黑白教案格式。
- **深淺模式切換**：自適應系統或手動切換深色/淺色主題。
- **自動部署**：透過 GitHub Actions，每次更新 `main` 分支內容即可自動同步至公開網頁。

## 協作與進度追蹤
- AI Agent 工作規則請參見 [AGENTS.md](file:///Users/liweiweng/Documents/AntiGravity/TMD/AGENTS.md)。
- 專案工作進度與踩坑記錄同步於 Obsidian 駕駛艙：`TMD/專案工作流程.md`。
