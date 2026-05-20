import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { ChevronLeft, Github, Facebook, Mail, Globe } from 'lucide-react-native';

const AboutScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ChevronLeft size={24} color="#000" /></TouchableOpacity>
        <Text style={styles.headerTitle}>عن المطور</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}><Text style={styles.avatarText}>M</Text></View>
          <Text style={styles.name}>muzammilsoft</Text>
          <Text style={styles.bio}>مطور تطبيقات وتطبيقات ويب</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>تواصل معي</Text>

          <TouchableOpacity style={styles.linkItem} onPress={() => Linking.openURL('https://github.com/muzammilsoft')}>
            <Github size={20} color="#000" />
            <Text style={styles.linkText}>GitHub: muzammilsoft</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkItem} onPress={() => Linking.openURL('https://facebook.com/khartoum.ghoul')}>
            <Facebook size={20} color="#1877F2" />
            <Text style={styles.linkText}>Facebook: khartoum.ghoul</Text>
          </TouchableOpacity>

          <View style={styles.linkItem}>
            <Mail size={20} color="#666" />
            <Text style={styles.linkText}>muzammil@example.com</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>علّامة v1.2.0</Text>
          <Text style={styles.footerSubText}>صنع بحب لتسهيل استخدام الذكاء الاصطناعي</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  content: { padding: 24, alignItems: 'center' },
  profileSection: { alignItems: 'center', marginBottom: 40 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 8 },
  bio: { fontSize: 16, color: '#666', textAlign: 'center' },
  infoSection: { width: '100%', marginBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 16, textAlign: 'right' },
  linkItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  linkText: { fontSize: 16, color: '#333', marginLeft: 12 },
  footer: { alignItems: 'center', marginTop: 20 },
  footerText: { fontSize: 14, fontWeight: 'bold', color: '#999' },
  footerSubText: { fontSize: 12, color: '#ccc', marginTop: 4 }
});

export default AboutScreen;
