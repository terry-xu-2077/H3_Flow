# ShotMill

ShotMill 是面向 AI 视频生产的素材生成工作台。当前后端进入 V0.3 Backend Foundation 阶段，桌面开发入口已经统一为一键启动。

## 开发环境

- Node.js 20+
- pnpm 10+
- Python 3.11+
- Rust stable（Tauri 桌面壳需要；一键启动器在 Windows 上可自动安装 Rust）

## 一键启动

Windows 真实联调直接双击根目录的 `启动 ShotMill（前端+后端）.bat`，它负责同时管理 FastAPI 后端与 Tauri 前端。

启动器会自动完成：

- 检查 Node.js、pnpm、Python 3.11+ 与 Rust/Cargo；缺少 Rust 时自动安装 stable toolchain。
- 创建或修复项目根目录 `.venv`。
- 仅在 `pyproject.toml` 发生变化时安装/更新 Python 后端与开发依赖。
- 仅在 `frontend/package.json` 或 `pnpm-lock.yaml` 发生变化时安装/更新前端依赖。
- 检测本机 `127.0.0.1:7897` 开发代理；依赖直连失败时自动通过该代理重试。
- 检查 `8765`：若已经是 ShotMill 后端则复用；若被其他程序占用则明确报错。
- 自动在一个标题为 `ShotMill Backend` 的可见控制台中启动 FastAPI，并等待 `/health` 真正就绪。
- 检查 `1420`：若已经是 ShotMill Vite 前端则复用，避免重复启动；若属于其他程序则报错。
- Tauri 窗口关闭时，会结束本次启动器创建的后端控制台及其 Uvicorn 进程树。
- 后端控制台还会监视主启动器 PID；即使主启动器被直接关闭，也会自动清理自己的后端进程树。
- 如果启动前 `8765` 已经有一个健康的 ShotMill 后端，启动器只复用它，不会在退出时结束用户原本运行的后端。

开发地址：

- 后端 API：`http://127.0.0.1:8765`
- 健康检查：`http://127.0.0.1:8765/health`
- 前端开发服务：`http://127.0.0.1:1420/dev/ui`
- 后端生命周期日志：`.shotmill/logs/backend-lifecycle.log`

首次启动可能需要下载 Python、前端与 Rust 依赖；之后会通过依赖指纹跳过不必要的重复安装。

## 假数据 UI 模式

只打磨 UI 或验证交互时，双击 `启动 ShotMill（假数据）.bat`。它会打开浏览器版 UI，并连接后端提供的独立假 API：

- 前端仍使用正式 `HttpProjectGateway` 和 `/api/v1`，没有第二套 UI 数据逻辑。
- 假 API 复用正式路由、Schema、SQLite 和业务 Service，并预置项目、任务、资产和 AI 增强历史。
- 当前会话内的保存和编辑真实生效；关闭启动器后临时数据自动清理。
- 不需要启动 ComfyUI，也不会调用外部 Prompt AI。

假数据 API 地址为 `http://127.0.0.1:8766`。详细契约见 [`contracts/README.md`](contracts/README.md)。

## 其他启动方式

浏览器 UI 调试仍可单独运行：

```powershell
& .\Start-UI.ps1
```

`Start-UI.ps1` 只负责浏览器 UI；需要完整前后端联调时使用 `启动 ShotMill（前端+后端）.bat`。

也可以分别手动启动。

后端：

```powershell
python -m pip install -e ".[dev]"
python -m uvicorn shotmill.app:app --app-dir backend --host 127.0.0.1 --port 8765 --reload
```

前端：

```powershell
pnpm --dir frontend dev
```

桌面壳：

```powershell
pnpm --dir frontend tauri dev
```

## 启动器预检

只检查环境和端口，不安装依赖、不启动程序：

```powershell
& .\scripts\start-dev.ps1 -CheckOnly
```

## 验收

```powershell
python scripts/verify.py
python scripts/verify.py --area backend
python scripts/verify.py --area frontend
python scripts/verify.py --full
```

产品与开发文档见 [`docs/README.md`](docs/README.md)，当前实施进度见 [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md)。
