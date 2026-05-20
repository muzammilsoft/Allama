import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Save } from 'lucide-react-native';
const SettingsScreen = ({ navigation }) => {
  const [ollamaUrl, setOllamaUrl] = useState('');
  useEffect(() => { loadSettings(); }, []);
  const loadSettings = async () => { const url = await AsyncStorage.getItem('ollama_url'); setOllamaUrl(url || 'http://localhost:11434'); };
  const saveSettings = async () => {
    try { await AsyncStorage.setItem('ollama_url', ollamaUrl); Alert.alert('تم الحفظ', 'تم حفظ الإعدادات بنجاح'); }
    catch (e) { Alert.alert('خطأ', 'فشل حفظ الإعدادات'); }
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ChevronLeft size={24} color="#000" /></TouchableOpacity>
        <Text style={styles.headerTitle}>الإعدادات</Text>
        <TouchableOpacity onPress={saveSettings}><Save size={24} color="#000" /></TouchableOpacity>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>إعدادات الخادم</Text>
          <Text style={styles.label}>رابط خادم Ollama</Text>
          <TextInput style={styles.input} value={ollamaUrl} onChangeText={setOllamaUrl} placeholder="http://192.168.1.x:11434" autoCapitalize="none" keyboardType="url" />
          <Text style={styles.hint}>إذا كنت تستخدم Termux على نفس الهاتف، فاستخدم http://localhost:11434.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  content: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'right', color: '#000' },
  label: { fontSize: 14, color: '#666', marginBottom: 8, textAlign: 'right' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, textAlign: 'left', color: '#000' },
  hint: { fontSize: 12, color: '#999', marginTop: 8, textAlign: 'right' }
});
export default SettingsScreen;
