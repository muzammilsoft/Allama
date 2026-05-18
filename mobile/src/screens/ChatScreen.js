import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, DrawerLayoutAndroid } from 'react-native';
import { Menu, Send, Paperclip, Settings, Plus, User, Bot } from 'lucide-react-native';
import * as db from '../database/db';
import * as ollama from '../api/ollama';
import Markdown from 'react-native-markdown-display';
import { generateId } from '../utils/utils';
import { getDBConnection } from '../database/db';

const ChatScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [selectedModel, setSelectedModel] = useState('');
  const drawer = useRef(null);

  useEffect(() => { loadSessions(); loadModels(); }, []);

  const loadSessions = async () => {
    const conn = await getDBConnection();
    const data = await db.getSessions(conn);
    setSessions(data);
    if (data.length > 0 && !currentSessionId) selectSession(data[0].id);
    else if (data.length === 0) createNewSession();
  };

  const loadModels = async () => {
    try {
      const data = await ollama.listModels();
      if (data.length > 0) setSelectedModel(data[0].name);
    } catch (e) { console.log("Error loading models", e); }
  };

  const createNewSession = async () => {
    const id = generateId();
    const conn = await getDBConnection();
    await db.createSession(conn, id, "محادثة جديدة");
    setCurrentSessionId(id);
    setMessages([]);
    loadSessions();
    drawer.current?.closeDrawer();
  };

  const selectSession = async (id) => {
    setCurrentSessionId(id);
    const conn = await getDBConnection();
    const msgs = await db.getMessages(conn, id);
    setMessages(msgs);
    drawer.current?.closeDrawer();
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;
    const userMsg = { id: generateId(), sessionId: currentSessionId, role: 'user', content: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);
    const conn = await getDBConnection();
    await db.addMessage(conn, userMsg.id, userMsg.sessionId, userMsg.role, userMsg.content);
    try {
      const chatHistory = messages.concat(userMsg).map(m => ({ role: m.role, content: m.content }));
      const response = await ollama.chat(selectedModel, chatHistory);
      const assistantMsg = { id: generateId(), sessionId: currentSessionId, role: 'assistant', content: response.data.message.content };
      setMessages(prev => [...prev, assistantMsg]);
      await db.addMessage(conn, assistantMsg.id, assistantMsg.sessionId, assistantMsg.role, assistantMsg.content);
    } catch (e) {
      const errorMsg = { id: generateId(), sessionId: currentSessionId, role: 'assistant', content: "عذراً، حدث خطأ أثناء الاتصال بـ Ollama." };
      setMessages(prev => [...prev, errorMsg]);
    } finally { setLoading(false); }
  };

  const renderMessage = ({ item }) => (
    <View style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
      <View style={styles.messageHeader}>
        {item.role === 'user' ? <User size={16} color="#666" /> : <Bot size={16} color="#000" />}
        <Text style={styles.roleText}>{item.role === 'user' ? 'أنت' : 'علّامة'}</Text>
      </View>
      <Markdown style={markdownStyles}>{item.content}</Markdown>
    </View>
  );

  const navigationView = (
    <View style={styles.drawerContainer}>
      <Text style={styles.drawerTitle}>المحادثات</Text>
      <TouchableOpacity style={styles.newChatBtn} onPress={createNewSession}>
        <Plus size={20} color="#fff" /><Text style={styles.newChatText}>محادثة جديدة</Text>
      </TouchableOpacity>
      <FlatList data={sessions} keyExtractor={item => item.id} renderItem={({ item }) => (
        <TouchableOpacity style={[styles.sessionItem, currentSessionId === item.id && styles.activeSession]} onPress={() => selectSession(item.id)}>
          <Text style={styles.sessionText} numberOfLines={1}>{item.title}</Text>
        </TouchableOpacity>
      )} />
      <TouchableOpacity style={styles.settingsBtn} onPress={() => { drawer.current?.closeDrawer(); navigation.navigate('Settings'); }}>
        <Settings size={20} color="#000" /><Text style={styles.settingsBtnText}>الإعدادات</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <DrawerLayoutAndroid ref={drawer} drawerWidth={300} drawerPosition="right" renderNavigationView={() => navigationView}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => drawer.current?.openDrawer()}><Menu size={24} color="#000" /></TouchableOpacity>
          <Text style={styles.headerTitle}>علّامة</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AgentStudio')}><Bot size={24} color="#000" /></TouchableOpacity>
        </View>
        <FlatList data={messages} keyExtractor={item => item.id} renderItem={renderMessage} contentContainerStyle={styles.messageList} />
        {loading && <View style={styles.loadingContainer}><ActivityIndicator color="#000" /><Text style={styles.loadingText}>جاري التفكير...</Text></View>}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inputContainer}>
          <TouchableOpacity style={styles.iconBtn}><Paperclip size={24} color="#666" /></TouchableOpacity>
          <TextInput style={styles.input} value={inputText} onChangeText={setInputText} placeholder="اكتب رسالتك هنا..." multiline />
          <TouchableOpacity style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!inputText.trim() || loading}>
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </DrawerLayoutAndroid>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  messageList: { padding: 16 },
  messageBubble: { marginBottom: 16, maxWidth: '85%', padding: 12, borderRadius: 12 },
  userBubble: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0' },
  assistantBubble: { alignSelf: 'flex-end', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee' },
  messageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  roleText: { fontSize: 12, color: '#666', marginHorizontal: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, textAlign: 'right' },
  iconBtn: { padding: 8 },
  sendBtn: { backgroundColor: '#000', padding: 10, borderRadius: 20 },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8 },
  loadingText: { marginLeft: 8, fontSize: 14, color: '#666' },
  drawerContainer: { flex: 1, backgroundColor: '#fff', padding: 16 },
  drawerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'right' },
  newChatBtn: { flexDirection: 'row', backgroundColor: '#000', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  newChatText: { color: '#fff', fontWeight: 'bold', marginHorizontal: 8 },
  sessionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  activeSession: { backgroundColor: '#f9f9f9' },
  sessionText: { fontSize: 16, textAlign: 'right' },
  settingsBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#eee', marginTop: 'auto' },
  settingsBtnText: { fontSize: 16, marginHorizontal: 12 }
});
const markdownStyles = { body: { textAlign: 'right' }, paragraph: { fontSize: 16, color: '#333' } };
export default ChatScreen;
