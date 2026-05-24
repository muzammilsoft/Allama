import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert, StatusBar } from 'react-native';
import { ChevronLeft, Plus, Trash2, Bot } from 'lucide-react-native';
import * as db from '../database/db';
import { getDBConnection } from '../database/db';
import { generateId } from '../utils/utils';
import { useTheme } from '../utils/ThemeContext';

const AgentStudioScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [agents, setAgents] = useState([]);
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');

  useEffect(() => { loadAgents(); }, []);

  const loadAgents = async () => {
    const conn = await getDBConnection();
    const data = await db.getAgents(conn);
    setAgents(data);
  };

  const createAgent = async () => {
    if (!name.trim()) return;
    const conn = await getDBConnection();
    const newAgent = { id: generateId(), name, icon: 'bot', systemPrompt, tools: [] };
    await db.saveAgent(conn, newAgent);
    setName(''); setSystemPrompt(''); loadAgents();
    Alert.alert('نجاح', 'تم إنشاء الوكيل بنجاح');
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={[styles.header, {borderBottomColor: colors.border}]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>استوديو الوكلاء</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.content}>
        <View style={[styles.form, {borderBottomColor: colors.border}]}>
          <Text style={[styles.label, {color: colors.textSecondary}]}>اسم الوكيل</Text>
          <TextInput
            style={[styles.input, {color: colors.text, borderColor: colors.border, backgroundColor: colors.surface}]}
            value={name}
            onChangeText={setName}
            placeholder="مثلاً: مساعد مبرمج"
            placeholderTextColor={colors.textSecondary}
            textAlign="right"
          />
          <Text style={[styles.label, {color: colors.textSecondary}]}>التعليمات البرمجية</Text>
          <TextInput
            style={[styles.input, {height: 100, color: colors.text, borderColor: colors.border, backgroundColor: colors.surface}]}
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            placeholder="أنت مساعد ذكي..."
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
            textAlign="right"
          />
          <TouchableOpacity style={[styles.createBtn, {backgroundColor: colors.primary}]} onPress={createAgent}>
            <Plus size={20} color={colors.primaryContrast} />
            <Text style={[styles.createBtnText, {color: colors.primaryContrast}]}>إنشاء وكيل جديد</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.sectionTitle, {color: colors.text}]}>الوكلاء الحاليون</Text>
        {agents.map(agent => (
          <View key={agent.id} style={[styles.agentCard, {backgroundColor: colors.surface, borderColor: colors.border}]}>
            <Bot size={32} color={colors.primary} />
            <View style={styles.agentInfo}>
              <Text style={[styles.agentName, {color: colors.text}]}>{agent.name}</Text>
              <Text style={[styles.agentPrompt, {color: colors.textSecondary}]} numberOfLines={1}>{agent.systemPrompt}</Text>
            </View>
            <TouchableOpacity onPress={() => {}}>
              <Trash2 size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontFamily: 'Cairo-Bold' },
  content: { padding: 16 },
  form: { marginBottom: 32, paddingBottom: 16, borderBottomWidth: 1 },
  label: { fontSize: 14, marginBottom: 8, textAlign: 'right', fontFamily: 'Cairo-Medium' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16, textAlign: 'right' },
  createBtn: { flexDirection: 'row', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { marginHorizontal: 8, fontFamily: 'Cairo-Bold' },
  sectionTitle: { fontSize: 18, marginBottom: 16, textAlign: 'right', fontFamily: 'Cairo-Bold' },
  agentCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderRadius: 12, marginBottom: 12 },
  agentInfo: { flex: 1, marginHorizontal: 16 },
  agentName: { fontSize: 16, textAlign: 'right', fontFamily: 'Cairo-Bold' },
  agentPrompt: { fontSize: 12, textAlign: 'right', fontFamily: 'Cairo-Regular' }
});

export default AgentStudioScreen;
