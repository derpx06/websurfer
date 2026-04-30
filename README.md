# WebSurfer

WebSurfer is an open-source AI web automation Chrome extension that runs multi-agent systems locally in the browser. It provides automation and browsing agents, supports multiple LLM providers, and is designed for development and experimentation.

## 🚀 Quick Start (Build from Source)

Prerequisites:

- Node.js (use the version in `.nvmrc` if present)
- pnpm

Clone and install:

```bash
git clone <your-repo-url>
cd webSurfer
pnpm install
```

Development:

```bash
pnpm -F chrome-extension dev
```

Build for distribution:

```bash
pnpm build
```

The built extension output is written to the `dist/` directory. Load it in Chrome via `chrome://extensions/` → `Load unpacked`.

## 📄 License

This project is licensed under the Apache License 2.0 — see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This repository does not endorse or support blockchain, cryptocurrency, NFT projects, or similar derivative works. Any such projects are unaffiliated with the maintainers of this codebase.
