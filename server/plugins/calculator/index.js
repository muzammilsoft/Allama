const math = require('mathjs');

module.exports = async ({ expression }, { log }) => {
    log(`Calculating: ${expression}`);
    try {
        const result = math.evaluate(expression);
        log(`Result: ${result}`);
        return { result: String(result) };
    } catch (err) {
        log(`Error: ${err.message}`);
        return { error: err.message };
    }
};
