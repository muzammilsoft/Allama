import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, DrawerLayoutAndroid, Modal, ToastAndroid, StatusBar } from 'react-native';
import { Menu, Send, Paperclip, Settings, Plus, User, Bot, Info, Cpu } from 'lucide-react-native';
import * as db from '../database/db';
import * as ollama from '../api/ollama';
import Markdown from 'react-native-markdown-display';
import { generateId } from '../utils/utils';
import { getDBConnection } from '../database/db';
import { useTheme } from '../utils/ThemeContext';

const ChatScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState([]);
  const [showModelPicker, setShowModelPicker] = useState(false);
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
      setModels(data);
      if (data.length > 0) {
        if (!selectedModel) setSelectedModel(data[0].name);
      }
    } catch (e) {
      console.log("Error loading models", e);
    }
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
    <View style={[
      styles.messageBubble,
      item.role === 'user' ?
        {...styles.userBubble, backgroundColor: colors.bubbleUser} :
        {...styles.assistantBubble, backgroundColor: colors.bubbleAssistant, borderColor: colors.border}
    ]}>
      <View style={styles.messageHeader}>
        {item.role === 'user' ? <User size={16} color={colors.textSecondary} /> : <Bot size={16} color={colors.primary} />}
        <Text style={[styles.roleText, {color: colors.textSecondary}]}>{item.role === 'user' ? 'أنت' : 'علّامة'}</Text>
      </View>
      <Markdown style={getMarkdownStyles(colors)}>{item.content}</Markdown>
    </View>
  );

  const navigationView = () => (
    <View style={[styles.drawerContainer, {backgroundColor: colors.background}]}>
      <Text style={[styles.drawerTitle, {color: colors.text}]}>المحادثات</Text>
      <TouchableOpacity style={[styles.newChatBtn, {backgroundColor: colors.primary}]} onPress={createNewSession}>
        <Plus size={20} color={colors.primaryContrast} /><Text style={[styles.newChatText, {color: colors.primaryContrast}]}>محادثة جديدة</Text>
      </TouchableOpacity>
      <FlatList data={sessions} keyExtractor={item => item.id} renderItem={({ item }) => (
        <TouchableOpacity style={[styles.sessionItem, currentSessionId === item.id && {backgroundColor: colors.surface}, {borderBottomColor: colors.border}]} onPress={() => selectSession(item.id)}>
          <Text style={[styles.sessionText, {color: colors.text}]} numberOfLines={1}>{item.title}</Text>
        </TouchableOpacity>
      )} />
      <TouchableOpacity style={[styles.settingsBtn, {borderTopColor: colors.border}]} onPress={() => { drawer.current?.closeDrawer(); navigation.navigate('ModelManager'); }}>
        <Cpu size={20} color={colors.text} /><Text style={[styles.settingsBtnText, {color: colors.text}]}>الذكاء الاصطناعي المحلي (Off-line)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingsBtn} onPress={() => { drawer.current?.closeDrawer(); navigation.navigate('About'); }}>
        <Info size={20} color={colors.text} /><Text style={[styles.settingsBtnText, {color: colors.text}]}>عن المطور</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingsBtn} onPress={() => { drawer.current?.closeDrawer(); navigation.navigate('Settings'); }}>
        <Settings size={20} color={colors.text} /><Text style={[styles.settingsBtnText, {color: colors.text}]}>الإعدادات</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <DrawerLayoutAndroid ref={drawer} drawerWidth={300} drawerPosition="right" renderNavigationView={navigationView}>
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <View style={[styles.header, {borderBottomColor: colors.border}]}>
          <TouchableOpacity onPress={() => drawer.current?.openDrawer()}><Menu size={24} color={colors.text} /></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowModelPicker(true)}>
            <Text style={[styles.headerTitle, {color: colors.text}]}>{selectedModel || 'علّامة'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AgentStudio')}><Bot size={24} color={colors.text} /></TouchableOpacity>
        </View>

        <Modal visible={showModelPicker} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowModelPicker(false)}>
            <View style={[styles.pickerModal, {backgroundColor: colors.background}]}>
              <Text style={[styles.modalTitle, {color: colors.text}]}>اختر النموذج</Text>
              <FlatList data={models} keyExtractor={item => item.name} renderItem={({ item }) => (
                <TouchableOpacity style={[styles.modelItem, selectedModel === item.name && {backgroundColor: colors.surface}, {borderBottomColor: colors.border}]} onPress={() => { setSelectedModel(item.name); setShowModelPicker(false); }}>
                  <Text style={[styles.modelText, {color: colors.textSecondary}, selectedModel === item.name && {color: colors.text, fontFamily: 'Cairo-Bold'}]}>{item.name}</Text>
                </TouchableOpacity>
              )} />
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowModelPicker(false)}>
                <Text style={[styles.closeModalText, {color: colors.primary}]}>إغلاق</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
        <FlatList data={messages} keyExtractor={item => item.id} renderItem={renderMessage} contentContainerStyle={styles.messageList} />
        {loading && <View style={styles.loadingContainer}><ActivityIndicator color={colors.text} /><Text style={[styles.loadingText, {color: colors.textSecondary}]}>جاري التفكير...</Text></View>}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.inputContainer, {borderTopColor: colors.border}]}>
          <TouchableOpacity style={styles.iconBtn}><Paperclip size={24} color={colors.textSecondary} /></TouchableOpacity>
          <TextInput style={[styles.input, {color: colors.text}]} value={inputText} onChangeText={setInputText} placeholder="اكتب رسالتك هنا..." placeholderTextColor={colors.textSecondary} multiline />
          <TouchableOpacity style={[styles.sendBtn, {backgroundColor: colors.primary}, !inputText.trim() && {backgroundColor: colors.border}]} onPress={sendMessage} disabled={!inputText.trim() || loading}>
            <Send size={20} color={colors.primaryContrast} />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </DrawerLayoutAndroid>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  pickerModal: { width: '80%', borderRadius: 12, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 18, marginBottom: 15, textAlign: 'center', fontFamily: 'Cairo-Bold' },
  modelItem: { padding: 15, borderBottomWidth: 1 },
  modelText: { fontSize: 16, textAlign: 'center', fontFamily: 'Cairo-Regular' },
  closeModalBtn: { marginTop: 15, padding: 10, alignItems: 'center' },
  closeModalText: { fontSize: 16, fontFamily: 'Cairo-Bold' },
  headerTitle: { fontSize: 22, letterSpacing: -0.5, fontFamily: 'Cairo-Bold' },
  messageList: { padding: 16 },
  messageBubble: { marginBottom: 16, maxWidth: '85%', padding: 12, borderRadius: 12 },
  userBubble: { alignSelf: 'flex-start' },
  assistantBubble: { alignSelf: 'flex-end', borderWidth: 1 },
  messageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  roleText: { fontSize: 12, marginHorizontal: 4, fontFamily: 'Cairo-Medium' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, borderTopWidth: 1 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, textAlign: 'right', fontFamily: 'Cairo-Regular' },
  iconBtn: { padding: 8 },
  sendBtn: { padding: 10, borderRadius: 20 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8 },
  loadingText: { marginLeft: 8, fontSize: 14, fontFamily: 'Cairo-Regular' },
  drawerContainer: { flex: 1, padding: 16 },
  drawerTitle: { fontSize: 24, marginBottom: 20, textAlign: 'right', fontFamily: 'Cairo-Bold' },
  newChatBtn: { flexDirection: 'row', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  newChatText: { marginHorizontal: 8, fontFamily: 'Cairo-Bold' },
  sessionItem: { padding: 12, borderBottomWidth: 1 },
  sessionText: { fontSize: 16, textAlign: 'right', fontFamily: 'Cairo-Regular' },
  settingsBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, marginTop: 'auto' },
  settingsBtnText: { fontSize: 16, marginHorizontal: 12, fontFamily: 'Cairo-Medium' }
});

const getMarkdownStyles = (colors) => ({
  body: { textAlign: 'right', color: colors.text, fontFamily: 'Cairo-Regular' },
  paragraph: { fontSize: 16, lineHeight: 24, fontFamily: 'Cairo-Regular' },
  code_inline: { backgroundColor: colors.surface, borderRadius: 4, padding: 2, fontFamily: 'monospace', color: colors.text },
  code_block: { backgroundColor: colors.surface, borderRadius: 8, padding: 12, marginVertical: 10, fontFamily: 'monospace', color: colors.text }
});

export default ChatScreen;
