const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());
app.get('/api/tags', (req, res) => res.json({ models: [{ name: 'gemma3:latest', size: 3500000000 }] }));
app.post('/api/chat', (req, res) => res.json({ message: { role: 'assistant', content: 'مرحباً من المحاكاة' } }));
app.listen(11434, () => console.log('Mock Ollama running'));
