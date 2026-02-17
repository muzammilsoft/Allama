const axios = require('axios');

module.exports = async ({ url }, { log }) => {
    log(`Fetching: ${url}`);
    try {
        const res = await axios.get(url);
        const content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        return { result: content.substring(0, 2000) };
    } catch (err) {
        return { error: err.message };
    }
};
