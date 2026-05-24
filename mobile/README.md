# Allama Android App 📱

The official React Native application for the Allama project. This app allows you to interact with local AI models (GGUF) directly on your Android device or connect to a remote Ollama server.

## ✨ Features
- **Offline Mode:** Download and run GGUF models locally on your phone using `llama.rn`.
- **Hybrid Support:** Connect to Ollama running in Termux or on a remote PC.
- **RTL & Arabic Support:** Fully optimized UI with **Cairo** font and Right-to-Left layout.
- **Error Protection:** Built-in Error Boundary to capture and report crashes.
- **Dynamic UI:** Dark/Light mode support and responsive design.

## 🚀 Installation

### 📦 Download APK
You can download the latest generated APK from the **Releases** section of this repository (if available) or via **GitHub Actions Artifacts**:
1. Go to the [Actions](https://github.com/muzammilsoft/3allama/actions) tab.
2. Select the latest successful **Build Android APK** run.
3. Scroll down to **Artifacts** and download `Allama-Release-APK`.

## 🛠️ Development

### Prerequisites
- Node.js >= 18
- Android Studio & SDK
- React Native environment setup

### Getting Started
1. `cd mobile`
2. `npm install --legacy-peer-deps`
3. `npx react-native start`
4. In another terminal: `npx react-native run-android`

## 👨‍💻 Credits
Developed by **muzammilsoft**.
