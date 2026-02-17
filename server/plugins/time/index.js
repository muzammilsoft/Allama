module.exports = async (args, { log }) => {
    log("Fetching time...");
    return { result: new Date().toLocaleString() };
};
