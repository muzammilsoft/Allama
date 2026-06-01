import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, StatusBar, Dimensions } from 'react-native';
import { ChevronLeft, HelpCircle } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../utils/ThemeContext';

const guideMarkdown = `
# دليل استخدام علّامة 🤖

للحصول على أفضل تجربة، يتطلب "علّامة" وجود خادم **Ollama** يعمل في الخلفية. الخيار الأفضل لمستخدمي الأندرويد هو استخدام **Termux**.

## 🛠️ المتطلبات الأساسية
يجب تثبيت تطبيق **Termux** من متجر F-Droid (لا ينصح بنسخة Play Store لأنها قديمة).

## 🚀 خطوات التشغيل (في Termux)

### 1. تحديث المستودعات
افتح Termux واكتب الأمر التالي:
\`\`\`bash
pkg update && pkg upgrade
\`\`\`

### 2. تثبيت Node.js
يعد Node.js ضرورياً لتشغيل بعض الأدوات:
\`\`\`bash
pkg install nodejs
\`\`\`

### 3. تثبيت Ollama
يمكنك تثبيت Ollama بسهولة عبر npm:
\`\`\`bash
npm install -g ollama
\`\`\`

### 4. تشغيل خادم Ollama
لبدء تشغيل الخادم، اكتب:
\`\`\`bash
ollama serve
\`\`\`
*ملاحظة: يجب ترك هذه النافذة مفتوحة أو تشغيلها في الخلفية.*

### 5. تحميل النماذج
في نافذة جديدة (أو بعد إيقاف الخادم مؤقتاً)، يمكنك تحميل نموذج (مثلاً llama3) عبر:
\`\`\`bash
ollama run llama3
\`\`\`

## 🔗 الربط مع التطبيق
بمجرد تشغيل الخادم، سيقوم "علّامة" بالاتصال تلقائياً عبر \`http://localhost:11434\`. يمكنك تغيير هذا الرابط من الإعدادات إذا كنت تستخدم خادماً خارجياً.

---
**استمتع بتجربة ذكاء اصطناعي محلية تماماً!**
`;

const GuideScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={[styles.header, {borderBottomColor: colors.border}]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>دليل التشغيل</Text>
        <HelpCircle size={24} color={colors.text} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Markdown style={getMarkdownStyles(colors)}>
          {guideMarkdown}
        </Markdown>
      </ScrollView>
    </SafeAreaView>
  );
};

const getMarkdownStyles = (colors) => ({
  body: { color: colors.text, textAlign: 'right', fontFamily: 'Cairo-Regular' },
  heading1: { color: colors.primary, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, marginBottom: 20, fontFamily: 'Cairo-Bold' },
  heading2: { color: colors.text, marginTop: 20, marginBottom: 10, fontFamily: 'Cairo-Bold' },
  code_inline: { backgroundColor: colors.surface, color: colors.primary, padding: 4, borderRadius: 4, fontFamily: 'monospace' },
  code_block: { backgroundColor: colors.surface, color: colors.text, padding: 16, borderRadius: 8, marginVertical: 10, fontFamily: 'monospace' },
  paragraph: { fontSize: 16, lineHeight: 24, marginBottom: 10, fontFamily: 'Cairo-Regular' },
  strong: { fontFamily: 'Cairo-Bold' }
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontFamily: 'Cairo-Bold' },
  content: { padding: 20 }
});

export default GuideScreen;
