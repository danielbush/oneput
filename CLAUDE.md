# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Proof of concept: Testing whether a WebView can serve as the primary interface for a React Native app while leveraging native capabilities. The main goals are:

1. Assess viability of running the entire UI within a WebView
2. Test native feature integration (e.g., sharing content from other apps into this app)
3. Evaluate bidirectional communication between React Native and web content

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

After modifying native plugins (like `expo-share-intent` in app.json), rebuild the native app:
```bash
npx expo prebuild --clean
npx expo run:android  # or run:ios
```

## Architecture

- **App.tsx** - React Native shell that hosts the WebView. Handles native features like share intents and passes data to the WebView via `injectJavaScript()` and `onMessage`.
- **web/index.html** - The main app UI loaded in the WebView
- **web/app.js** - JavaScript running in the WebView context

## Native <-> WebView Communication

- **Native -> WebView**: `webViewRef.current.injectJavaScript('...')`
- **WebView -> Native**: `window.ReactNativeWebView.postMessage(data)` triggers `onMessage` callback in App.tsx

## Native Features Being Tested

- **Share Intent**: Configured via `expo-share-intent` plugin to receive shared PDFs and images from other apps
