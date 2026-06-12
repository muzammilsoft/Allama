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

  console.log(`Sending request to: ${baseUrl}/api/chat`, JSON.stringify(payload));

  if (stream) {
    try {
      const res = await ReactNativeBlobUtil.config({
        fileCache: false,
        timeout: 30000,
      }).fetch('POST', `${baseUrl}/api/chat`, {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }, JSON.stringify(payload))
      .progress({ interval: 10 }, (received, total) => {
        // Progress monitoring
      })
      .onData((chunk) => {
        if (onChunk) onChunk(chunk);
      });

      const status = res.info().status;
      if (status !== 200) {
        console.error(`Ollama stream error: Status ${status}`, res.data);
        throw new Error(`Ollama Error (${status}): ${res.data || 'No response data'}`);
      }
      return res;
    } catch (err) {
      console.error("ReactNativeBlobUtil error:", err);
      throw err;
    }
  }

  try {
    return await axios.post(`${baseUrl}/api/chat`, payload, {
      responseType: 'json',
      timeout: 30000
    });
  } catch (err) {
    console.error("Axios chat error:", err);
    throw err;
  }
};
