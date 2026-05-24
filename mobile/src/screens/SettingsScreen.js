import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Save, Moon, Sun } from 'lucide-react-native';
import { useTheme } from '../utils/ThemeContext';

const SettingsScreen = ({ navigation }) => {
  const { colors, toggleTheme, theme, isDark } = useTheme();
  const [ollamaUrl, setOllamaUrl] = useState('');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const url = await AsyncStorage.getItem('ollama_url');
    setOllamaUrl(url || 'http://localhost:11434');
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('ollama_url', ollamaUrl);
      Alert.alert('تم الحفظ', 'تم حفظ الإعدادات بنجاح');
    }
    catch (e) { Alert.alert('خطأ', 'فشل حفظ الإعدادات'); }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.header, {borderBottomColor: colors.border}]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>الإعدادات</Text>
        <TouchableOpacity onPress={saveSettings}>
          <Save size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>المظهر</Text>
          <View style={[styles.settingRow, {backgroundColor: colors.surface}]}>
            <View style={styles.settingLabelGroup}>
              {isDark ? <Moon size={20} color={colors.text} /> : <Sun size={20} color={colors.text} />}
              <Text style={[styles.settingLabel, {color: colors.text}]}>الوضع الليلي</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#ccc', true: '#000' }}
              thumbColor={isDark ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>إعدادات الخادم</Text>
          <Text style={[styles.label, {color: colors.textSecondary}]}>رابط خادم Ollama</Text>
          <TextInput
            style={[styles.input, {color: colors.text, borderColor: colors.border, backgroundColor: colors.surface}]}
            value={ollamaUrl}
            onChangeText={setOllamaUrl}
            placeholder="http://192.168.1.x:11434"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            keyboardType="url"
          />
          <Text style={[styles.hint, {color: colors.textSecondary}]}>إذا كنت تستخدم Termux على نفس الهاتف، فاستخدم http://localhost:11434.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontFamily: 'Cairo-Bold' },
  content: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, marginBottom: 16, textAlign: 'right', fontFamily: 'Cairo-Bold' },
  label: { fontSize: 14, marginBottom: 8, textAlign: 'right', fontFamily: 'Cairo-Medium' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, textAlign: 'left', fontFamily: 'Cairo-Regular' },
  hint: { fontSize: 12, marginTop: 8, textAlign: 'right', fontFamily: 'Cairo-Regular' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12 },
  settingLabelGroup: { flexDirection: 'row', alignItems: 'center' },
  settingLabel: { fontSize: 16, marginLeft: 12, fontFamily: 'Cairo-Medium' }
});

export default SettingsScreen;
