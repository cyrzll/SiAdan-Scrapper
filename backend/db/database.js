const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Determine database path
const dbPath = path.resolve(__dirname, 'siadin_user.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database at ' + dbPath);
    }
});

module.exports = db;