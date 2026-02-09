const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const db = require('./db');
const ollama = require('./ollama');
const tools = require('./tools');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
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
        db.addMessage(sessionId, role, content, images);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/chat', async (req, res) => {
    const { sessionId, model, messages, options, toolsEnabled } = req.body;
    try {
        let currentMessages = [...messages];
        let response;
        let toolCallsMade = 0;
        const MAX_TOOL_CALLS = 5;

        while (toolCallsMade < MAX_TOOL_CALLS) {
            response = await ollama.chat(model, currentMessages, options, toolsEnabled ? tools.toolsDefinition : []);
            if (response.message.tool_calls && response.message.tool_calls.length > 0) {
                currentMessages.push(response.message);
                for (const toolCall of response.message.tool_calls) {
                    const result = await tools.handleToolCall(toolCall);
                    currentMessages.push({ role: 'tool', content: JSON.stringify(result) });
                }
                toolCallsMade++;
            } else break;
        }
        if (sessionId && response.message) db.addMessage(sessionId, response.message.role, response.message.content);
        res.json(response);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/status', (req, res) => res.json({ status: 'running' }));

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
