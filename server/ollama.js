const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

async function chat(model, messages, options = {}, tools = []) {
    const payload = { model, messages, stream: false, options };
    if (tools && tools.length > 0) payload.tools = tools;

    try {
        const response = await axios.post(`${OLLAMA_URL}/api/chat`, payload);
        return response.data;
    } catch (error) {
        console.error('Ollama API Error:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function listModels() {
    try {
        const response = await axios.get(`${OLLAMA_URL}/api/tags`);
        return response.data;
    } catch (error) {
        console.error('Ollama List Models Error:', error.message);
        return { models: [] };
    }
}

module.exports = { chat, listModels };
