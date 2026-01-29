import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useState, useRef } from 'react';
import { KeyboardAvoidingView, KeyboardProvider } from 'react-native-keyboard-controller';

const WEB_SERVER_URL = `${process.env.EXPO_PUBLIC_WEBVIEW_PROTO}://${process.env.EXPO_PUBLIC_WEBVIEW_HOSTNAME}:${process.env.EXPO_PUBLIC_WEBVIEW_PORT}${process.env.EXPO_PUBLIC_WEBVIEW_PATH}`;
console.log(`WEB_SERVER_URL for webview content: ${WEB_SERVER_URL}`);

export default function App() {
  const [webViewUrl, setWebViewUrl] = useState(WEB_SERVER_URL);
  const webViewRef = useRef<WebView>(null);

  return (
    <KeyboardProvider>
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <StatusBar style="auto" />

        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: webViewUrl }}
            style={styles.webView}
            keyboardDisplayRequiresUserAction={false}
            hideKeyboardAccessoryView={true}
            onMessage={(event) => {
              // TODO
            }}
            webviewDebuggingEnabled={true}
          />
        </View>
      </KeyboardAvoidingView>
    </KeyboardProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  webViewContainer: {
    flex: 1
  },
  webView: {
    flex: 1
  }
});
