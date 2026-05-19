import SQLite from 'react-native-sqlite-storage';
SQLite.enablePromise(true);
const database_name = "allama.db";
export const getDBConnection = async () => { return SQLite.openDatabase({ name: database_name, location: 'default' }); };
export const initDatabase = async () => {
  const db = await getDBConnection();
  await db.executeSql('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, title TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);');
  await db.executeSql('CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, sessionId TEXT, role TEXT, content TEXT, images TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);');
  await db.executeSql('CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, name TEXT, icon TEXT, systemPrompt TEXT, tools TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);');
};
export const getSessions = async (db) => {
  const results = await db.executeSql('SELECT * FROM sessions ORDER BY created_at DESC');
  const sessions = [];
  results.forEach(result => { for (let index = 0; index < result.rows.length; index++) sessions.push(result.rows.item(index)); });
  return sessions;
};
export const createSession = async (db, id, title) => { await db.executeSql('INSERT INTO sessions (id, title) VALUES (?, ?)', [id, title]); };
export const getMessages = async (db, sessionId) => {
  const results = await db.executeSql('SELECT * FROM messages WHERE sessionId = ? ORDER BY created_at ASC', [sessionId]);
  const messages = [];
  results.forEach(result => { for (let index = 0; index < result.rows.length; index++) { const item = result.rows.item(index); if (item.images) item.images = JSON.parse(item.images); messages.push(item); } });
  return messages;
};
export const addMessage = async (db, id, sessionId, role, content, images) => {
  const imagesStr = images ? JSON.stringify(images) : null;
  await db.executeSql('INSERT INTO messages (id, sessionId, role, content, images) VALUES (?, ?, ?, ?, ?)', [id, sessionId, role, content, imagesStr]);
};
export const getAgents = async (db) => {
  const results = await db.executeSql('SELECT * FROM agents ORDER BY created_at DESC');
  const agents = [];
  results.forEach(result => { for (let index = 0; index < result.rows.length; index++) { const item = result.rows.item(index); if (item.tools) item.tools = JSON.parse(item.tools); agents.push(item); } });
  return agents;
};
export const saveAgent = async (db, agent) => {
    const { id, name, icon, systemPrompt, tools } = agent;
    const toolsStr = tools ? JSON.stringify(tools) : null;
    await db.executeSql('INSERT OR REPLACE INTO agents (id, name, icon, systemPrompt, tools) VALUES (?, ?, ?, ?, ?)', [id, name, icon, systemPrompt, toolsStr]);
};
