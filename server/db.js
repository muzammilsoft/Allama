const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/allama.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, '../data'))) {
    fs.mkdirSync(path.join(__dirname, '../data'));
}

// Initialize JSON file if it doesn't exist
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ sessions: [], messages: [], agents: [] }, null, 2));
}

function readDB() {
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        const parsed = JSON.parse(data);
        if (!parsed.sessions) parsed.sessions = [];
        if (!parsed.messages) parsed.messages = [];
        if (!parsed.agents) parsed.agents = [];
        return parsed;
    } catch (error) {
        console.error('Error reading DB:', error);
        return { sessions: [], messages: [], agents: [] };
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing DB:', error);
    }
}

module.exports = {
    getSessions: () => {
        const db = readDB();
        return db.sessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    createSession: (id, title) => {
        const db = readDB();
        db.sessions.push({
            id,
            title,
            created_at: new Date().toISOString()
        });
        writeDB(db);
        return { changes: 1 };
    },
    deleteSession: (id) => {
        const db = readDB();
        db.sessions = db.sessions.filter(s => s.id !== id);
        db.messages = db.messages.filter(m => m.session_id !== id);
        writeDB(db);
        return { changes: 1 };
    },
    getMessages: (sessionId) => {
        const db = readDB();
        return db.messages
            .filter(m => m.session_id === sessionId)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    },
    addMessage: (sessionId, role, content, images = null) => {
        const db = readDB();
        const newMessage = {
            id: String(Date.now() + Math.random()),
            session_id: sessionId,
            role,
            content,
            images,
            created_at: new Date().toISOString()
        };
        db.messages.push(newMessage);
        writeDB(db);
        return newMessage;
    },
    updateSessionTitle: (id, title) => {
        const db = readDB();
        const session = db.sessions.find(s => s.id === id);
        if (session) {
            session.title = title;
            writeDB(db);
        }
        return { changes: 1 };
    },
    deleteMessage: (sessionId, messageId) => {
        const db = readDB();
        db.messages = db.messages.filter(m => !(m.session_id === sessionId && String(m.id) === String(messageId)));
        writeDB(db);
        return { changes: 1 };
    },
    getAgents: () => {
        const db = readDB();
        return db.agents;
    },
    createAgent: (agent) => {
        const db = readDB();
        db.agents.push({
            ...agent,
            created_at: new Date().toISOString()
        });
        writeDB(db);
        return { changes: 1 };
    },
    updateAgent: (id, updatedAgent) => {
        const db = readDB();
        const index = db.agents.findIndex(a => a.id === id);
        if (index !== -1) {
            db.agents[index] = { ...db.agents[index], ...updatedAgent };
            writeDB(db);
        }
        return { changes: 1 };
    },
    deleteAgent: (id) => {
        const db = readDB();
        db.agents = db.agents.filter(a => a.id !== id);
        writeDB(db);
        return { changes: 1 };
    }
};
