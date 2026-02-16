# Migration Plan: Electron to Tauri

This plan outlines the steps required to migrate the Cosmonet Browser from Electron to Tauri 2.0.

## 1. Initial Setup

- [x] Initialized Tauri 2.0 project in `src-tauri`.
- [x] Install `@tauri-apps/api` and necessary plugins.
- [x] Configure `tauri.conf.json` with appropriate permissions and global Tauri API.

## 2. Backend Implementation (Rust)

- [x] Implement file-based storage commands (bookmarks, history, settings, passwords) in `src-tauri/src/lib.rs`.
- [x] Implement `get_app_path` command.
- [x] Implement webview management commands (create, resize, visibility, navigation).
- [x] Implement the application menu in Rust.
- [x] Implement Google Login Bypass logic (stealth injection via `initialization_script`).

## 3. Frontend Adaptation

- [x] Create a `tauri-bridge.js` to replace `preload.js` functionality.
- [x] Update `renderer.js` to use the Tauri bridge.
- [x] Handle tabbed webviews by bridging native Tauri webviews to the frontend tab system.

## 4. Build and Testing

- [ ] Test the application using `npm run tauri dev`.
- [ ] Verify Google Login bypass still works.
- [ ] Build the application for Windows.

## 5. Cleanup

- [ ] Remove Electron-specific files (`main.js`, `preload.js`, `webview-preload.js` if replaced).
- [ ] Update `package.json` scripts.
