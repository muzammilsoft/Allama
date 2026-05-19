import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
const getOllamaBaseUrl = async () => { const url = await AsyncStorage.getItem('ollama_url'); return url || 'http://localhost:11434'; };
export const listModels = async () => { const baseUrl = await getOllamaBaseUrl(); const response = await axios.get(`${baseUrl}/api/tags`); return response.data.models || []; };
export const chat = async (model, messages, options = {}, tools = [], stream = false, signal) => {
  const baseUrl = await getOllamaBaseUrl();
  const payload = { model, messages, options, stream };
  if (tools && tools.length > 0) payload.tools = tools;
  return axios.post(`${baseUrl}/api/chat`, payload, { responseType: stream ? 'stream' : 'json', signal, timeout: 0 });
};
