# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Proof of concept: Native iOS/Android input and menu system interacting with a WebView. The native TextInput edits content displayed in a WebView, demonstrating bidirectional communication between React Native and web content.

## Running the App

Requires two terminals:

```bash
# Terminal 1: Start the web server (serves WebView content)
task webview

# Terminal 2: Start Expo
task expo
```

Or manually:
```bash
pnpm run serve-web   # serves web/ on port 8080
pnpm run start       # expo start
```

## Architecture

- **App.tsx** - React Native app with TextInput, navigation buttons, and menu. Communicates with WebView via `injectJavaScript()` and `onMessage`.
- **web/index.html** - Static HTML content loaded in WebView
- **web/app.js** - JavaScript injected into WebView. Exposes global functions (`moveNext`, `movePrevious`, `updateCursorText`, etc.) called from React Native.

## Native ↔ WebView Communication

- **Native → WebView**: `webViewRef.current.injectJavaScript('functionName()')`
- **WebView → Native**: `window.ReactNativeWebView.postMessage(text)` triggers `onMessage` callback
