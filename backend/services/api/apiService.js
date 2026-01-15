const express = require('express');
const cors = require('cors');
const db = require('../../db/database');

const app = express();

app.use(cors());
app.use(express.json());

// --- Admin Login API ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    db.get('SELECT * FROM admin WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            res.json({ message: 'Login successful', adminId: row.id, username: row.username });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// --- Users CRUD API ---

// 1. GET All Users
app.get('/api/users', (req, res) => {
    db.all('SELECT * FROM users', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ users: rows });
    });
});

// 2. CREATE User
app.post('/api/users', (req, res) => {
    const { whatsapp, nim, password, profil } = req.body;
    
    if (!whatsapp || !nim || !password) {
        return res.status(400).json({ error: 'WhatsApp, NIM, and Password are required' });
    }

    const stmt = db.prepare('INSERT INTO users (whatsapp, nim, password, profil) VALUES (?, ?, ?, ?)');
    stmt.run([whatsapp, nim, password, profil], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, whatsapp, nim, profil });
    });
    stmt.finalize();
});

// 3. UPDATE User
app.put('/api/users/:id', (req, res) => {
    const { whatsapp, nim, password, profil } = req.body;
    const { id } = req.params;

    const stmt = db.prepare('UPDATE users SET whatsapp = ?, nim = ?, password = ?, profil = ? WHERE id = ?');
    stmt.run([whatsapp, nim, password, profil, id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User updated', changes: this.changes });
    });
    stmt.finalize();
});

// 4. DELETE User
app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM users WHERE id = ?', id, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted', changes: this.changes });
    });
});

const startApiService = (port) => {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
};

module.exports = { startApiService };
