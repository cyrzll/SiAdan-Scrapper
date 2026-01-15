const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const db = require('../../db/database');

// Command Handlers
const siadinHandler = require('./commands/siadin');
const loginHandler = require('./commands/login');
const logoutHandler = require('./commands/logout');
const jadwalHandler = require('./commands/jadwal');
const jadwalUjianHandler = require('./commands/jadwalUjian');
const absenHandler = require('./commands/absen');
const autoAbsenHandler = require('./commands/autoAbsen');
const stopAbsenHandler = require('./commands/stopAbsen');

// Persistent LID Cache
const LID_MAPPING_FILE = path.resolve(__dirname, '../../lid_mapping.json');
let lidCache = new Map();

// Load cache from file
if (fs.existsSync(LID_MAPPING_FILE)) {
    try {
        const data = fs.readFileSync(LID_MAPPING_FILE, 'utf8');
        const json = JSON.parse(data);
        for (const [key, value] of Object.entries(json)) {
            lidCache.set(key, value);
        }
        console.log(`Loaded ${lidCache.size} LID mappings from file.`);
    } catch (e) {
        console.error("Failed to load LID mapping file:", e);
    }
} else {
    // Create file if it doesn't exist
    try {
        fs.writeFileSync(LID_MAPPING_FILE, JSON.stringify({}, null, 2));
        console.log("Created new LID mapping file.");
    } catch (e) {
        console.error("Failed to create LID mapping file:", e);
    }
}

// Helper to save cache
const saveLidCache = () => {
    try {
        const obj = Object.fromEntries(lidCache);
        fs.writeFileSync(LID_MAPPING_FILE, JSON.stringify(obj, null, 2));
    } catch (e) {
        console.error("Failed to save LID mapping file:", e);
    }
};

async function waStart() {
    console.log('Starting WhatsApp Bot...');
    const sessionPath = path.resolve(__dirname, 'session');
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }), // Suppress internal logs
    });

    // Listen for contacts to build LID cache
    sock.ev.on('contacts.upsert', (contacts) => {
        const contactsList = Array.isArray(contacts) ? contacts : (contacts.contacts || []);
        let changed = false;
        for (const contact of contactsList) {
            if (contact.lid && contact.id) {
                lidCache.set(contact.lid, contact.id);
                changed = true;
            }
        }
        if (changed) saveLidCache();
    });

    sock.ev.on('contacts.update', (updates) => {
        const updatesList = Array.isArray(updates) ? updates : (updates.contacts || []);
        let changed = false;
        for (const update of updatesList) {
            if (update.lid && update.id) {
                lidCache.set(update.lid, update.id);
                changed = true;
            }
        }
        if (changed) saveLidCache();
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('Scan this QR code to login:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            // reconnect if not logged out
            if (shouldReconnect) {
                waStart();
            }
        } else if (connection === 'open') {
            console.log('WhatsApp connection opened!');
            
            // Broadcast startup message to all users
            db.all('SELECT * FROM users', [], async (err, rows) => {
                if (err) {
                    console.error('Failed to fetch users for broadcast:', err);
                    return;
                }
                
                console.log(`Broadcasting startup message to ${rows.length} users...`);
                
                for (const row of rows) {
                    try {
                        let targetJid = row.whatsapp;
                        
                        // Check if we have a mapped LID for this number
                        // (Optional: if you want to prefer LID, but usually phone JID works if they initiated contact)
                         
                        // Formatting
                        if (!targetJid.includes('@s.whatsapp.net') && !targetJid.includes('@lid')) {
                             // Assuming numbers in DB are like "085..." or "628..."
                             if (targetJid.startsWith('0')) {
                                 targetJid = '62' + targetJid.slice(1);
                             }
                             targetJid += '@s.whatsapp.net';
                        }

                        // Check if this number is mapped to a LID in our cache (for ensuring delivery if they use LID)
                        // Iterate cache to find if any LID maps to this phone JID? 
                        // Actually, sending to Phone JID usually works fine even if they messaged via LID, 
                        // unless it's a specific privacy setting. 
                        // But let's try sending to the JID derived from DB.

                        const message = `hallo ${row.profil || 'Mahasiswa'} nomor anda ada di SiAdin ketik .siadin atau .login dengan ${row.nim}`;
                        
                        await sock.sendMessage(targetJid, { text: message });
                        console.log(`Sent broadcast to ${row.profil} (${targetJid})`);
                        
                        // Small delay to avoid rate limits
                        await new Promise(r => setTimeout(r, 1000));
                        
                    } catch (sendErr) {
                        console.error(`Failed to send broadcast to ${row.whatsapp}:`, sendErr);
                    }
                }
            });
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        let sender = m.key.remoteJid;
        const isLid = sender.includes('@lid');
        
        // Resolve LID
        if (isLid) {
            // Debug: Log full message to see if we can find the phone number
            // console.log('LID Message Payload:', JSON.stringify(m, null, 2));

            if (lidCache.has(sender)) {
                sender = lidCache.get(sender);
            } else {
                console.log(`Unknown LID: ${sender}`);
                // Try to check if participant or other fields contain the phone JID
                // Sometimes m.key.participant has it?
                if (m.key.participant && m.key.participant.includes('@s.whatsapp.net')) {
                    sender = m.key.participant;
                    lidCache.set(m.key.remoteJid, sender);
                    saveLidCache();
                    console.log(`Resolved LID from participant field: ${sender}`);
                }
            }
        }

        const messageContent = m.message.conversation || m.message.extendedTextMessage?.text;
        
        if (!messageContent) return;

        // Manual Mapping Flow: User sends their phone number to register LID
        if (isLid && !lidCache.has(m.key.remoteJid) && messageContent.match(/^(08\d{8,13}|62\d{8,13})$/)) {
            let number = messageContent;
            if (number.startsWith('0')) number = '62' + number.slice(1);
            const jid = number + '@s.whatsapp.net';
            
            lidCache.set(m.key.remoteJid, jid);
            saveLidCache();
            
            await sock.sendMessage(m.key.remoteJid, { text: `✅ Perangkat terdeteksi! Akun Anda terhubung dengan ${number}.\nSilahkan ketik .login untuk melanjutkan.` });
            return;
        }

        // Normalize sender number for DB lookup
        let senderNumber = sender.replace('@s.whatsapp.net', '').split(':')[0];
        if (senderNumber.startsWith('62')) {
            senderNumber = '0' + senderNumber.slice(2);
        }

        const commands = {
            '.siadin': siadinHandler,
            '.login': loginHandler,
            '.logout': logoutHandler,
            '.jadwal': jadwalHandler,
            '.jadwalujian': jadwalUjianHandler,
            '.absen': absenHandler,
            '.autoabsen': autoAbsenHandler,
            '.stopabsen': stopAbsenHandler
        };

        if (commands[messageContent]) {
            try {
                // If LID is unknown, prompt user to map
                if (isLid && !lidCache.has(m.key.remoteJid) && !messageContent.match(/^(08\d+|62\d+)$/)) {
                     await sock.sendMessage(m.key.remoteJid, { text: "⚠️ Perangkat Anda menggunakan ID anonim (LID) yang belum terdaftar di sistem bot.\n\nSilahkan balas pesan ini dengan *Nomor WhatsApp* Anda (contoh: 0857xxxx) untuk verifikasi." });
                     return;
                }

                await commands[messageContent]({ sock, m, sender, messageContent, db, senderNumber });
            } catch (error) {
                console.error(`Error executing command ${messageContent}:`, error);
                await sock.sendMessage(m.key.remoteJid, { text: 'Terjadi kesalahan pada sistem.' });
            }
        }
    });
}

module.exports = { waStart };

