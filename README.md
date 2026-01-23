# YoyoFlow

**YoyoFlow** 是一个基于 Tauri v2 构建的现代化桌面生产力工具，旨在通过 AI 模型提升工作流效率。目前核心功能包括智能翻译和 AI 服务管理，支持全局快捷键快速唤醒。

## ✨ 功能特性

- **🧠 本地 AI 驱动**：无缝集成 Ollama，利用本地 LLM 进行数据处理，保护隐私且无需联网。
- **🌐 智能翻译**：
    - 支持自动语言检测。
    - 多语言互译（中文、英语、日语、韩语、法语、德语、西班牙语、俄语）。
    - 支持多模型并行翻译，对比不同模型的翻译结果。
- **⚡️ 高效快捷键**：
    - 支持自定义全局快捷键（默认 `Command/Ctrl + Shift + U`）。
    - 即使应用最小化或在后台，也能一键唤醒主窗口并聚焦输入。
- **🔌 服务管理**：
    - 可视化管理 AI 服务提供商。
    - 动态切换和配置不同的 AI 模型。
- **🎨 现代化 UI**：
    - 基于 Shadcn UI 和 Tailwind CSS 构建，提供简洁美观的用户体验。
    - 响应式布局与流畅的交互动画。

## 🛠️ 技术栈

- **Core**: [Tauri v2](https://v2.tauri.app/) (Rust + WebView)
- **Frontend**: [React 19](https://react.dev/), TypeScript, [Vite](https://vitejs.dev/)
- **UI Framework**: [Tailwind CSS](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Data Persistence**: `tauri-plugin-store` (本地 JSON 存储)
- **System Integration**:
  - `tauri-plugin-global-shortcut` (全局快捷键)
  - `tauri-plugin-opener` (系统调用)

## 🚀 快速开始

### 前置要求

- [Node.js](https://nodejs.org/) (推荐 v18+)
- [Rust](https://www.rust-lang.org/) (最新稳定版)

### 安装依赖

```bash
pnpm install
```

### 开发模式

启动前端开发服务器和 Tauri 核心：

```bash
pnpm tauri dev
```

### 构建应用

打包生成对应平台的安装包（macOS/Windows/Linux）：

```bash
pnpm tauri build
```

## ⚙️ 使用说明

### 1. 配置 AI 服务
启动应用后，进入 **“服务”** 页面：
- 从下拉列表中选择你想使用的模型并配置 API Key。

### 2. 设置快捷键
进入 **“快捷键”** 页面：
- 点击输入框开始录制。
- 按下你习惯的组合键（如 `Alt + Space` 或 `Option + T`）。
- 设置完成后，在任何界面按下该快捷键即可快速呼出 YoyoFlow。

### 3. 使用翻译
进入 **“翻译”** 页面：
- 输入或粘贴需要翻译的文本。
- 选择目标语言（默认为中文）。
- 翻译请求将发送给你配置的所有启用模型，方便对比结果。

## 📂 项目结构

```
yoyoflow/
├── src-tauri/          # Rust 后端代码
│   ├── src/            # Rust 源码 (lib.rs, main.rs)
│   ├── capabilities/   # Tauri 权限配置
│   └── Cargo.toml      # Rust 依赖管理
├── src/                # 前端代码
│   ├── components/     # UI 组件 (shadcn/ui 等)
│   ├── pages/          # 核心页面 (Translate, Service, Shortcuts)
│   ├── store/          # 状态管理 (Zustand stores)
│   ├── lib/            # 工具函数
│   └── App.tsx         # 根组件与路由逻辑
├── package.json        # 前端依赖管理
└── README.md           # 项目说明文档
```

## 📄 许可证

[MIT](./LICENSE)
