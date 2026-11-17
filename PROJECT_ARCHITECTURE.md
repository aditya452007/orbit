# Orbit — Project Architecture

> This file is the single starting point for any AI agent taking over this project.
> Read it before touching any code. It explains layout, build pipeline, IPC surface,
> the rebranding work, and known gotchas.

---

## 1. Project Identity (Current)

| Field | Value | Notes |
|-------|-------|-------|
| Product name | **Orbit** | Display name shown to users |
| package.json `name` | `orbit` | npm package name |
| `productName` (electron-builder) | `Orbit` | Windows display name |
| `appId` | `com.aaditya.orbit` | Electron AppUserModelId |
| Author / developer | `Aaditya Thakur` | Rebranded from HenryCa / HenryCauan |
| Repository | `https://github.com/aadityathakur/orbit.git` | Rebranded |
| License | GPL-3.0-or-later | See LICENSE |
| Node engine | `>=20` | Required |
| Platform | Windows 10 / 11 only | Win32 APIs throughout |

**Rebranding status:** The project was originally named **Zenith**, then renamed to **Rovyl**, and now rebranded to **Orbit**. The rename to Orbit is **surface-level** — visible names (package.json, README.md, window title, taskbar name, copyright) are updated. Internal identifiers (IPC channel names, localStorage keys, Portuguese comments) are intentionally left unchanged to preserve compatibility with existing installs.

---

## 2. Directory Layout

```
orbit/                              # project root
├── package.json                    # deps, scripts, electron-builder config (build key)
├── package-lock.json
├── tsconfig.json
├── vite.config.mjs                 # Vite + React + Tailwind v4, port 5173
├── index.html                      # entry HTML
├── .env.example                    # copy to .env.local for Google OAuth client ID
├── .gitignore
├── debug_shortcuts.ps1
├── LICENSE                         # GPL-3.0
├── README.md                       # user-facing docs
├── PROJECT_ARCHITECTURE.md         # this file
│
├── backend/                        # Electron main + preload + PowerShell helpers
│   ├── electron-main.js            # MAIN PROCESS — window lifecycle, IPC, triggers, updates, licensing
│   ├── electron-preload.js         # contextBridge API exposed to renderer as window.electron
│   ├── win32-launch.js             # command parsing/quoting for launching targets
│   ├── persistence-normalize.cjs   # config-v2.json blob normalisation (legacy flat → v2 nested)
│   ├── game-detection.cjs          # fullscreen/game detection for focus protection
│   ├── system-control.js
│   ├── mouse-blocker.ps1           # WH_MOUSE_LL hook — captures trigger button, swallows events
│   ├── foreground-focus.ps1        # steals foreground when Windows refuses focus
│   ├── extract-icon.ps1            # icon pipeline (AppxManifest, IShellItemImageFactory, halo detection)
│   ├── find_lnks.ps1
│   ├── get-foreground-exe.ps1
│   ├── simulate-keys.ps1
│   └── reproduce_icon_issue.ps1
│
├── src/                            # Renderer (React + TypeScript)
│   ├── main.tsx                    # React entry
│   ├── App.tsx                     # orchestrator: state, persistence, IPC wiring, window modes
│   ├── index.css                   # design tokens (--zn-*), all non-Tailwind styles
│   ├── types.ts                    # shared TS types (AppItem, Workspace, UIConfig, UserProfile…)
│   ├── defaults.ts                 # DEFAULT_UI_CONFIG, MINIMAL_MAIN_WORKSPACE_APPS, internal widgets
│   ├── translations.ts             # i18n strings
│   ├── iconMap.ts                  # static icon name → data URL / fallback map
│   ├── siteFavicon.ts              # website favicon resolution
│   ├── constants/siteUrls.ts       # external site URLs (auth, download…)
│   └── components/
│       ├── AppSelector.tsx
│       ├── IconPicker.tsx
│       ├── installedApps.tsx
│       ├── PrecisionSettings.tsx
│       ├── RadialHud.tsx
│       ├── RadialMenu.tsx          # the wheel: layout, aiming, gestures, slices
│       ├── RovylLogo.tsx
│       ├── SettingsModal.tsx
│       ├── SmartIcon.tsx
│       ├── SystemCenter.tsx
│       ├── Toast.tsx
│       ├── Tooltip.tsx
│       └── WelcomeScreen.tsx
│
├── scripts/                        # build / launch / verification
│   ├── start-local-runtime.cjs     # `npm start` — Vite + Electron
│   ├── launch-electron.js          # `npm run electron` — waits for port 5173
│   ├── verify-radial-windowing.mjs # enforces radial handshake invariants (runs in `npm run build`)
│   ├── generate-win-icon.mjs
│   ├── generate-appx-assets.mjs
│   ├── generate-store-listing-assets.mjs
│   ├── generate-hero-art.mjs
│   ├── generate-hero-wheel.mjs
│   ├── persistence-normalize-smoke.mjs
│   ├── run-electron-builder.mjs    # `npm run dist` wrapper
│   ├── release.mjs
│   ├── after-pack-win-icon.cjs
│   ├── after-all-artifact-win-icon.cjs
│   └── diag-lag.ps1
│
├── nsis/                           # installer customisation
│   └── installer.nsh
│
├── build/                          # icon sources + generated installer assets
│   ├── icon.ico
│   ├── icon.png
│   ├── installerSidebar.png
│   ├── installer-sidebar.bmp
│   └── installer-sidebar-source.png
│
├── resources/
│   └── bin/
│       └── zenith-mmb.exe          # helper binary (name still says zenith — internal, not rebranded)
│
├── design/                         # logo concepts
│   └── rovyl-logo-concept-v1.png
│
└── docs/
    ├── ARCHITECTURE.md             # original architecture notes (Zenith-era, Portuguese comments)
    └── media/                      # screenshots (workspaces.png, wheel.png, settings.png, banner.png)
```

---

## 3. Build Pipeline

| Script | Command | What it does |
|--------|---------|--------------|
| dev | `npm run dev` | Vite dev server only (port 5173) |
| electron | `npm run electron` | Electron only, waits for tcp:5173 |
| start | `npm start` | `scripts/start-local-runtime.cjs` — Vite + Electron together |
| build | `npm run build` | `tsc` → Vite build → `verify-radial-windowing.mjs` → `generate-win-icon.mjs` → `generate-appx-assets.mjs` |
| dist | `npm run dist` | `build` + electron-builder → NSIS installer in `build-out/` |
| dist:store | `npm run dist:store` | `build` + electron-builder → MSIX for Microsoft Store (not used — not publishing) |
| test:win32-launch | `npm run test:win32-launch` | `node --test backend/win32-launch.test.cjs` |
| test:persistence-shape | `npm run test:persistence-shape` | `scripts/persistence-normalize-smoke.mjs` |
| verify:radial-windowing | `npm run verify:radial-windowing` | runs `scripts/verify-radial-windowing.mjs` |

**electron-builder config** lives in `package.json` under the `"build"` key:
- `appId`: `com.aaditya.orbit`
- `productName`: `Orbit`
- `nsis.guid`: `7e9a7f84-635e-4847-854e-124c67c20cc9` (regenerated for this fork)
- `nsis.createDesktopShortcut`: `true`
- `appx.identityName`: `AadityaThakur.Orbit` (not publishing to Store, kept for consistency)
- `publish.provider`: `github`, owner `aadityathakur`, repo `orbit`

---

## 4. Runtime Architecture

### 4.1 Processes

- **Main process** (`backend/electron-main.js`): Node/Electron. Owns the `BrowserWindow`, global shortcuts, single-instance lock, mouse hook helper process, auto-updater, logging, persistence (config-v2.json), launch command execution.
- **Renderer process** (`src/`): React + Vite. Runs in the transparent BrowserWindow. Talks to main via `window.electron` (contextBridge).
- **Mouse blocker helper** (`backend/mouse-blocker.ps1`): PowerShell process with a `WH_MOUSE_LL` low-level hook. Captures the trigger button (middle / X1 / X2), swallows it (returns 1), reports `TRIGGER_DOWN`/`TRIGGER_UP` on stdout. Also synthesizes a middle-click passthrough for short stationary presses.
- **Foreground focus helper** (`backend/foreground-focus.ps1`): PowerShell to steal foreground focus when Windows refuses it.

### 4.2 IPC Surface (renderer → main)

Exposed via `contextBridge.exposeInMainWorld("electron", {...})` in `electron-preload.js`. Key channels:

- `execute-command` — launch an app/folder/URL/custom command
- `hide-window` / `show-window` — window visibility
- `open-menu` — show the radial wheel
- `prepare-radial-show` / `radial-prep-paint-done` / `radial-open-paint-done` / `radial-native-revealed` — radial windowing handshake (see §4.3)
- `set-window-size` / `apply-window-size` — switch `fullscreen` / `windowed` / `small` modes
- `set-window-hit-shape` / `set-panel-surface-visible` — hit-testing regions
- `get-installed-apps` / `get-startup-apps` / `get-onboarding-apps` — app discovery
- `get-file-icon` / `get-website-favicon-data-url` — icon resolution
- `save-full-config` / `save-full-config-sync` / `get-full-config` — persistence
- `get-settings` / `set-settings` — UI settings
- `start-google-auth` / `on-google-auth-success` / `on-google-auth-error` — Google sign-in
- `check-for-updates` / `install-update-now` / `get-update-state` — auto-updater
- `open-external-url` — open URL in system default browser
- `open-system-uninstall` — launch system uninstaller

### 4.3 Radial Windowing Handshake (critical)

The wheel is a transparent, frameless, always-on-top window. Opening it is a **handshake**, not a sequence:

```
prepare-radial-show → renderer paints neutral cover → radial-prep-paint-done →
open-menu → renderer paints wheel transparent → radial-open-paint-done →
main reveals → radial-native-revealed → bloom animation starts
```

`scripts/verify-radial-windowing.mjs` enforces the markers and runs as part of `npm run build`. If it fails, **the handshake was broken, not the test**.

Key rules from `docs/ARCHITECTURE.md`:
1. Confirmation resolves from the **live pointer**, never from React state.
2. A slice's hit area must match its paint (wrapper is `pointer-events: none`; the visible tile takes clicks).
3. Highlight and confirmation share one function (`resolveAimAtPoint`).

### 4.4 Persistence

- File: `%APPDATA%\Orbit\config-v2.json` (atomic write, `.bak` + quarantine for corrupt blobs)
- Shape: `{ user, apps, config }`
- On read: stored config is spread **over `DEFAULT_UI_CONFIG`** so new settings get defaults
- localStorage keys (legacy, still in use): `zenith_user`, `zenith_apps`, `zenith_config`, `zenith_main_discovery_done`, `zenith_initialized`, `zenith_first_run_complete`, `zenith_icon_normalization_version`
- `persistence-normalize.cjs` accepts both legacy flat and v2 nested shapes

### 4.5 Mouse Trigger

- Accepted buttons: middle (0x04), X1 (0x05), X2 (0x06). Left/right are rejected.
- Implemented via `WH_MOUSE_LL` hook in `mouse-blocker.ps1` (not polling) because swallowing requires returning 1 from the hook.
- A short stationary press synthesizes a middle-click back to the window underneath (events carry a `dwExtraInfo` signature so the hook doesn't re-interpret its own injection).

### 4.6 Application Launch Resolution (prevents "Windows cannot find" errors)

When Orbit launches an app via `execute-command`, it tries multiple methods in order:

1. **`shell.openExternal`** — for URLs/protocols (https, steam, discord, spotify)
2. **`shell.openPath`** — for files, folders, LNK shortcuts
3. **`exec_start`** — Windows `start "" <cmd>` (handles PATH aliases like notepad, chrome)
4. **`exec_explorer_shell`** — `shell:AppsFolder\<AUMID>` for Store/UWP apps
5. **`exec_direct`** — terminal-based launch (wt/cmd/powershell)
6. **`exec_silent_spawn`** — direct Node `spawn` (no terminal flash)

**Path fallback (new):** If all standard methods fail, Orbit searches the disk for the app before giving up:
- Checks if the command is already an absolute path that exists
- Searches `%LOCALAPPDATA%\Programs\*`, `%PROGRAMFILES%`, `%PROGRAMFILES(X86)%` (depth 2)
- Matches by exact filename or stem (e.g. "OpenCode" → "OpenCode.exe")
- Searches Start Menu `.lnk` shortcuts by display name via PowerShell

If a path is found, it retries with `exec_silent_spawn`. Only if that also fails does it send an `execution-error` to the renderer.

### 4.7 Distribution Channels

| Channel | `process.windowsStore` | Updater | License gate |
|---------|----------------------|---------|--------------|
| Direct (NSIS) | false | electron-updater → GitHub Releases | active |
| Store (MSIX) | true | disabled (Store forbids it) | skipped |

Not publishing to the Store, so appx values are kept but unused.

---

## 5. Known Gotchas

| Issue | Explanation |
|-------|-------------|
| Dev and packaged share `%APPDATA%\Orbit` | Electron derives `userData` path from `productName`. A dev session reads/writes your real config. Pass `--user-data-dir` for a clean profile. |
| `npm run build` runs `verify-radial-windowing.mjs` | Breaking the handshake fails the build. The test is correct; the code is wrong. |
| Comments are in Portuguese | They explain *why*, not *what*. Read them before changing arbitrary-looking code. |
| `opacity` is not a de-emphasis channel | Alpha multiplies the plate; use content contrast instead. |
| `autoInstallOnAppQuit` is off | The app exits via `app.exit(0)`, skipping `will-quit`. Updates are installed in `beginUpdateInstall()` on `before-quit` flush. |
| `ZENITH_*` env vars | GPU/mouse-hook overrides. `ZENITH_AGGRESSIVE_GPU=1`, `ZENITH_DISABLE_HARDWARE_ACCELERATION=1`, `ZENITH_MOUSE_HOOK_DELAY_MS=0` |
| `ROVYL_USER_DATA` / `ZENITH_USER_DATA` | Override `userData` directory before `app.getPath("userData")` is called. |
| Windows Store build | Not publishing — appx values are kept but unused. |

---

## 6. Windows Shortcut / App Launch Issues (Diagnosis)

If you search for an app in the Start Menu and clicking it sometimes fails with "Windows cannot find 'X'", **this is NOT caused by Orbit/Rovyl**. It's a known Windows 11 issue. Common causes:

1. **App Execution Aliases** — Windows 11 registers app aliases in `%LOCALAPPDATA%\Microsoft\WindowsApps\`. These sometimes fail to resolve from the Run dialog or Start Menu search.
2. **Start Menu index corruption** — The Windows Search index gets stale, showing shortcuts whose targets have moved or been deleted.
3. **Broken .lnk shortcuts** — Some shortcuts point to paths that no longer exist (e.g., after an app update reinstalls to a new location).
4. **Confusing a data folder with an executable** — `%APPDATA%\ai.opencode.desktop\` is a *data folder* (like Chrome's User Data), not an executable. The actual exe is at `%LOCALAPPDATA%\Programs\ai.opencode.desktop\OpenCode.exe`.

### Quick fixes to try:

| Fix | Command / Action |
|-----|-----------------|
| Launch by full path | `"%LOCALAPPDATA%\Programs\ai.opencode.desktop\OpenCode.exe"` |
| Rebuild Start Menu index | Settings → Privacy & security → Searching Windows → "Run indexer troubleshooter" or rebuild index |
| Check broken shortcuts | Look for `.lnk` files whose target path doesn't exist; delete and recreate them |
| Reset App Execution Aliases | Settings → Apps → App execution aliases → toggle off/on for the affected app |
| Clear icon cache | `ie4uinit.exe -show` or delete `%LOCALAPPDATA%\IconCache.db` then restart |

### How to tell if it's Orbit:
Orbit is a normal Electron app installed at `%LOCALAPPDATA%\Programs\Orbit\Orbit.exe`. It does not modify Windows system folders, file associations, or the Start Menu index. If other apps (OpenCode, Antigravity, etc.) have the same intermittent launch problem, it's a Windows issue, not Orbit.

---

## 7. Performance Optimizations (Applied)

The following optimizations have been applied to reduce disk size, memory, CPU, and battery usage:

### 7.1 Build/Size Reduction

| Change | Location | Effect |
|--------|----------|--------|
| Renderer-only deps moved to `devDependencies` | `package.json` | React, framer-motion, lucide-react, tailwindcss, fontsource, @tailwindcss/vite excluded from `app.asar` (already Vite-bundled in `dist/`) |
| File exclusions in `build.files` | `package.json` | Excludes CHANGELOG, README, docs, tests, examples, source maps from all node_modules (~10-20MB saved) |
| `compression: "maximum"` | `package.json` | LZMA compression for smaller NSIS installer |
| `differentialPackage: true` | `package.json` | NSIS updates only download changed blocks |

### 7.2 Chromium / V8 Flags (in `backend/electron-main.js`)

Applied via `app.commandLine.appendSwitch()` before `app.whenReady()`:

| Flag | Purpose |
|------|---------|
| `force_low_power_gpu` | Use integrated GPU, not discrete (saves battery) |
| `enable-low-end-device-mode` | Chromium reduces resource usage overall |
| `enable-low-res-tiling` | Lower-resolution tiles |
| `process-per-site` + `renderer-process-limit: 2` | Cap renderer processes |
| `disk-cache-size: 64MB` | Bound disk cache |
| `skia-resource-cache-limit-mb: 64` | Bound Skia cache |
| `disable-features: Vulkan,SpareRendererForSitePerProcess,...` | Disable unused Chromium subsystems |
| `enable-features: CalculateNativeWinOcclusion,TurnOffStreamingMediaCachingOnBattery` | Don't render occluded windows; don't cache media on battery |
| `js-flags: --max-old-space-size=128 --lite-mode` | Cap V8 heap at 128MB; V8 memory-reduction mode |

### 7.3 Power-Aware Behavior

- `powerMonitor.on('on-battery')` / `on('on-ac')` — dynamic switching between battery and AC presets
- On battery: memory reaper starts, low-power GPU active

### 7.4 Periodic Memory Reaper

- Every 45 seconds: `session.defaultSession.clearCache()` (HTTP cache, code cache)
- On window blur / minimize / hide: additional cache flush

### 7.5 Renderer: Pause Animations When Hidden

- `src/index.css`: `body[data-visibility="hidden"] *` sets `animation-play-state: paused` and `transition-play-state: paused`
- `src/App.tsx`: `visibilitychange` handler sets/removes `data-visibility` on `document.body`
- This eliminates Framer Motion idle CPU (was 11-19% per Rennet audit)

### 7.6 Expected Results

| Metric | Before | Target |
|--------|--------|--------|
| Disk size | ~300MB | ~220-250MB |
| Idle RAM | ~450MB | ~300-350MB |
| Idle CPU (hidden) | 11-19% | <3% |
| Battery drain | High | Low |

---

## 8. How to Start Work

1. Read `PROJECT_ARCHITECTURE.md` (this file)
2. Read `README.md` and `docs/ARCHITECTURE.md`
3. Run `npm install` then `npm start` to verify dev mode works
4. Run `npm run build` to verify nothing broke (especially `verify-radial-windowing.mjs`)
5. Run `npm run test:win32-launch` and `npm run test:persistence-shape`


1. Read `PROJECT_ARCHITECTURE.md` (this file)
2. Read `README.md` and `docs/ARCHITECTURE.md`
3. Run `npm install` then `npm start` to verify dev mode works
4. Run `npm run build` to verify nothing broke (especially `verify-radial-windowing.mjs`)
5. Run `npm run test:win32-launch` and `npm run test:persistence-shape`
