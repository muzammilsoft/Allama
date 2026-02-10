const express = require('express');
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

app.post('/api/chat', async (req, res) => {
    const { sessionId, model, messages, options, toolsEnabled, stream } = req.body;
    let currentTools = toolsEnabled ? tools.toolsDefinition : [];

    try {
        let currentMessages = [...messages];
        let toolCallsMade = 0;
        const MAX_TOOL_CALLS = 5;

        while (toolCallsMade < MAX_TOOL_CALLS) {
            let ollamaRes;
            try {
                ollamaRes = await ollama.chat(model, currentMessages, options, currentTools, false);
            } catch (error) {
                // If model doesn't support tools, retry once without tools
                const errorData = error.response ? error.response.data : {};
                const errorMessage = typeof errorData === 'string' ? errorData : (errorData.error || error.message);

                if (errorMessage.includes('does not support tools') && currentTools.length > 0) {
                    console.log(`Model ${model} does not support tools. Retrying without tools...`);
                    currentTools = [];
                    continue; // Retry the loop with currentTools empty
                }
                throw error; // Re-throw if it's another error
            }

            const response = ollamaRes.data;

            if (response.message.tool_calls && response.message.tool_calls.length > 0) {
                if (sessionId) db.addMessage(sessionId, response.message.role, JSON.stringify(response.message.tool_calls));
                currentMessages.push(response.message);

                for (const toolCall of response.message.tool_calls) {
                    const result = await tools.handleToolCall(toolCall);
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
                if (stream) {
                    const streamRes = await ollama.chat(model, currentMessages, options, [], true);
                    res.setHeader('Content-Type', 'application/x-ndjson');
                    streamRes.data.pipe(res);
                    return;
                } else {
                    if (sessionId && response.message) db.addMessage(sessionId, response.message.role, response.message.content);
                    return res.json(response);
                }
            }
        }
        res.status(500).json({ error: 'Too many tool calls' });
    } catch (error) {
        console.error('Chat Error:', error);
        const errorMsg = error.response ? (error.response.data.error || JSON.stringify(error.response.data)) : error.message;
        res.status(error.response ? error.response.status : 500).json({ error: errorMsg });
    }
});

app.get('/api/status', (req, res) => res.json({ status: 'running' }));

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
