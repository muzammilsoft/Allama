const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const FILES_DIR = path.join(__dirname, '../../../data/files');

module.exports = async ({ action, filename, page, start, length }, { log }) => {
    const filePath = path.join(FILES_DIR, filename);
    if (!fs.existsSync(filePath)) return { error: `File ${filename} not found` };

    const dataBuffer = fs.readFileSync(filePath);
    try {
        if (action === 'info') {
            const data = await pdf(dataBuffer);
            return { pages: data.numpages, info: data.info };
        }
        if (action === 'read_range') {
            const data = await pdf(dataBuffer);
            return { content: data.text.substring(start || 0, (start || 0) + (length || 2000)) };
        }
    } catch (err) {
        return { error: err.message };
    }
};
