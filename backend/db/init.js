const db = require('./database');

const initDb = () => {
    db.serialize(() => {
        // Table Admin
        db.run(`CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`);

        // Table Users
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            whatsapp TEXT,
            nim TEXT,
            password TEXT,
            profil TEXT
        )`);

        // Migration for existing table
        db.run("ALTER TABLE users ADD COLUMN profil TEXT", (err) => {
        });

        const stmt = db.prepare("INSERT OR IGNORE INTO admin (username, password) VALUES (?, ?)");
        stmt.run('admin', 'admin123');
        stmt.finalize();
        
        console.log('Tables (admin, users) ready and default admin verified.');
    });
};

module.exports = initDb;
if (require.main === module) {
    initDb();
}