const { exec } = require('child_process');

module.exports = async ({ command }, { log }) => {
    log(`Executing: ${command}`);
    return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
            if (error) resolve({ error: error.message, stderr });
            else resolve({ stdout, stderr });
        });
    });
};
