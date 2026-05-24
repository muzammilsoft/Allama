import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, Alert, AppState, StatusBar } from 'react-native';
import { ChevronLeft, Send, User, Bot, Trash2 } from 'lucide-react-native';
import { initLlama, LlamaContext } from 'llama.rn';
import { ModelService } from '../services/ModelService';
import Markdown from 'react-native-markdown-display';
import { generateId } from '../utils/utils';
import { useTheme } from '../utils/ThemeContext';

const LocalChatScreen = ({ route, navigation }: any) => {
  const { colors, isDark } = useTheme();
  const { modelFile } = route.params;
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLlamaReady, setIsLlamaReady] = useState(false);
  const [speed, setSpeed] = useState<number | null>(null);
  const contextRef = useRef<LlamaContext | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    setupLlama();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        releaseContext();
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        setupLlama();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      releaseContext();
    };
  }, []);

  const setupLlama = async () => {
    try {
      setLoading(true);
      const modelPath = ModelService.getModelPath(modelFile);

      await ModelService.init();

      contextRef.current = await initLlama({
        model: modelPath,
        use_mlock: true,
        n_ctx: 1024,
        n_gpu_layers: 99, // Enable Vulkan/GPU acceleration
        n_threads: 4,
      });

      setIsLlamaReady(true);
      setLoading(false);
    } catch (error: any) {
      console.error("Llama Init Error:", error);
      Alert.alert('خطأ في تحميل المحرك', `فشل تحميل النموذج: ${error.message || 'خطأ غير معروف'}`);
      navigation.goBack();
    }
  };

  const releaseContext = async () => {
    if (contextRef.current) {
      await contextRef.current.release();
      contextRef.current = null;
      setIsLlamaReady(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !isLlamaReady || loading) return;

    const userMsg = { id: generateId(), role: 'user', content: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);
    setSpeed(null);

    try {
      let assistantMsgContent = '';
      const assistantId = generateId();
      let tokenCount = 0;
      const startTime = Date.now();

      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      const prompt = messages.slice(-4).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') + `\nUser: ${inputText}\nAssistant:`;

      await contextRef.current?.completion(
        {
          prompt: prompt,
          n_predict: 512,
          temperature: 0.7,
          top_p: 0.9,
          stop: ['User:', '\nAssistant:', '</s>'],
        },
        (data) => {
          tokenCount++;
          assistantMsgContent += data.token;
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, content: assistantMsgContent } : m
          ));

          if (tokenCount % 5 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            setSpeed(parseFloat((tokenCount / elapsed).toFixed(2)));
          }
        }
      );
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء توليد الرد.');
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const renderMessage = ({ item }: { item: any }) => (
    <View style={[
      styles.messageBubble,
      item.role === 'user' ?
        {...styles.userBubble, backgroundColor: colors.bubbleUser} :
        {...styles.assistantBubble, backgroundColor: colors.bubbleAssistant, borderColor: colors.border}
    ]}>
      <View style={styles.messageHeader}>
        {item.role === 'user' ? <User size={16} color={colors.textSecondary} /> : <Bot size={16} color={colors.primary} />}
        <Text style={[styles.roleText, {color: colors.textSecondary}]}>{item.role === 'user' ? 'أنت' : 'علّامة (محلي)'}</Text>
      </View>
      <Markdown style={getMarkdownStyles(colors)}>{item.content}</Markdown>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={[styles.header, {borderBottomColor: colors.border}]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, {color: colors.text}]}>الدردشة المحلية</Text>
          <Text style={[styles.headerSub, {color: colors.textSecondary}]}>{modelFile}</Text>
        </View>
        <TouchableOpacity onPress={clearChat}>
          <Trash2 size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        ref={(ref) => ref?.scrollToEnd()}
      />

      {speed && (
        <View style={styles.speedIndicator}>
          <Text style={[styles.speedText, {color: colors.textSecondary}]}>السرعة: {speed} t/s</Text>
        </View>
      )}

      {loading && !isLlamaReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, {color: colors.text}]}>جاري تحميل النموذج في الذاكرة...</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.inputContainer, {borderTopColor: colors.border}]}>
        <TextInput
          style={[styles.input, {color: colors.text}]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="اكتب رسالتك هنا..."
          placeholderTextColor={colors.textSecondary}
          multiline
          editable={isLlamaReady && !loading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, {backgroundColor: colors.primary}, (!inputText.trim() || !isLlamaReady || loading) && {backgroundColor: colors.border}]}
          onPress={sendMessage}
          disabled={!inputText.trim() || !isLlamaReady || loading}
        >
          <Send size={20} color={colors.primaryContrast} />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Cairo-Bold' },
  headerSub: { fontSize: 10, fontFamily: 'Cairo-Regular' },
  messageList: { padding: 16 },
  messageBubble: { marginBottom: 16, maxWidth: '85%', padding: 12, borderRadius: 12 },
  userBubble: { alignSelf: 'flex-start' },
  assistantBubble: { alignSelf: 'flex-end', borderWidth: 1 },
  messageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  roleText: { fontSize: 12, marginHorizontal: 4, fontFamily: 'Cairo-Medium' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, borderTopWidth: 1 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, textAlign: 'right', fontFamily: 'Cairo-Regular' },
  sendBtn: { padding: 10, borderRadius: 20 },
  loadingOverlay: { position: 'absolute', top: 100, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: 'Cairo-Bold' },
  speedIndicator: { padding: 4, alignItems: 'center' },
  speedText: { fontSize: 10, fontFamily: 'Cairo-Regular' }
});

const getMarkdownStyles = (colors) => ({
  body: { textAlign: 'right', color: colors.text, fontFamily: 'Cairo-Regular' },
  paragraph: { fontSize: 16, lineHeight: 24, fontFamily: 'Cairo-Regular' },
  code_inline: { backgroundColor: colors.surface, borderRadius: 4, padding: 2, fontFamily: 'monospace', color: colors.text },
  code_block: { backgroundColor: colors.surface, borderRadius: 8, padding: 12, marginVertical: 10, fontFamily: 'monospace', color: colors.text }
});

export default LocalChatScreen;
