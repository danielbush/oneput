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
  const containerRef = useRef<View>(null);
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
          duration: 400,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
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
  const inputRef = useRef<TextInput>(null);
  const webViewRef = useRef<WebView>(null);
  const shouldRefocusRef = useRef(false);

  useEffect(() => {
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
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
            source={{ uri: WEB_SERVER_URL }}
            style={styles.webView}
            keyboardDisplayRequiresUserAction={false}
            hideKeyboardAccessoryView={true}
            onMessage={(event) => {
              shouldRefocusRef.current = true;
              const text = event.nativeEvent.data;
              setInputValue(text);
              setSelection({ start: 0, end: text.length });
              inputRef.current?.focus();
            }}
            webviewDebuggingEnabled={true}
          />
          <View style={styles.floatingButtonStrip}>
            <Pressable
              style={styles.chevronButton}
              onPress={() => {
                webViewRef.current?.injectJavaScript(`insertParagraphAfterFocus();`);
              }}
            >
              <Text style={styles.insButtonText}>ins</Text>
            </Pressable>
            <View style={styles.floatingButtonSpacer} />
            <Pressable
              style={styles.chevronButton}
              onPress={() => {
                webViewRef.current?.injectJavaScript(`movePreviousParagraph();`);
              }}
            >
              <Text style={styles.chevronTextUp}>▲</Text>
            </Pressable>
            <Pressable
              style={styles.chevronButton}
              onPress={() => {
                webViewRef.current?.injectJavaScript(`moveNextParagraph();`);
              }}
            >
              <Text style={styles.chevronTextDown}>▼</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.inputContainer}>
          {menuVisible && (
            <View style={styles.menu}>
              <RipplePressable style={styles.menuItem} onPress={() => setMenuVisible(false)}>
                <View style={styles.menuIconPlaceholder} />
                <Text style={styles.menuItemText}>item 1</Text>
                <View style={styles.menuIconPlaceholder} />
              </RipplePressable>
              <RipplePressable style={styles.menuItem} onPress={() => setMenuVisible(false)}>
                <View style={styles.menuIconPlaceholder} />
                <Text style={styles.menuItemText}>item 2</Text>
                <View style={styles.menuIconPlaceholder} />
              </RipplePressable>
              <RipplePressable style={styles.menuItem} onPress={() => setMenuVisible(false)}>
                <View style={styles.menuIconPlaceholder} />
                <Text style={styles.menuItemText}>item 3</Text>
                <View style={styles.menuIconPlaceholder} />
              </RipplePressable>
            </View>
          )}
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
    padding: 12
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
  inputRow: {
    flexDirection: 'row',
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
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8
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
    color: '#333',
    transform: [{ rotate: '90deg' }]
  },
  chevronTextDown: {
    fontSize: 24,
    color: '#333',
    transform: [{ rotate: '-90deg' }]
  }
});
