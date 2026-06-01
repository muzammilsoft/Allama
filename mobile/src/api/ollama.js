import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';
const getOllamaBaseUrl = async () => { const url = await AsyncStorage.getItem('ollama_url'); return url || 'http://localhost:11434'; };
export const listModels = async () => {
  const baseUrl = await getOllamaBaseUrl();
  const response = await axios.get(`${baseUrl}/api/tags`, { timeout: 5000 });
  return response.data.models || [];
};
export const chat = async (model, messages, options = {}, tools = [], stream = false, onChunk) => {
  const baseUrl = await getOllamaBaseUrl();
  const payload = { model, messages, options, stream };
  if (tools && tools.length > 0) payload.tools = tools;

  if (stream) {
    return ReactNativeBlobUtil.config({
      fileCache: false,
    }).fetch('POST', `${baseUrl}/api/chat`, {
      'Content-Type': 'application/json',
    }, JSON.stringify(payload))
    .progress({ interval: 10 }, (received, total) => {
      // Progress can be used for byte monitoring
    })
    .onData((chunk) => {
      if (onChunk) onChunk(chunk);
    });
  }

  return axios.post(`${baseUrl}/api/chat`, payload, { responseType: 'json', timeout: 0 });
};
