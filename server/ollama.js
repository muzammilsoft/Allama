const axios = require('axios');
const http = require('http');
const https = require('https');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// Persistent agents for faster connectivity
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

async function chat(model, messages, options = {}, tools = [], stream = false, signal = null) {
    const payload = {
        model,
        messages,
        stream,
        options,
    };

    if (tools && tools.length > 0) {
        payload.tools = tools;
    }

    try {
        const response = await axios.post(`${OLLAMA_URL}/api/chat`, payload, {
            responseType: stream ? 'stream' : 'json',
            httpAgent,
            httpsAgent,
            signal,
            headers: { 'Connection': 'keep-alive' }
        });
        return response;
    } catch (error) {
        if (error.code !== 'ERR_CANCELED' && error.name !== 'CanceledError') {
            console.error('Ollama API Error:', error.response ? error.response.data : error.message);
        }
        throw error;
    }
}

async function listModels() {
    try {
        const response = await axios.get(`${OLLAMA_URL}/api/tags`, {
            httpAgent,
            httpsAgent
        });
        return response.data;
    } catch (error) {
        console.error('Ollama List Models Error:', error.message);
        return { models: [] };
    }
}

module.exports = {
    chat,
    listModels
};
