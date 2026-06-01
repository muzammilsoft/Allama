import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Linking, ScrollView, StatusBar } from 'react-native';
import { ChevronLeft, Send, Globe, User, Info, Link } from 'lucide-react-native';
import { useTheme } from '../utils/ThemeContext';

const AboutScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={[styles.header, {borderBottomColor: colors.border}]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>عن التطبيق والمطور</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.projectSection}>
          <View style={[styles.projectIcon, {backgroundColor: colors.primary}]}>
            <Text style={[styles.projectIconText, {color: colors.primaryContrast}]}>؏</Text>
          </View>
          <Text style={[styles.projectName, {color: colors.text}]}>علّامة (Allama)</Text>
          <Text style={[styles.projectDesc, {color: colors.text}]}>
            علّامة واجهة استخدام لنماذج الذكاء الاصطناعي بدون اتصال انترنت للهاتف باعتمادها على Ollama، المشروع مفتوح المصدر و يمكن للجميع المساهمة في تطويره.
          </Text>
        </View>

        <View style={[styles.divider, {backgroundColor: colors.border}]} />

        <View style={styles.profileSection}>
          <User size={40} color={colors.primary} />
          <Text style={[styles.name, {color: colors.text}]}>المطور: KG</Text>
          <Text style={[styles.bio, {color: colors.textSecondary}]}>مطور تطبيقات و تطبيقات ويب مهتم بأتمتة الذكاء الاصطناعي.</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>تواصل معي</Text>

          <View style={styles.socialRow}>
            <TouchableOpacity style={[styles.socialIcon, {backgroundColor: colors.surface}]} onPress={() => Linking.openURL('https://github.com/muzammilsoft')}>
              <Link size={24} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.socialIcon, {backgroundColor: colors.surface}]} onPress={() => Linking.openURL('https://www.facebook.com/khartoum.ghoul.alt')}>
              <Link size={24} color="#1877F2" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.socialIcon, {backgroundColor: colors.surface}]} onPress={() => Linking.openURL('https://t.me/khartoumGhoul')}>
              <Send size={24} color="#0088cc" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, {color: colors.textSecondary}]}>علّامة v1.4.0</Text>
          <Text style={[styles.footerSubText, {color: colors.textSecondary, opacity: 0.6}]}>صنع بحب لتسهيل استخدام الذكاء الاصطناعي</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontFamily: 'Cairo-Bold' },
  content: { padding: 24, alignItems: 'center' },
  projectSection: { alignItems: 'center', marginBottom: 20 },
  projectIcon: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  projectIconText: { fontSize: 40, fontFamily: 'Cairo-Bold' },
  projectName: { fontSize: 22, marginBottom: 8, fontFamily: 'Cairo-Bold' },
  projectDesc: { fontSize: 14, textAlign: 'center', fontFamily: 'Cairo-Regular', lineHeight: 22 },
  divider: { width: '100%', height: 1, marginVertical: 24 },
  profileSection: { alignItems: 'center', marginBottom: 30 },
  name: { fontSize: 20, marginTop: 10, marginBottom: 8, fontFamily: 'Cairo-Bold' },
  bio: { fontSize: 14, textAlign: 'center', fontFamily: 'Cairo-Regular', paddingHorizontal: 10 },
  infoSection: { width: '100%', marginBottom: 40 },
  sectionTitle: { fontSize: 18, marginBottom: 20, textAlign: 'center', fontFamily: 'Cairo-Bold' },
  socialRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  socialIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginHorizontal: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41 },
  footer: { alignItems: 'center', marginTop: 20 },
  footerText: { fontSize: 14, fontFamily: 'Cairo-Bold' },
  footerSubText: { fontSize: 12, marginTop: 4, fontFamily: 'Cairo-Regular' }
});

export default AboutScreen;
