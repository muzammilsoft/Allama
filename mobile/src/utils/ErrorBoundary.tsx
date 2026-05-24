import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ToastAndroid } from 'react-native';
import { AlertTriangle, Copy, RefreshCcw } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  copyToClipboard = () => {
    const { error, errorInfo } = this.state;
    const errorMessage = `Error: ${error?.toString()}\n\nStack: ${error?.stack}\n\nComponent Stack: ${errorInfo?.componentStack}`;
    Clipboard.setString(errorMessage);
    ToastAndroid.show('تم نسخ الخطأ للمحافظة', ToastAndroid.SHORT);
  };

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <AlertTriangle size={48} color="#FF3B30" />
            <Text style={styles.title}>عذراً، حدث خطأ غير متوقع</Text>
          </View>

          <ScrollView style={styles.errorContent}>
            <Text style={styles.errorText}>
              {this.state.error && this.state.error.toString()}
            </Text>
            <Text style={styles.stackText}>
              {this.state.error?.stack}
            </Text>
            {this.state.errorInfo && (
              <Text style={styles.stackText}>
                {this.state.errorInfo.componentStack}
              </Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.button, styles.copyButton]} onPress={this.copyToClipboard}>
              <Copy size={20} color="#fff" />
              <Text style={styles.buttonText}>نسخ تفاصيل الخطأ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={this.resetError}>
              <RefreshCcw size={20} color="#000" />
              <Text style={[styles.buttonText, { color: '#000' }]}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  header: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
  title: { fontSize: 22, color: '#000', marginTop: 16, textAlign: 'center', fontFamily: 'Cairo-Bold' },
  errorContent: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 12, padding: 16, marginBottom: 20 },
  errorText: { fontSize: 16, color: '#FF3B30', marginBottom: 12, fontFamily: 'Cairo-Bold', textAlign: 'left' },
  stackText: { fontSize: 12, color: '#333', fontFamily: 'monospace', textAlign: 'left' },
  footer: { gap: 12 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 10 },
  copyButton: { backgroundColor: '#000' },
  retryButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee' },
  buttonText: { fontSize: 16, color: '#fff', fontFamily: 'Cairo-Bold' }
});

export default ErrorBoundary;
