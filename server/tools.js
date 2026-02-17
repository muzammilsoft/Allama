const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.join(__dirname, 'plugins');

let toolsDefinition = [];
let handlers = {};

function loadPlugins() {
    toolsDefinition = [];
    handlers = {};

    if (!fs.existsSync(PLUGINS_DIR)) {
        fs.mkdirSync(PLUGINS_DIR, { recursive: true });
        return;
    }

    const pluginFolders = fs.readdirSync(PLUGINS_DIR);

    pluginFolders.forEach(folder => {
        const folderPath = path.join(PLUGINS_DIR, folder);
        if (fs.statSync(folderPath).isDirectory()) {
            const manifestPath = path.join(folderPath, 'manifest.json');
            const indexPath = path.join(folderPath, 'index.js');

            if (fs.existsSync(manifestPath) && fs.existsSync(indexPath)) {
                try {
                    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                    const handler = require(indexPath);

                    const toolName = manifest.function.name;
                    toolsDefinition.push(manifest);
                    handlers[toolName] = handler;

                    console.log(`Loaded plugin: ${toolName}`);
                } catch (err) {
                    console.error(`Error loading plugin from ${folder}:`, err);
                }
            }
        }
    });
}

// Initial load
loadPlugins();

async function handleToolCall(toolCall, context = {}) {
    const name = toolCall.function.name;
    const args = toolCall.function.arguments;

    if (!context.log) context.log = (msg) => console.log(`[Tool:${name}] ${msg}`);

    if (handlers[name]) {
        try {
            return await handlers[name](args, context);
        } catch (err) {
            context.log(`Error in tool ${name}: ${err.message}`);
            return { error: err.message };
        }
    }
    return { error: `Tool ${name} not found` };
}

module.exports = {
    get toolsDefinition() { return toolsDefinition; },
    handleToolCall,
    loadPlugins
};
