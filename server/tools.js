const { exec } = require('child_process');
const axios = require('axios');

const toolsDefinition = [
    {
        type: 'function',
        function: {
            name: 'get_current_time',
            description: 'Get the current date and time',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'execute_command',
            description: 'Execute a system command (Use with caution!)',
            parameters: {
                type: 'object',
                properties: { command: { type: 'string', description: 'The shell command to execute' } },
                required: ['command'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'web_request',
            description: 'Make a simple GET web request',
            parameters: {
                type: 'object',
                properties: { url: { type: 'string', description: 'The URL to fetch' } },
                required: ['url'],
            },
        },
    },
];

const handlers = {
    get_current_time: async () => ({ result: new Date().toLocaleString() }),
    execute_command: async ({ command }) => {
        return new Promise((resolve) => {
            exec(command, (error, stdout, stderr) => {
                if (error) resolve({ error: error.message, stderr });
                else resolve({ stdout, stderr });
            });
        });
    },
    web_request: async ({ url }) => {
        try {
            const response = await axios.get(url);
            const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            return { result: content.substring(0, 2000) };
        } catch (error) {
            return { error: error.message };
        }
    },
};

async function handleToolCall(toolCall) {
    const name = toolCall.function.name;
    const args = toolCall.function.arguments;
    if (handlers[name]) return await handlers[name](args);
    return { error: `Tool ${name} not found` };
}

module.exports = { toolsDefinition, handleToolCall };
