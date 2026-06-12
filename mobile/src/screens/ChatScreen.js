import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, DrawerLayoutAndroid, Modal, ToastAndroid, StatusBar, Image, Alert } from 'react-native';
import 'text-encoding-polyfill';
import { Menu, Send, Paperclip, Settings, Plus, User, Bot, Info, Cpu, X, HelpCircle } from 'lucide-react-native';
import * as db from '../database/db';
import * as ollama from '../api/ollama';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import { generateId } from '../utils/utils';
import { getDBConnection } from '../database/db';
import { useTheme } from '../utils/ThemeContext';
import { launchImageLibrary } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';

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
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState(null);
  const [newSessionTitle, setNewSessionTitle] = useState('');
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
    // Normalize image property for rendering
    const normalizedMsgs = msgs.map(m => ({
      ...m,
      image: m.image || (m.images && m.images.length > 0 ? m.images[0] : null)
    }));
    setMessages(normalizedMsgs);
    drawer.current?.closeDrawer();
  };

  const handleLongPressSession = (session) => {
    setSessionToEdit(session);
    setNewSessionTitle(session.title);
    drawer.current?.closeDrawer();
    setTimeout(() => setShowSessionModal(true), 200);
  };

  const deleteSession = async () => {
    if (!sessionToEdit) return;
    Alert.alert(
      'حذف المحادثة',
      'هل أنت متأكد من حذف هذه المحادثة وجميع رسائلها؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: async () => {
          const conn = await getDBConnection();
          await db.deleteSession(conn, sessionToEdit.id);
          setShowSessionModal(false);
          loadSessions();
          if (currentSessionId === sessionToEdit.id) {
            setMessages([]);
            setCurrentSessionId(null);
          }
        }}
      ]
    );
  };

  const renameSession = async () => {
    if (!sessionToEdit || !newSessionTitle.trim()) return;
    const conn = await getDBConnection();
    await db.updateSessionTitle(conn, sessionToEdit.id, newSessionTitle);
    setShowSessionModal(false);
    loadSessions();
  };

  const pickImage = () => {
    Alert.alert(
      'إرفاق ملف',
      'اختر نوع الملف المراد إرفاقه',
      [
        { text: 'صورة من الاستوديو', onPress: () => {
          launchImageLibrary({ mediaType: 'photo', includeBase64: true }, (response) => {
            if (response.didCancel || response.errorCode) return;
            if (response.assets && response.assets.length > 0) {
              setSelectedImage(response.assets[0]);
              setSelectedFile(null);
            }
          });
        }},
        { text: 'مستند (PDF, TXT, ...)', onPress: async () => {
          try {
            const res = await DocumentPicker.pickSingle({
              type: [DocumentPicker.types.pdf, DocumentPicker.types.plainText, DocumentPicker.types.allFiles],
            });
            setSelectedFile(res);
            setSelectedImage(null);
          } catch (err) {
            if (!DocumentPicker.isCancel(err)) console.log(err);
          }
        }},
        { text: 'إلغاء', style: 'cancel' }
      ]
    );
  };

  const sendMessage = async () => {
    if ((!inputText.trim() && !selectedImage && !selectedFile) || loading) return;

    let finalContent = inputText;
    if (selectedFile) {
      try {
        const fileContent = await RNFS.readFile(selectedFile.uri, 'utf8');
        finalContent += `\n\n[محتوى الملف ${selectedFile.name}]:\n${fileContent}`;
      } catch (e) {
        console.log("Error reading file", e);
        ToastAndroid.show("فشل قراءة الملف", ToastAndroid.SHORT);
      }
    }

    const userMsg = {
      id: generateId(),
      sessionId: currentSessionId,
      role: 'user',
      content: finalContent,
      image: selectedImage ? selectedImage.uri : null,
      fileName: selectedFile ? selectedFile.name : null
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = inputText;
    const currentImage = selectedImage;
    setInputText('');
    setSelectedImage(null);
    setSelectedFile(null);
    setLoading(true);

    const conn = await getDBConnection();
    // In ChatScreen, 'image' property in message object stores the URI for local display.
    // The database column is 'images' (plural) and stores JSON.
    await db.addMessage(conn, userMsg.id, userMsg.sessionId, userMsg.role, userMsg.content, userMsg.image ? [userMsg.image] : null);

    try {
      const chatHistory = messages.concat(userMsg).map(m => {
        const msgObj = { role: m.role, content: m.content };
        if (m.id === userMsg.id && currentImage && currentImage.base64) {
          msgObj.images = [currentImage.base64];
        }
        return msgObj;
      });

      const streamingSetting = await AsyncStorage.getItem('use_streaming');
      const useStreaming = streamingSetting === null ? true : streamingSetting === 'true';

      const assistantId = generateId();
      let assistantContent = "";

      if (useStreaming) {
        const assistantMsg = { id: assistantId, sessionId: currentSessionId, role: 'assistant', content: "" };
        setMessages(prev => [...prev, assistantMsg]);

        let leftover = '';
        await ollama.chat(selectedModel, chatHistory, {}, [], true, (chunk) => {
          const chunkStr = typeof chunk === 'string' ? chunk : String.fromCharCode.apply(null, chunk);
          const lines = (leftover + chunkStr).split('\n');
          leftover = lines.pop();

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const json = JSON.parse(line);
              if (json.message && json.message.content) {
                assistantContent += json.message.content;
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: assistantContent } : m
                ));
              }
            } catch (err) {}
          }
        });

        if (leftover.trim()) {
          try {
            const json = JSON.parse(leftover);
            if (json.message && json.message.content) {
              assistantContent += json.message.content;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m));
            }
          } catch (e) {}
        }
      } else {
        const response = await ollama.chat(selectedModel, chatHistory, {}, [], false);
        assistantContent = response.data.message.content;
        const assistantMsg = { id: assistantId, sessionId: currentSessionId, role: 'assistant', content: assistantContent };
        setMessages(prev => [...prev, assistantMsg]);
      }

      await db.addMessage(conn, assistantId, currentSessionId, 'assistant', assistantContent);
    } catch (e) {
      console.error("Chat Error:", e);
      let detailedError = "عذراً، حدث خطأ أثناء الاتصال بـ Ollama. تأكد من تشغيل السيرفر وصحة الرابط.\n\n";

      if (e.message) {
        detailedError += `**خطأ:** ${e.message}\n`;
      }

      if (e.response) {
        detailedError += `**الحالة:** ${e.response.status}\n`;
        detailedError += `**التفاصيل:** ${JSON.stringify(e.response.data)}\n`;
      } else if (e.stack) {
        detailedError += `**المسار (Stack):**\n\`\`\`\n${e.stack}\n\`\`\``;
      }

      const errorMsg = { id: generateId(), sessionId: currentSessionId, role: 'assistant', content: detailedError };
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
      {item.image && <Image source={{ uri: item.image }} style={styles.messageImage} resizeMode="contain" />}
      {item.fileName && (
        <View style={[styles.fileAttachment, {backgroundColor: colors.surface}]}>
          <Info size={16} color={colors.textSecondary} />
          <Text style={[styles.fileNameText, {color: colors.textSecondary}]}>{item.fileName}</Text>
        </View>
      )}
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
        <TouchableOpacity
          style={[styles.sessionItem, currentSessionId === item.id && {backgroundColor: colors.surface}, {borderBottomColor: colors.border}]}
          onPress={() => selectSession(item.id)}
          onLongPress={() => handleLongPressSession(item)}
        >
          <Text style={[styles.sessionText, {color: colors.text}]} numberOfLines={1}>{item.title}</Text>
        </TouchableOpacity>
      )} />
      <TouchableOpacity style={[styles.settingsBtn, {borderTopColor: colors.border}]} onPress={() => { drawer.current?.closeDrawer(); navigation.navigate('ModelManager'); }}>
        <Cpu size={20} color={colors.text} /><Text style={[styles.settingsBtnText, {color: colors.text}]}>الذكاء الاصطناعي المحلي (Off-line)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingsBtn} onPress={() => { drawer.current?.closeDrawer(); navigation.navigate('Guide'); }}>
        <HelpCircle size={20} color={colors.text} /><Text style={[styles.settingsBtnText, {color: colors.text}]}>دليل التشغيل</Text>
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

        <Modal visible={showSessionModal} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSessionModal(false)}>
            <View style={[styles.pickerModal, {backgroundColor: colors.background}]}>
              <Text style={[styles.modalTitle, {color: colors.text}]}>تعديل المحادثة</Text>
              <TextInput
                style={[styles.input, {color: colors.text, borderColor: colors.border, marginBottom: 20}]}
                value={newSessionTitle}
                onChangeText={setNewSessionTitle}
                placeholder="اسم المحادثة"
              />
              <View style={{flexDirection: 'row-reverse', justifyContent: 'space-between'}}>
                <TouchableOpacity style={[styles.modalActionBtn, {backgroundColor: colors.primary}]} onPress={renameSession}>
                  <Text style={{color: colors.primaryContrast, fontFamily: 'Cairo-Bold'}}>حفظ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalActionBtn, {backgroundColor: colors.error}]} onPress={deleteSession}>
                  <Text style={{color: 'white', fontFamily: 'Cairo-Bold'}}>حذف</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowSessionModal(false)}>
                <Text style={[styles.closeModalText, {color: colors.textSecondary}]}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <FlatList data={messages} keyExtractor={item => item.id} renderItem={renderMessage} contentContainerStyle={styles.messageList} />
        {loading && <View style={styles.loadingContainer}><ActivityIndicator color={colors.text} /><Text style={[styles.loadingText, {color: colors.textSecondary}]}>جاري التفكير...</Text></View>}

        {selectedImage && (
          <View style={[styles.imagePreviewContainer, {backgroundColor: colors.surface, borderTopColor: colors.border}]}>
            <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
              <X size={16} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {selectedFile && (
          <View style={[styles.imagePreviewContainer, {backgroundColor: colors.surface, borderTopColor: colors.border}]}>
            <View style={styles.filePreviewIcon}>
              <Paperclip size={24} color={colors.text} />
            </View>
            <Text style={[styles.filePreviewName, {color: colors.text}]} numberOfLines={1}>{selectedFile.name}</Text>
            <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedFile(null)}>
              <X size={16} color="white" />
            </TouchableOpacity>
          </View>
        )}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.inputContainer, {borderTopColor: colors.border}]}>
          <TouchableOpacity style={styles.iconBtn} onPress={pickImage}><Paperclip size={24} color={colors.textSecondary} /></TouchableOpacity>
          <TextInput style={[styles.input, {color: colors.text}]} value={inputText} onChangeText={setInputText} placeholder="اكتب رسالتك هنا..." placeholderTextColor={colors.textSecondary} multiline />
          <TouchableOpacity style={[styles.sendBtn, {backgroundColor: colors.primary}, (!inputText.trim() && !selectedImage && !selectedFile) && {backgroundColor: colors.border}]} onPress={sendMessage} disabled={(!inputText.trim() && !selectedImage && !selectedFile) || loading}>
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
  modalActionBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, flex: 0.45, alignItems: 'center' },
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
  messageImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 8 },
  roleText: { fontSize: 12, marginHorizontal: 4, fontFamily: 'Cairo-Medium' },
  imagePreviewContainer: { padding: 10, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1 },
  imagePreview: { width: 60, height: 60, borderRadius: 8 },
  filePreviewIcon: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  filePreviewName: { flex: 1, marginLeft: 12, fontFamily: 'Cairo-Regular' },
  fileAttachment: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, marginBottom: 8 },
  fileNameText: { fontSize: 12, marginLeft: 8, fontFamily: 'Cairo-Medium' },
  removeImageBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 2 },
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
