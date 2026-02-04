import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useState, useRef, useEffect } from 'react';
import { KeyboardAvoidingView, KeyboardProvider } from 'react-native-keyboard-controller';
import { useShareIntent, ShareIntentProvider } from 'expo-share-intent';

const WEB_SERVER_URL = `${process.env.EXPO_PUBLIC_WEBVIEW_PROTO}://${process.env.EXPO_PUBLIC_WEBVIEW_HOSTNAME}:${process.env.EXPO_PUBLIC_WEBVIEW_PORT}${process.env.EXPO_PUBLIC_WEBVIEW_PATH}`;
console.log(`WEB_SERVER_URL for webview content: ${WEB_SERVER_URL}`);

function AppContent() {
  const [webViewUrl, setWebViewUrl] = useState(WEB_SERVER_URL);
  const webViewRef = useRef<WebView>(null);
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();

  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      console.log('Received share intent:', shareIntent);

      const files = shareIntent.files || [];
      if (files.length > 0) {
        const fileInfo = files.map((f) => `${f.fileName || f.path} (${f.mimeType})`).join('\n');
        Alert.alert('Shared Content Received', `Received ${files.length} file(s):\n${fileInfo}`, [
          { text: 'OK', onPress: () => resetShareIntent() }
        ]);
      } else if (shareIntent.text) {
        Alert.alert('Shared Text Received', shareIntent.text, [
          { text: 'OK', onPress: () => resetShareIntent() }
        ]);
      }
    }
    if (error) {
      console.error('Share intent error:', error);
    }
  }, [hasShareIntent, shareIntent, error, resetShareIntent]);

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
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'test') {
                  Alert.alert(data.title ?? 'Confirm', data.message ?? '', [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                      onPress: () => {
                        webViewRef.current?.injectJavaScript(`
                          window.postMessage(${JSON.stringify({ type: 'test', payload: { message: 'Cancelled' } })}, '*');
                        `);
                      }
                    },
                    {
                      text: 'OK',
                      onPress: () => {
                        webViewRef.current?.injectJavaScript(`
                          window.postMessage(${JSON.stringify({ type: 'test', payload: { message: 'Confirmed' } })}, '*');
                        `);
                      }
                    }
                  ]);
                }
              } catch {
                // Not JSON, ignore
              }
            }}
            // webviewDebuggingEnabled={true}
          />
        </View>
      </KeyboardAvoidingView>
    </KeyboardProvider>
  );
}

export default function App() {
  return (
    <ShareIntentProvider>
      <AppContent />
    </ShareIntentProvider>
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
