const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../data/allama.db');

if (!fs.existsSync(path.join(__dirname, '../data'))) {
    fs.mkdirSync(path.join(__dirname, '../data'));
}

const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        role TEXT,
        content TEXT,
        images TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
`);

module.exports = {
    getSessions: () => db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all(),
    createSession: (id, title) => db.prepare('INSERT INTO sessions (id, title) VALUES (?, ?)').run(id, title),
    deleteSession: (id) => db.prepare('DELETE FROM sessions WHERE id = ?').run(id),
    getMessages: (sessionId) => db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC').all(),
    addMessage: (sessionId, role, content, images = null) => db.prepare('INSERT INTO messages (session_id, role, content, images) VALUES (?, ?, ?, ?)').run(sessionId, role, content, images),
    updateSessionTitle: (id, title) => db.prepare('UPDATE sessions SET title = ? WHERE id = ?').run(title, id)
};
