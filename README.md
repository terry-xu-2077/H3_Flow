# ShotMill

ShotMill 是面向 AI 视频生产的素材生成工作台。V0.1 当前从工程基础设施和 `/dev/ui` Mock 工作区开始开发。

## 开发环境

- Node.js 20+
- pnpm 10+
- Python 3.11+
- Rust stable（构建 Tauri 桌面壳时需要）

## 首次安装

```powershell
python -m pip install -e ".[dev]"
pnpm --dir frontend install
```

## 启动

打磨浏览器 UI（自动打开 `/dev/ui`，支持热更新）：

```powershell
& .\Start-UI.ps1
```

需要在 Tauri 桌面壳中打磨时：

```powershell
& .\Start-UI.ps1 -Desktop
```

也可以分别手动启动：

后端：

```powershell
python -m uvicorn shotmill.app:app --app-dir backend --host 127.0.0.1 --port 8765 --reload
```

前端：

```powershell
pnpm --dir frontend dev
```

浏览器打开 `http://127.0.0.1:1420/dev/ui` 可进入不依赖真实 Provider 的 UI 开发模式。

桌面壳：

```powershell
pnpm --dir frontend tauri dev
```

## 验收

```powershell
python scripts/verify.py
python scripts/verify.py --area backend
python scripts/verify.py --area frontend
python scripts/verify.py --full
```

产品与开发文档见 [`docs/README.md`](docs/README.md)，当前实施进度见 [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md)。
