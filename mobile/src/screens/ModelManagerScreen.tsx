import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Alert, StatusBar } from 'react-native';
import ProgressBar from '@react-native-community/progress-bar-android';
import { ChevronLeft, Download, Trash2, CheckCircle, MessageCircle } from 'lucide-react-native';
import { ModelService, Model } from '../services/ModelService';
import RNFS from 'react-native-fs';
import { useTheme } from '../utils/ThemeContext';

const ModelManagerScreen = ({ navigation }: any) => {
  const { colors, isDark } = useTheme();
  const [models, setModels] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    await ModelService.init();
    const compatModelsPromises = await ModelService.getCompatibleModels();
    const compatModels = await Promise.all(compatModelsPromises);
    setModels(compatModels);
  };

  const handleDownload = async (model: Model) => {
    if (downloadingId) {
      Alert.alert('تنبيه', 'يوجد تحميل جاري حالياً. يرجى الانتظار.');
      return;
    }

    setDownloadingId(model.id);
    setProgress(0);

    try {
      const downloadResult = await ModelService.downloadModel(model, (p) => {
        setProgress(p);
      });

      if (!downloadResult) {
        throw new Error("Failed to start download job");
      }

      const { jobId, promise } = downloadResult;
      setCurrentJobId(jobId);

      const result = await promise;
      if (result.statusCode === 200) {
        Alert.alert('نجاح', 'تم تحميل النموذج بنجاح.');
        loadModels();
      } else {
        Alert.alert('خطأ', `فشل تحميل النموذج (كود: ${result.statusCode}). حاول مرة أخرى.`);
      }
    } catch (error: any) {
      console.error("Download Error:", error);
      Alert.alert('خطأ', `حدث خطأ أثناء التحميل: ${error.message || 'خطأ غير معروف'}`);
    } finally {
      setDownloadingId(null);
      setCurrentJobId(null);
    }
  };

  const handleDelete = async (model: Model) => {
    Alert.alert(
      'حذف النموذج',
      `هل أنت متأكد من حذف ${model.name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            await ModelService.deleteModel(model.filename);
            loadModels();
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.modelCard, {backgroundColor: colors.surface, borderColor: colors.border}, !item.isCompatible && styles.incompatibleCard]}>
      <View style={styles.modelHeader}>
        <Text style={[styles.modelName, {color: colors.text}]}>{item.name}</Text>
        <Text style={[styles.modelSize, {color: colors.textSecondary}]}>{item.size}</Text>
      </View>
      <Text style={[styles.modelDesc, {color: colors.textSecondary}]}>{item.description}</Text>

      {!item.isCompatible ? (
        <Text style={styles.warningText}>جهازك قد لا يشغل هذا النموذج بسلاسة (يحتاج رام أكثر).</Text>
      ) : null}

      <View style={styles.actions}>
        {item.isDownloaded ? (
          <>
            <View style={styles.statusBadge}>
              <CheckCircle size={16} color="green" />
              <Text style={styles.statusText}>جاهز للاستخدام</Text>
            </View>
            <TouchableOpacity
              style={styles.chatLinkBtn}
              onPress={() => navigation.navigate('LocalChat', { modelFile: item.filename })}
            >
              <MessageCircle size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <Trash2 size={20} color="red" />
            </TouchableOpacity>
          </>
        ) : (
          downloadingId === item.id ? (
            <View style={styles.progressContainer}>
              <Text style={[styles.progressText, {color: colors.text}]}>
                {progress === -1 ? 'جاري التحميل...' : `${Math.round(progress)}%`}
              </Text>
              <ProgressBar
                styleAttr="Horizontal"
                indeterminate={progress === -1}
                progress={progress === -1 ? 0 : progress / 100}
                color={colors.primary}
              />
              <TouchableOpacity onPress={() => {
                if (currentJobId) RNFS.stopDownload(currentJobId);
              }}>
                <Text style={styles.cancelText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.downloadBtn, {backgroundColor: colors.primary}, !item.isCompatible && styles.disabledBtn]}
              onPress={() => handleDownload(item)}
              disabled={!item.isCompatible}
            >
              <Download size={18} color={colors.primaryContrast} />
              <Text style={[styles.downloadBtnText, {color: colors.primaryContrast}]}>تحميل</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={[styles.header, {borderBottomColor: colors.border}]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>إدارة النماذج المحلية</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.infoBox, {backgroundColor: isDark ? '#1a2a3a' : '#f0f7ff'}]}>
        <Text style={[styles.infoText, {color: isDark ? '#80b3ff' : '#0056b3'}]}>هذه النماذج تعمل محلياً تماماً على معالج جهازك بدون إنترنت.</Text>
      </View>

      <FlatList
        data={models}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontFamily: 'Cairo-Bold' },
  list: { padding: 16 },
  modelCard: { padding: 16, borderWidth: 1, borderRadius: 12, marginBottom: 16 },
  incompatibleCard: { opacity: 0.7 },
  modelHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  modelName: { fontSize: 16, flex: 1, textAlign: 'right', fontFamily: 'Cairo-Bold' },
  modelSize: { fontSize: 14, marginLeft: 8, fontFamily: 'Cairo-Regular' },
  modelDesc: { fontSize: 14, textAlign: 'right', marginBottom: 12, fontFamily: 'Cairo-Regular' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 },
  downloadBtn: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  downloadBtnText: { marginLeft: 8, fontFamily: 'Cairo-Bold' },
  disabledBtn: { backgroundColor: '#ccc' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusText: { fontSize: 14, color: 'green', marginLeft: 6, fontFamily: 'Cairo-Bold' },
  chatLinkBtn: { marginHorizontal: 12 },
  warningText: { fontSize: 12, color: 'orange', textAlign: 'right', marginBottom: 8, fontFamily: 'Cairo-Regular' },
  infoBox: { padding: 16, margin: 16, borderRadius: 8 },
  infoText: { fontSize: 13, textAlign: 'center', fontFamily: 'Cairo-Medium' },
  progressContainer: { flex: 1, marginLeft: 16 },
  progressText: { textAlign: 'center', fontSize: 12, fontFamily: 'Cairo-Regular' },
  cancelText: { color: 'red', textAlign: 'center', marginTop: 4, fontSize: 12, fontFamily: 'Cairo-Bold' }
});

export default ModelManagerScreen;
