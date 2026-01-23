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

interface RipplePressableProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  rippleColor?: string;
}

function RipplePressable({
  onPress,
  style,
  children,
  rippleColor = 'rgba(0, 0, 0, 0.1)'
}: RipplePressableProps) {
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      const { locationX, locationY } = event.nativeEvent;

      scale.setValue(0);
      opacity.setValue(1);

      setRipple({ x: locationX, y: locationY, key: Date.now() });

      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true
        })
      ]).start(() => {
        setRipple(null);
      });
    },
    [scale, opacity]
  );

  const maxDimension = Math.max(containerSize.width, containerSize.height);
  const rippleSize = maxDimension * 2.5;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      style={[style, { overflow: 'hidden' }]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setContainerSize({ width, height });
      }}
    >
      {children}
      {ripple && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: ripple.x - rippleSize / 2,
            top: ripple.y - rippleSize / 2,
            width: rippleSize,
            height: rippleSize,
            borderRadius: rippleSize / 2,
            backgroundColor: rippleColor,
            transform: [{ scale }],
            opacity
          }}
        />
      )}
    </Pressable>
  );
}

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

        <View style={styles.inputContainer}>
          {menuVisible && (
            <View style={styles.menu}>
              <RipplePressable style={styles.menuItem} onPress={() => setMenuVisible(false)}>
                <View style={styles.menuIconPlaceholder} />
                <View style={styles.menuItemKatex}>
                  <WebView
                    style={styles.katexWebView}
                    source={{
                      html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
                          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
                          <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
                          <style>
                            html, body {
                              margin: 0;
                              padding: 0;
                              height: 100%;
                            }
                            body { padding: 0; margin: 0; padding-top: 0px; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; background: yellow; }
                            .katex { font-size: 1.1em; }
                            #formula { background-color: pink; }
                          </style>
                        </head>
                        <body>
                          <div id="formula"></div>
                          <script>
                            katex.render("e^{i\\\\pi} + 1 = 0", document.getElementById("formula"));
                          </script>
                        </body>
                        </html>
                      `
                    }}
                    scrollEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
                <View style={styles.menuIconPlaceholder} />
              </RipplePressable>
              <RipplePressable
                style={styles.menuItem}
                onPress={() => {
                  setWebViewUrl('https://en.wikipedia.org/wiki/Euler%27s_identity');
                  setMenuVisible(false);
                }}
              >
                <View style={styles.menuIconPlaceholder} />
                <Text style={styles.menuItemText}>Wikipedia</Text>
                <View style={styles.menuIconPlaceholder} />
              </RipplePressable>
              <RipplePressable
                style={styles.menuItem}
                onPress={() => {
                  setWebViewUrl(WEB_SERVER_URL);
                  setMenuVisible(false);
                }}
              >
                <View style={styles.menuIconPlaceholder} />
                <Text style={styles.menuItemText}>Back to Editor</Text>
                <View style={styles.menuIconPlaceholder} />
              </RipplePressable>
            </View>
          )}
          <View style={styles.buttonRow}>
            <View>
              <Pressable
                style={{ ...styles.chevronButton, position: 'absolute', bottom: 0 }}
                onPress={() => {
                  webViewRef.current?.injectJavaScript(`insertParagraphAfterFocus();`);
                }}
              >
                <Text style={styles.insButtonText}>ins</Text>
              </Pressable>
            </View>
            <View></View>
            <View>
              <View
                style={{ position: 'absolute', right: 0, bottom: 0, flexDirection: 'row', gap: 8 }}
              >
                <Pressable
                  style={{ ...styles.chevronButton }}
                  onPress={() => {
                    webViewRef.current?.injectJavaScript(`movePreviousParagraph();`);
                  }}
                >
                  <Text style={styles.chevronTextUp}>U</Text>
                </Pressable>
                <Pressable
                  style={{ ...styles.chevronButton }}
                  onPress={() => {
                    webViewRef.current?.injectJavaScript(`moveNextParagraph();`);
                  }}
                >
                  <Text style={styles.chevronTextDown}>D</Text>
                </Pressable>
              </View>
            </View>
          </View>
          <View style={styles.inputRow}>
            <Pressable style={styles.chevronButton} onPress={() => setMenuVisible(!menuVisible)}>
              <Text style={styles.menuButtonText}>M</Text>
            </Pressable>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={inputValue}
              onChangeText={(text) => {
                setInputValue(text);
                webViewRef.current?.injectJavaScript(`updateCursorText(${JSON.stringify(text)});`);
              }}
              selection={selection}
              onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
              placeholder="Type something..."
              placeholderTextColor="#999"
              // First Autosuggestion updates next/previous token:
              //
              // Disable autccomplete/correct:
              // - I type "Abc" in the TextInput
              // - this updates the current span tag
              // - autocomplete above TextInput in iOS hows "Abc" | ABC | ...
              // - I then hit right chevron button to move to next span tag
              // - this span tag is ALSO updated with the first non-quoted autocomplete option (ABC)
              // Claude:
              // The issue is that iOS autocomplete applies when focus changes. We
              // need to disable autocomplete on the TextInput to prevent this
              // behavior. Let me add the appropriate props.
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              onBlur={() => {
                // Immediately refocus when blurred to keep keyboard open
                if (shouldRefocusRef.current) {
                  shouldRefocusRef.current = false;
                  setTimeout(() => inputRef.current?.focus(), 0);
                }
              }}
            />
            <Pressable
              style={styles.chevronButton}
              onPress={() => {
                webViewRef.current?.injectJavaScript(`movePrevious();`);
              }}
            >
              <Text style={styles.chevronText}>‹</Text>
            </Pressable>
            <Pressable
              style={styles.chevronButton}
              onPress={() => {
                webViewRef.current?.injectJavaScript(`moveNext();`);
              }}
            >
              <Text style={styles.chevronText}>›</Text>
            </Pressable>
          </View>
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
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 20
  },
  menu: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  menuIconPlaceholder: {
    width: 24,
    height: 24,
    backgroundColor: '#eee',
    borderRadius: 4
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    marginHorizontal: 12
  },
  menuItemKatex: {
    flex: 1,
    height: 30,
    marginHorizontal: 12
  },
  katexWebView: {
    flex: 1,
    backgroundColor: 'red'
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16
  },
  chevronButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8'
  },
  chevronText: {
    fontSize: 24,
    color: '#333'
  },
  floatingButtonStrip: {
    // position: 'absolute',
    // bottom: 8,
    // left: 8,
    // right: 8,
    flexDirection: 'row',
    gap: 8
  },
  between: {
    flex: 1
  },
  floatingButtonSpacer: {
    flex: 1
  },
  insButtonText: {
    fontSize: 16,
    color: '#333'
  },
  menuButtonText: {
    fontSize: 18,
    color: '#333'
  },
  chevronTextUp: {
    fontSize: 24,
    color: '#333'
  },
  chevronTextDown: {
    fontSize: 24,
    color: '#333'
  }
});
