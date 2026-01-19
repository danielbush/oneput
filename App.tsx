import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useState, useRef, useEffect } from 'react';

const loremIpsumHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
      margin: 0;
    }
    p {
      margin-bottom: 16px;
      line-height: 1.6;
    }
    p span {
      background-color: rgba(255, 0, 0, 0.10);
      padding: 2px 1px;
      display: inline-block;
      border-width: 0.5px;
      border-radius: 2px;
      border-style: solid;
      border-color: rgba(0, 0, 0, 0.8);
    }
  </style>
</head>
<body>
  ${Array.from(
    { length: 20 },
    (_, i) =>
      `<p>Lorem! ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>`
  ).join('')}
  <script>
    (function() {
      const firstParagraph = document.querySelector('p');
      if (firstParagraph) {
        const text = firstParagraph.textContent;
        const words = text.split(/\\s+/).filter(word => word.length > 0);
        firstParagraph.innerHTML = words.map(word => '<span>' + word + '</span>').join(' ');

        // Add click listeners to all spans
        const spans = firstParagraph.querySelectorAll('span');
        spans.forEach(span => {
          span.style.cursor = 'pointer';
          span.addEventListener('click', function() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(this.textContent);
            }
          });
        });
      }
    })();
  </script>
</body>
</html>
`;

export default function App() {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<TextInput>(null);
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="auto" />

      <View style={styles.webViewContainer}>
        <WebView
          source={{ html: loremIpsumHTML }}
          style={styles.webView}
          keyboardDisplayRequiresUserAction={false}
          hideKeyboardAccessoryView={true}
          onMessage={(event) => {
            shouldRefocusRef.current = true;
            setInputValue(event.nativeEvent.data);
          }}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Type something..."
          placeholderTextColor="#999"
          onBlur={() => {
            // Immediately refocus when blurred to keep keyboard open
            if (shouldRefocusRef.current) {
              shouldRefocusRef.current = false;
              setTimeout(() => inputRef.current?.focus(), 0);
            }
          }}
        />
      </View>
    </KeyboardAvoidingView>
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
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16
  }
});
