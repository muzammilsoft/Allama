import RNFS from 'react-native-fs';
import DeviceInfo from 'react-native-device-info';
import modelsCatalog from '../data/models.json';

export interface Model {
  id: string;
  name: string;
  description: string;
  size: string;
  ramRequired: number; // بالـ MB
  url: string;
  filename: string;
  isDownloaded?: boolean;
  isDownloading?: boolean;
  progress?: number;
}

const MODELS_DIR = `${RNFS.DocumentDirectoryPath}/models`;

export const ModelService = {
  // التأكد من وجود مجلد النماذج
  init: async () => {
    const exists = await RNFS.exists(MODELS_DIR);
    if (!exists) {
      await RNFS.mkdir(MODELS_DIR);
    }
  },

  // الحصول على الرام الكلي للجهاز بالـ MB
  getTotalRam: async () => {
    const totalMemory = await DeviceInfo.getTotalMemory();
    return totalMemory / (1024 * 1024);
  },

  // فلترة النماذج بناءً على الرام المتاح (80% بحد أقصى)
  getCompatibleModels: async () => {
    const totalRam = await ModelService.getTotalRam();
    const limit = totalRam * 0.8;

    return modelsCatalog.map(async (model) => {
      const path = `${MODELS_DIR}/${model.filename}`;
      const isDownloaded = await RNFS.exists(path);

      return {
        ...model,
        isDownloaded,
        isCompatible: model.ramRequired < limit
      };
    });
  },

  // تحميل نموذج مع متابعة التقدم
  downloadModel: async (model: Model, onProgress: (progress: number) => void) => {
    const path = `${MODELS_DIR}/${model.filename}`;

    // التأكد من وجود المجلد قبل التحميل
    await ModelService.init();

    const options: RNFS.DownloadFileOptions = {
      fromUrl: model.url,
      toFile: path,
      background: true,
      discretionary: true,
      progress: (res) => {
        if (res.contentLength > 0) {
          const percent = (res.bytesWritten / res.contentLength) * 100;
          onProgress(percent);
        } else {
          // إذا لم يتوفر حجم الملف، نحسبه بناءً على ما تم كتابته (تقديري)
          onProgress(-1);
        }
      },
      progressDivider: 1
    };

    try {
      const result = RNFS.downloadFile(options);
      return {
        jobId: result.jobId,
        promise: result.promise
      };
    } catch (error) {
      console.error("Download start error:", error);
      throw error;
    }
  },

  // حذف نموذج
  deleteModel: async (filename: string) => {
    const path = `${MODELS_DIR}/${filename}`;
    if (await RNFS.exists(path)) {
      await RNFS.unlink(path);
    }
  },

  // الحصول على المسار الكامل للنموذج
  getModelPath: (filename: string) => {
    return `${MODELS_DIR}/${filename}`;
  }
};
