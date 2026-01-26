import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  TextInput,
  Platform,
  Keyboard,
  Pressable,
  Text,
  Animated,
  GestureResponderEvent,
  ViewStyle,
  StyleProp
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useState, useRef, useEffect, useCallback } from 'react';
import { KeyboardAvoidingView, KeyboardProvider } from 'react-native-keyboard-controller';

const WEB_SERVER_URL = `http://${process.env.EXPO_PUBLIC_WEBVIEW_HOSTNAME}:${process.env.EXPO_PUBLIC_WEBVIEW_PORT}`;
console.log(`WEB_SERVER_URL for webview content: ${WEB_SERVER_URL}`);

export default function App() {
  const [inputValue, setInputValue] = useState('');
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const [menuVisible, setMenuVisible] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState(WEB_SERVER_URL);
  const inputRef = useRef<TextInput>(null);
  const webViewRef = useRef<WebView>(null);
  const shouldRefocusRef = useRef(false);
  const menuSlideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardWillHide = Keyboard.addListener(
      'keyboardWillHide',
      // Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        if (shouldRefocusRef.current) {
          shouldRefocusRef.current = false;
          inputRef.current?.focus();
        }
      }
    );

    return () => keyboardWillHide.remove();
  }, []);

  useEffect(() => {
    Animated.timing(menuSlideAnim, {
      toValue: menuVisible ? 1 : 0,
      duration: 250,
      useNativeDriver: true
    }).start();
  }, [menuVisible, menuSlideAnim]);

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
              if (Platform.OS === 'ios') {
                // Prevents keyboard going down and up when clicking on word
                // tokens in iOS.
                // Android doesn't have this problem.
                // If enabled in Android this causes the keyboard to not go down
                // the first time if you hit the done/submit button, only the
                // second time.
                shouldRefocusRef.current = true;
              }
              const text = event.nativeEvent.data;
              setInputValue(text);
              setSelection({ start: 0, end: text.length });
              inputRef.current?.focus();
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
