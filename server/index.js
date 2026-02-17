const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');
const ollama = require('./ollama');
const tools = require('./tools');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../client')));

app.get('/api/models', async (req, res) => {
    try { res.json(await ollama.listModels()); }
    catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/plugins', (req, res) => {
    try { res.json(tools.toolsDefinition); }
    catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/models/load', async (req, res) => {
    try {
        const { model } = req.body;
        await ollama.loadModel(model);
        res.json({ success: true });
    }
    catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/sessions', (req, res) => {
    try { res.json(db.getSessions()); }
    catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/sessions', (req, res) => {
    try { db.createSession(req.body.id, req.body.title); res.json({ success: true }); }
    catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/sessions/:id', (req, res) => {
    try { db.updateSessionTitle(req.params.id, req.body.title); res.json({ success: true }); }
    catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/sessions/:id', (req, res) => {
    try { db.deleteSession(req.params.id); res.json({ success: true }); }
    catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/sessions/:id/messages', (req, res) => {
    try { res.json(db.getMessages(req.params.id)); }
    catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/messages', (req, res) => {
    try {
        const { sessionId, role, content, images } = req.body;
        const msg = db.addMessage(sessionId, role, content, images);
        res.json(msg);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/messages/:sessionId/:msgId', (req, res) => {
    try {
        db.deleteMessage(req.params.sessionId, req.params.msgId);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/agents', (req, res) => {
    try { res.json(db.getAgents()); }
    catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/agents', (req, res) => {
    try { db.createAgent(req.body); res.json({ success: true }); }
    catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/agents/:id', (req, res) => {
    try { db.updateAgent(req.params.id, req.body); res.json({ success: true }); }
    catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/agents/:id', (req, res) => {
    try { db.deleteAgent(req.params.id); res.json({ success: true }); }
    catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/upload', (req, res) => {
    try {
        const { filename, content } = req.body; // base64 content
        const FILES_DIR = path.join(__dirname, '../data/files');
        if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true });

        const buffer = Buffer.from(content, 'base64');
        fs.writeFileSync(path.join(FILES_DIR, filename), buffer);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chat', async (req, res) => {
    const { sessionId, model, messages, options, toolsEnabled, enabledTools, stream } = req.body;
    let currentTools = [];

    if (Array.isArray(enabledTools)) {
        currentTools = tools.toolsDefinition.filter(t => enabledTools.includes(t.function.name));
    } else if (toolsEnabled) {
        currentTools = tools.toolsDefinition;
    }

    const hasTools = currentTools.length > 0;
    const abortController = new AbortController();

    if (stream) {
        res.setHeader('Content-Type', 'application/x-ndjson');
    }

    res.on('close', () => {
        const isFinished = res.writableFinished || res.writableEnded;
        if (!isFinished) {
            console.log(`[Abort] Client closed connection before response was finished.`);
            abortController.abort();
        }
    });

    if (!hasTools && stream) {
        try {
            const streamRes = await ollama.chat(model, messages, options, [], true, abortController.signal);
            res.setHeader('Content-Type', 'application/x-ndjson');
            streamRes.data.pipe(res);
            return;
        } catch (error) {
            if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
                return console.log('Chat request canceled by client.');
            }
            console.error('Streaming Chat Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }

    try {
        let currentMessages = [...messages];
        let toolCallsMade = 0;
        const MAX_TOOL_CALLS = 5;

        while (toolCallsMade < MAX_TOOL_CALLS) {
            let ollamaRes;
            try {
                ollamaRes = await ollama.chat(model, currentMessages, options, currentTools, false, abortController.signal);
            } catch (error) {
                const errorData = error.response ? error.response.data : {};
                const errorMessage = typeof errorData === 'string' ? errorData : (errorData.error || error.message);
                if (errorMessage.includes('does not support tools') && currentTools.length > 0) {
                    currentTools = [];
                    continue;
                }
                throw error;
            }

            const response = ollamaRes.data;
            if (!response || !response.message) throw new Error('Invalid response from Ollama');

            if (response.message.tool_calls && response.message.tool_calls.length > 0) {
                if (sessionId) db.addMessage(sessionId, response.message.role, JSON.stringify(response.message.tool_calls));
                currentMessages.push(response.message);

                if (stream) {
                    res.write(JSON.stringify(response) + '\n');
                }

                for (const toolCall of response.message.tool_calls) {
                    const toolName = toolCall.function.name;
                    const context = {
                        log: (message) => {
                            if (stream && !res.writableEnded) {
                                res.write(JSON.stringify({ status: { tool: toolName, message } }) + '\n');
                            }
                        }
                    };

                    const result = await tools.handleToolCall(toolCall, context);
                    const toolResponse = {
                        role: 'tool',
                        content: JSON.stringify(result),
                        tool_call_id: toolCall.id || ""
                    };
                    currentMessages.push(toolResponse);
                    if (sessionId) db.addMessage(sessionId, 'tool', toolResponse.content);
                }
                toolCallsMade++;
            } else {
                if (sessionId && response.message) db.addMessage(sessionId, response.message.role, response.message.content);
                if (stream) {
                    res.write(JSON.stringify(response) + '\n');
                    return res.end();
                }
                return res.json(response);
            }
        }
        if (stream) {
            res.write(JSON.stringify({ error: 'Too many tool calls' }) + '\n');
            res.end();
        } else {
            res.status(500).json({ error: 'Too many tool calls' });
        }
    } catch (error) {
        if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
            console.log('Chat request canceled by client.');
        } else {
            console.error('Chat Error:', error.message);
            if (!res.headersSent) {
                const errorMsg = error.response ? (error.response.data.error || JSON.stringify(error.response.data)) : error.message;
                res.status(error.response ? error.response.status : 500).json({ error: errorMsg });
            }
        }
    }
});

app.get('/api/status', (req, res) => res.json({ status: 'running' }));

const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
