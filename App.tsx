import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useState } from 'react';

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
        const words = text.split(/\s+/).filter(word => word.length > 0);
        firstParagraph.innerHTML = words.map(word => '<span>' + word + '</span>').join(' ');
      }
    })();
  </script>
</body>
</html>
`;

export default function App() {
  const [inputValue, setInputValue] = useState('');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="auto" />

      <View style={styles.webViewContainer}>
        <WebView source={{ html: loremIpsumHTML }} style={styles.webView} />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Type something..."
          placeholderTextColor="#999"
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
