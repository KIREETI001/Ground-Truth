# 01. Setup & Tooling

> Getting JS / Node / Bun / Deno installed, package managers, editors, and modern tooling for 2026.

---

## Table of Contents

1. [Choosing a Runtime](#1-choosing-a-runtime)
2. [Installing Node.js](#2-installing-nodejs)
3. [Installing Bun](#3-installing-bun)
4. [Installing Deno](#4-installing-deno)
5. [Version Managers](#5-version-managers)
6. [Package Managers](#6-package-managers)
7. [package.json — the Project Manifest](#7-packagejson--the-project-manifest)
8. [Editors and IDEs](#8-editors-and-ides)
9. [REPL and Running Scripts](#9-repl-and-running-scripts)
10. [Project Layout](#10-project-layout)
11. [Common Setup Problems](#11-common-setup-problems)

---

## 1. Choosing a Runtime

| Runtime | Status in 2026 | Pick when |
|---|---|---|
| **Node.js** | Mature default, biggest ecosystem | Most production work. When you need every package and the broadest hiring pool. |
| **Bun** | Production-ready by 2024+, very fast | New project; you want one tool for runtime + bundler + tests + package manager. |
| **Deno** | Mature, smaller adoption | Standards-aligned project; TypeScript by default; security matters. |
| **Browser** | The original | Frontend code, no install required. |

You can hedge: write code that targets web-standard APIs (`fetch`, Web Streams) and works on multiple runtimes.

---

## 2. Installing Node.js

### macOS
```bash
brew install node
# or use a version manager (recommended; see below)
```

### Linux
Best to use **NodeSource** or a version manager. Distro packages are usually old.
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs
```

### Windows
Download from [nodejs.org](https://nodejs.org), or:
```powershell
winget install OpenJS.NodeJS
# or use nvm-windows
```

### Verify
```bash
node --version
npm --version
```

### LTS vs Current
Node has **LTS** (Long-Term Support, supported ~30 months) and **Current** (latest, ~6 months of life). For production: LTS. As of 2026, Node 22 LTS is the safe default; Node 24 LTS arrives in late 2026.

---

## 3. Installing Bun

```bash
# macOS / Linux / WSL
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1|iex"

# Verify
bun --version
```

Bun replaces `node`, `npm`, `npx`, `tsc`, and a test runner — all in one binary. Most Node code runs unchanged on Bun.

---

## 4. Installing Deno

```bash
# macOS / Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows
irm https://deno.land/install.ps1 | iex
```

```bash
deno --version
deno run https://docs.deno.com/examples/hello-world.ts
```

Deno is secure-by-default — needs explicit flags for filesystem, network, env access:
```bash
deno run --allow-net --allow-read myscript.ts
```

---

## 5. Version Managers

You'll want different Node versions per project. Pick one:

### nvm (Linux / macOS)
```bash
# Install
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash

# Use
nvm install 22         # install Node 22
nvm install --lts
nvm use 22
nvm list

# .nvmrc — pin a version per project
echo "22" > .nvmrc
nvm use                # reads .nvmrc
```

### fnm — fast nvm alternative (Rust)
```bash
brew install fnm
# fish/bash/zsh shell hook needed; see fnm docs

fnm install 22
fnm use 22
```

### Volta — multi-tool version manager
```bash
curl https://get.volta.sh | bash
volta install node@22
volta pin node@22       # in a project — saved to package.json
```

### asdf — generic multi-language version manager
```bash
asdf plugin add nodejs
asdf install nodejs latest
asdf global nodejs latest
```

### Recommendation
- Solo dev / new project: **fnm** or **Volta**.
- Polyglot dev: **asdf** (works for Python, Ruby, etc., too).
- Team consistency: **Volta** (auto-switches per project).

---

## 6. Package Managers

Four mainstream choices. They all install from npm registry.

### npm
Ships with Node. The original. Reliable, slowest of the bunch.
```bash
npm install <pkg>            # adds to dependencies in package.json
npm install -D <pkg>         # devDependencies
npm install -g <pkg>         # global (rarely a good idea)
npm uninstall <pkg>
npm update
npm list
npm outdated
npm run <script>             # run a script defined in package.json
npm exec <pkg> -- <args>     # run a one-off package (legacy: npx)
npx <pkg>                    # same — runs without permanent install
```

### pnpm — fast, disk-efficient
```bash
npm install -g pnpm
pnpm install
pnpm add <pkg>
pnpm add -D <pkg>
pnpm run <script>
pnpm exec <bin>
```

Stores one copy of each package version on disk and uses hard links. Saves gigabytes when you have many projects.

### yarn — older alternative
Yarn v1 ("classic"): similar to npm with extra speed. Still common.
Yarn v3/v4 ("Berry"): stricter, Plug'n'Play option, monorepo features. Less common in 2026.

### bun
If you use Bun as your runtime, you usually use it as your package manager too:
```bash
bun install
bun add <pkg>
bun add -d <pkg>
bun run <script>
bun x <pkg>          # like npx
```

Often 5-20x faster than npm.

### Recommendation
- **New project, want speed**: pnpm or bun.
- **Team using npm**: stay on npm.
- **Monorepo**: pnpm has excellent workspace support; npm has decent built-in support.

### Lockfiles
Every package manager produces a lockfile that pins exact versions:
- `package-lock.json` — npm
- `pnpm-lock.yaml` — pnpm
- `yarn.lock` — yarn
- `bun.lockb` — bun (binary format)

**Commit your lockfile.** Without it, every install reproduces a different dependency graph.

---

## 7. package.json — the Project Manifest

The configuration file for any Node-ecosystem project.

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest",
    "lint": "eslint .",
    "format": "prettier --write .",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

### Key fields
- `"type": "module"` — use ES module syntax (`import`/`export`). Without this, Node treats `.js` files as CommonJS (`require`).
- `"scripts"` — commands runnable via `npm run <name>`.
- `"dependencies"` — needed at runtime.
- `"devDependencies"` — only needed for development/build (test runners, linters, types).
- `"engines"` — required runtime versions.

### Version ranges
- `"1.2.3"` — exact.
- `"^1.2.3"` — minor and patch updates OK (1.2.3 to <2.0.0). Most common.
- `"~1.2.3"` — patch updates only (1.2.3 to <1.3.0).
- `"latest"` / `"*"` — anything. Don't.

The lockfile pins the exact resolved versions, so the range only matters during `install`/`update`.

### Useful scripts
```json
{
  "scripts": {
    "dev": "vite",                          // dev server
    "build": "tsc -p . && vite build",      // typecheck + build
    "test": "vitest",                       // tests
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "lint": "eslint . --max-warnings 0",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "prepare": "husky install",              // git hooks
    "ci": "npm run lint && npm run typecheck && npm test"
  }
}
```

Pre-/post- hooks: `"pretest": "..."` runs before `npm test`.

---

## 8. Editors and IDEs

### VS Code
The standard for JS/TS development in 2026.

Essential extensions:
- **ESLint** — inline linting
- **Prettier** — formatting
- **Error Lens** — inline errors
- **Pretty TypeScript Errors** — readable TS errors
- **Auto Rename Tag** — for JSX/HTML
- **GitLens** — inline blame, history
- **vscode-icons** or **Material Icon Theme** — file icons

Workspace config (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "[javascript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" }
}
```

### WebStorm / IntelliJ
JetBrains' IDE. Heavier, more refactoring power, integrated debugger and database tools. Worth it for large codebases.

### Zed, Cursor, Windsurf
Newer AI-first editors. All support JS/TS reasonably; VS Code still has the deepest ecosystem.

### vim/neovim
With `coc.nvim` or `nvim-lspconfig` + `typescript-language-server`, you can get IDE-level features. Powerful but more setup.

---

## 9. REPL and Running Scripts

### Node REPL
```bash
node                  # interactive prompt
> 1 + 1
2
> .help
> .editor             # multi-line mode
> .exit               # or Ctrl+D
```

### Bun and Deno REPL
```bash
bun repl
deno repl             # supports TS directly
```

### Running a script
```bash
node script.js
node --watch script.js          # auto-restart on changes
node --inspect script.js         # enable debugger (chrome://inspect)
node --inspect-brk script.js     # debugger, break on first line

bun script.ts                     # Bun runs .ts directly, no compile step
deno run --allow-all script.ts    # Deno runs .ts directly
```

### One-liner
```bash
node -e "console.log(1+1)"
node -e "console.log(process.versions)"
```

### tsx — run TypeScript directly with Node
```bash
npx tsx script.ts
npm i -D tsx
# then: "scripts": { "dev": "tsx watch src/index.ts" }
```

Or use Node 22.6+ with `--experimental-strip-types`:
```bash
node --experimental-strip-types script.ts
```

By 2026 native TS support in Node is broader; check your version.

---

## 10. Project Layout

A typical TS/JS project structure:

```
my-app/
├── package.json
├── package-lock.json (or pnpm-lock.yaml / bun.lockb)
├── tsconfig.json (if TypeScript)
├── .eslintrc.json or eslint.config.js
├── .prettierrc
├── .gitignore
├── .nvmrc or .node-version
├── README.md
├── src/
│   ├── index.ts
│   ├── server.ts
│   ├── routes/
│   ├── services/
│   ├── lib/
│   └── types/
├── tests/
│   └── (or co-located *.test.ts next to source)
├── public/ (frontend assets)
└── dist/ or build/ (compiled output — gitignored)
```

### `.gitignore` essentials
```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
.vscode/
```

### Monorepo (multiple packages)
```
my-monorepo/
├── package.json (workspace root)
├── pnpm-workspace.yaml
├── packages/
│   ├── api/
│   ├── web/
│   └── shared/
└── apps/
    └── ...
```

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "apps/*"
```

Tools that help: **pnpm workspaces** (built-in), **Turbo** / **Nx** (caching, task orchestration), **Changesets** (versioning).

---

## 11. Common Setup Problems

### "command not found: node"
Not installed or not on PATH. Reopen shell after installing a version manager.

### "EACCES: permission denied" on `npm install -g`
Don't use sudo. Use a version manager (it puts Node in your home directory) or fix npm's prefix:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
# Add ~/.npm-global/bin to PATH
```

### "Cannot find module 'X'"
- Did you run `npm install`?
- Are you in the right directory?
- Did you commit `package.json` but not run install on the new machine?
- ESM vs CommonJS mismatch — check `"type"` in package.json.

### Lockfile conflicts in git
Treat conflicts in lockfiles as data, not text. Delete `node_modules` and the lockfile, run `npm install` (or your manager's equivalent) to regenerate.

### "Cannot use import statement outside a module"
Add `"type": "module"` to `package.json`, or rename file to `.mjs`, or compile to CommonJS.

### Windows + Node: long paths / strange chars
Enable long paths in Windows registry. Avoid spaces in project paths.

### Two versions of the same package installed
Run `npm ls <pkg>` to see who pulled which version. Often a transitive dependency issue. Force resolution via `overrides` in package.json:
```json
{
  "overrides": {
    "some-pkg": "1.2.3"
  }
}
```

### Deprecation warnings on every command
Usually harmless. The Node ecosystem moves fast; libraries get deprecated. Check if there's an updated successor.

### Slow `npm install` on CI
- Cache `node_modules` (or `~/.npm`) between runs.
- Use `npm ci` instead of `npm install` — strictly uses the lockfile, faster.
- Try pnpm or bun for raw speed.

---

## Quick recommended setup (2026)

```bash
# Install fnm (or your preferred Node manager)
brew install fnm

# Install Node LTS
fnm install --lts && fnm use --lts

# Initialize a TypeScript project
mkdir my-app && cd my-app
npm init -y
npm install -D typescript @types/node tsx vitest eslint prettier
npx tsc --init --rootDir src --outDir dist --module nodenext --target es2022 --strict

# Add a script
# In package.json: "dev": "tsx watch src/index.ts"

# Create entry point
mkdir src && echo 'console.log("hello")' > src/index.ts
npm run dev
```

Now you have: TypeScript, hot-reload, tests, linting, formatting — ready to build.
