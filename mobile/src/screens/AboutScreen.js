import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Linking, ScrollView, StatusBar } from 'react-native';
import { ChevronLeft, Github, Facebook, Mail } from 'lucide-react-native';
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
        <Text style={[styles.headerTitle, {color: colors.text}]}>عن المطور</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileSection}>
          <View style={[styles.avatar, {backgroundColor: colors.primary}]}>
            <Text style={[styles.avatarText, {color: colors.primaryContrast}]}>M</Text>
          </View>
          <Text style={[styles.name, {color: colors.text}]}>muzammilsoft</Text>
          <Text style={[styles.bio, {color: colors.textSecondary}]}>مطور تطبيقات وتطبيقات ويب</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>تواصل معي</Text>

          <TouchableOpacity style={[styles.linkItem, {borderBottomColor: colors.border}]} onPress={() => Linking.openURL('https://github.com/muzammilsoft')}>
            <Github size={20} color={colors.text} />
            <Text style={[styles.linkText, {color: colors.text}]}>GitHub: muzammilsoft</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.linkItem, {borderBottomColor: colors.border}]} onPress={() => Linking.openURL('https://facebook.com/khartoum.ghoul')}>
            <Facebook size={20} color="#1877F2" />
            <Text style={[styles.linkText, {color: colors.text}]}>Facebook: khartoum.ghoul</Text>
          </TouchableOpacity>

          <View style={[styles.linkItem, {borderBottomColor: colors.border}]}>
            <Mail size={20} color={colors.textSecondary} />
            <Text style={[styles.linkText, {color: colors.textSecondary}]}>muzammil@example.com</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, {color: colors.textSecondary}]}>علّامة v1.3.0</Text>
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
  profileSection: { alignItems: 'center', marginBottom: 40 },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 40, fontFamily: 'Cairo-Bold' },
  name: { fontSize: 24, marginBottom: 8, fontFamily: 'Cairo-Bold' },
  bio: { fontSize: 16, textAlign: 'center', fontFamily: 'Cairo-Regular' },
  infoSection: { width: '100%', marginBottom: 40 },
  sectionTitle: { fontSize: 18, marginBottom: 16, textAlign: 'right', fontFamily: 'Cairo-Bold' },
  linkItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  linkText: { fontSize: 16, marginLeft: 12, fontFamily: 'Cairo-Medium' },
  footer: { alignItems: 'center', marginTop: 20 },
  footerText: { fontSize: 14, fontFamily: 'Cairo-Bold' },
  footerSubText: { fontSize: 12, marginTop: 4, fontFamily: 'Cairo-Regular' }
});

export default AboutScreen;
