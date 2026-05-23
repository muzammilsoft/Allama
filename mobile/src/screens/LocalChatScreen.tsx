import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, Alert, AppState } from 'react-native';
import { ChevronLeft, Send, User, Bot, Trash2 } from 'lucide-react-native';
import { initLlama, LlamaContext } from 'llama.rn';
import { ModelService } from '../services/ModelService';
import Markdown from 'react-native-markdown-display';
import { generateId } from '../utils/utils';

const LocalChatScreen = ({ route, navigation }: any) => {
  const { modelFile } = route.params;
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLlamaReady, setIsLlamaReady] = useState(false);
  const contextRef = useRef<LlamaContext | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    setupLlama();

    // مراقبة حالة التطبيق لإيقاف الـ context في الخلفية
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        console.log('App in background, releasing llama context');
        releaseContext();
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App back to active, re-initializing llama');
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

      // llama.rn 0.9.3 syntax (Old Architecture)
      contextRef.current = await initLlama({
        model: modelPath,
        use_mlock: true,
        n_ctx: 2048,
        n_gpu_layers: 99, // 99 means use GPU as much as possible in 0.9.x
      });

      setIsLlamaReady(true);
      setLoading(false);
    } catch (error) {
      console.error(error);
      Alert.alert('خطأ', 'فشل تحميل النموذج. قد يكون جهازك غير قادر على تشغيله.');
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

    try {
      let assistantMsgContent = '';
      const assistantId = generateId();

      // إضافة فقاعة فارغة للرد قبل البدء
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      await contextRef.current?.completion(
        {
          prompt: `User: ${inputText}\nAssistant:`,
          n_predict: 512,
          stop: ['User:', '\nAssistant:'],
        },
        (data) => {
          assistantMsgContent += data.token;
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, content: assistantMsgContent } : m
          ));
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
    <View style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
      <View style={styles.messageHeader}>
        {item.role === 'user' ? <User size={16} color="#666" /> : <Bot size={16} color="#000" />}
        <Text style={styles.roleText}>{item.role === 'user' ? 'أنت' : 'علّامة (محلي)'}</Text>
      </View>
      <Markdown style={markdownStyles}>{item.content}</Markdown>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>الدردشة المحلية</Text>
          <Text style={styles.headerSub}>{modelFile}</Text>
        </View>
        <TouchableOpacity onPress={clearChat}>
          <Trash2 size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        ref={(ref) => ref?.scrollToEnd()}
      />

      {loading && !isLlamaReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>جاري تحميل النموذج في الذاكرة...</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="اكتب رسالتك هنا..."
          multiline
          editable={isLlamaReady && !loading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || !isLlamaReady || loading) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || !isLlamaReady || loading}
        >
          <Send size={20} color="#fff" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  headerSub: { fontSize: 10, color: '#666' },
  messageList: { padding: 16 },
  messageBubble: { marginBottom: 16, maxWidth: '85%', padding: 12, borderRadius: 12 },
  userBubble: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0' },
  assistantBubble: { alignSelf: 'flex-end', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee' },
  messageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  roleText: { fontSize: 12, color: '#666', marginHorizontal: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, textAlign: 'right', color: '#000' },
  sendBtn: { backgroundColor: '#000', padding: 10, borderRadius: 20 },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  loadingOverlay: { position: 'absolute', top: 100, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#000', fontWeight: 'bold' }
});

const markdownStyles = {
  body: { textAlign: 'right', color: '#333' },
  paragraph: { fontSize: 16, lineHeight: 24 },
  code_inline: { backgroundColor: '#f0f0f0', borderRadius: 4, padding: 2, fontFamily: 'monospace' },
  code_block: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, marginVertical: 10, fontFamily: 'monospace' }
};

export default LocalChatScreen;
