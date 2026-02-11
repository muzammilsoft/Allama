const express = require('express');
const app = express();
app.use(express.json());
app.post('/api/chat', (req, res) => {
    console.log('Mock Ollama: Returning 400 Bad Request');
    res.status(400).json({ error: 'model does not support tools' });
});
app.get('/api/tags', (req, res) => {
    res.json({ models: [{ name: 'bad-model' }] });
});
app.listen(11434, () => console.log('Mock Ollama running on 11434'));
