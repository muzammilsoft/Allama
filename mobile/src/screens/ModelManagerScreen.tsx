import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import ProgressBar from '@react-native-community/progress-bar-android';
import { ChevronLeft, Download, Trash2, CheckCircle, MessageCircle } from 'lucide-react-native';
import { ModelService, Model } from '../services/ModelService';
import RNFS from 'react-native-fs';

const ModelManagerScreen = ({ navigation }: any) => {
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
      const { jobId, promise } = await ModelService.downloadModel(model, (p) => {
        setProgress(p);
      });
      setCurrentJobId(jobId);

      const result = await promise;
      if (result.statusCode === 200) {
        Alert.alert('نجاح', 'تم تحميل النموذج بنجاح.');
        loadModels();
      } else {
        Alert.alert('خطأ', 'فشل تحميل النموذج. حاول مرة أخرى.');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ غير متوقع أثناء التحميل.');
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
    <View style={[styles.modelCard, !item.isCompatible && styles.incompatibleCard]}>
      <View style={styles.modelHeader}>
        <Text style={styles.modelName}>{item.name}</Text>
        <Text style={styles.modelSize}>{item.size}</Text>
      </View>
      <Text style={styles.modelDesc}>{item.description}</Text>

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
              <MessageCircle size={20} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <Trash2 size={20} color="red" />
            </TouchableOpacity>
          </>
        ) : (
          downloadingId === item.id ? (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
              <ProgressBar styleAttr="Horizontal" indeterminate={false} progress={progress / 100} color="#000" />
              <TouchableOpacity onPress={() => {
                if (currentJobId) RNFS.stopDownload(currentJobId);
              }}>
                <Text style={styles.cancelText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.downloadBtn, !item.isCompatible && styles.disabledBtn]}
              onPress={() => handleDownload(item)}
              disabled={!item.isCompatible}
            >
              <Download size={18} color="#fff" />
              <Text style={styles.downloadBtnText}>تحميل</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة النماذج المحلية</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>هذه النماذج تعمل محلياً تماماً على معالج جهازك بدون إنترنت.</Text>
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  list: { padding: 16 },
  modelCard: { padding: 16, borderWidth: 1, borderColor: '#eee', borderRadius: 12, marginBottom: 16, backgroundColor: '#fafafa' },
  incompatibleCard: { opacity: 0.7 },
  modelHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  modelName: { fontSize: 16, fontWeight: 'bold', color: '#000', flex: 1, textAlign: 'right' },
  modelSize: { fontSize: 14, color: '#666', marginLeft: 8 },
  modelDesc: { fontSize: 14, color: '#444', textAlign: 'right', marginBottom: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 },
  downloadBtn: { flexDirection: 'row', backgroundColor: '#000', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  downloadBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  disabledBtn: { backgroundColor: '#ccc' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusText: { fontSize: 14, color: 'green', marginLeft: 6, fontWeight: 'bold' },
  chatLinkBtn: { marginHorizontal: 12 },
  warningText: { fontSize: 12, color: 'orange', textAlign: 'right', marginBottom: 8 },
  infoBox: { padding: 16, backgroundColor: '#f0f7ff', margin: 16, borderRadius: 8 },
  infoText: { fontSize: 13, color: '#0056b3', textAlign: 'center' },
  progressContainer: { flex: 1, marginLeft: 16 },
  progressText: { textAlign: 'center', fontSize: 12, color: '#000' },
  cancelText: { color: 'red', textAlign: 'center', marginTop: 4, fontSize: 12 }
});

export default ModelManagerScreen;
