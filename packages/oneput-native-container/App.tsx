import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useState, useRef, useEffect } from 'react';
import { KeyboardAvoidingView, KeyboardProvider } from 'react-native-keyboard-controller';
import { useShareIntent, ShareIntentProvider } from 'expo-share-intent';
import { File } from 'expo-file-system/next';

const WEB_SERVER_URL = `${process.env.EXPO_PUBLIC_WEBVIEW_PROTO}://${process.env.EXPO_PUBLIC_WEBVIEW_HOSTNAME}:${process.env.EXPO_PUBLIC_WEBVIEW_PORT}${process.env.EXPO_PUBLIC_WEBVIEW_PATH}`;
console.log(`WEB_SERVER_URL for webview content: ${WEB_SERVER_URL}`);

function AppContent() {
  const [webViewUrl, setWebViewUrl] = useState(WEB_SERVER_URL);
  const webViewRef = useRef<WebView>(null);
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();

  useEffect(() => {
    console.log('DEBUG: AppContent mounted');
    return () => console.log('DEBUG: AppContent unmounted');
  }, []);

  const sendImageToWebView = async (file: {
    path: string;
    mimeType: string;
    fileName?: string;
  }) => {
    try {
      const base64Data = await new File(file.path).base64();
      const dataUrl = `data:${file.mimeType};base64,${base64Data}`;

      setTimeout(() => {
        console.log('DEBUG: sending');
        const message = {
          type: 'insertImage',
          payload: {
            dataUrl,
            fileName: file.fileName || 'shared-image'
          }
        };
        webViewRef.current?.injectJavaScript(`
          this.window.dispatchEvent(
            new MessageEvent('message', { data: ${JSON.stringify(message)} })
          );
          true;`);
      }, 1500);
    } catch (err) {
      console.error('Failed to send image to WebView:', err);
    }
  };

  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      console.log('Received share intent:', shareIntent);

      const files = shareIntent.files || [];
      if (files.length > 0) {
        const imageFiles = files.filter((f) => f.mimeType?.startsWith('image/'));

        if (imageFiles.length > 0) {
          imageFiles.forEach((file) => {
            sendImageToWebView(file);
          });
          resetShareIntent();
        } else {
          const fileInfo = files.map((f) => `${f.fileName || f.path} (${f.mimeType})`).join('\n');
          Alert.alert('Shared Content Received', `Received ${files.length} file(s):\n${fileInfo}`, [
            { text: 'OK', onPress: () => resetShareIntent() }
          ]);
        }
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
            onLoadStart={() => console.log('DEBUG: WebView loading started')}
            onLoadEnd={() => console.log('DEBUG: WebView loading ended')}
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
