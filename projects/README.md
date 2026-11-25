# 项目配置目录

`projects/` 用于保存按项目隔离的启动配置。每个项目使用一个单独的目录，并在目录中放置 `platform.config.json`：

```text
projects/
└── <项目名称>/
    ├── platform.config.json
    └── data/                 # 可选：配置中的 dataDir: "./data"
```

启动时可通过命令行或环境变量选择项目：

```bash
pnpm dev -- --project demo
pnpm server -- --project demo
GRAPH_MODEL_PROJECT=demo pnpm server
```

命令行 `--project` 优先于 `GRAPH_MODEL_PROJECT`。未指定项目时只使用仓库根目录的 `platform.config.json`，不会读取本目录。指定项目但项目配置不存在或内容无效时回退到根配置。

项目配置中的相对 `dataDir` 相对该项目目录解析；根配置中的相对 `dataDir` 相对仓库根目录解析。`GRAPH_MODEL_DATA_DIR` 仍然优先于配置文件中的 `dataDir`。

项目目录可继续放置未来的界面定制配置；本次启动链只读取 `platform.config.json`。
