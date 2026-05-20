import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { ChevronLeft, Plus, Trash2, Bot } from 'lucide-react-native';
import * as db from '../database/db';
import { getDBConnection } from '../database/db';
import { generateId } from '../utils/utils';
const AgentStudioScreen = ({ navigation }) => {
  const [agents, setAgents] = useState([]);
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  useEffect(() => { loadAgents(); }, []);
  const loadAgents = async () => { const conn = await getDBConnection(); const data = await db.getAgents(conn); setAgents(data); };
  const createAgent = async () => {
    if (!name.trim()) return;
    const conn = await getDBConnection();
    const newAgent = { id: generateId(), name, icon: 'bot', systemPrompt, tools: [] };
    await db.saveAgent(conn, newAgent);
    setName(''); setSystemPrompt(''); loadAgents();
    Alert.alert('نجاح', 'تم إنشاء الوكيل بنجاح');
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ChevronLeft size={24} color="#000" /></TouchableOpacity>
        <Text style={styles.headerTitle}>استوديو الوكلاء</Text><View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>اسم الوكيل</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="مثلاً: مساعد مبرمج" textAlign="right" />
          <Text style={styles.label}>التعليمات البرمجية</Text>
          <TextInput style={[styles.input, { height: 100 }]} value={systemPrompt} onChangeText={setSystemPrompt} placeholder="أنت مساعد ذكي..." multiline textAlignVertical="top" textAlign="right" />
          <TouchableOpacity style={styles.createBtn} onPress={createAgent}><Plus size={20} color="#fff" /><Text style={styles.createBtnText}>إنشاء وكيل جديد</Text></TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>الوكلاء الحاليون</Text>
        {agents.map(agent => (
          <View key={agent.id} style={styles.agentCard}>
            <Bot size={32} color="#000" />
            <View style={styles.agentInfo}><Text style={styles.agentName}>{agent.name}</Text><Text style={styles.agentPrompt} numberOfLines={1}>{agent.systemPrompt}</Text></View>
            <TouchableOpacity onPress={() => {}}><Trash2 size={20} color="red" /></TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  content: { padding: 16 },
  form: { marginBottom: 32, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  label: { fontSize: 14, color: '#666', marginBottom: 8, textAlign: 'right' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16, textAlign: 'right', color: '#000' },
  createBtn: { flexDirection: 'row', backgroundColor: '#000', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { color: '#fff', fontWeight: 'bold', marginHorizontal: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'right', color: '#000' },
  agentCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderColor: '#eee', borderRadius: 12, marginBottom: 12 },
  agentInfo: { flex: 1, marginHorizontal: 16 },
  agentName: { fontSize: 16, fontWeight: 'bold', textAlign: 'right', color: '#000' },
  agentPrompt: { fontSize: 12, color: '#666', textAlign: 'right' }
});
export default AgentStudioScreen;
