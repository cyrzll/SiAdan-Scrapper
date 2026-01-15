const { startAutoAbsen } = require('../../../services/siadin/attendance');

module.exports = async ({ sock, sender, db, senderNumber }) => {
     db.get('SELECT * FROM users WHERE whatsapp = ?', [senderNumber], async (err, row) => {
        if (err) return console.error(err);

        if (row) {
             await sock.sendMessage(sender, { text: '🔄 Memulai Auto Absen di latar belakang...' });
             const result = await startAutoAbsen(row);
             await sock.sendMessage(sender, { text: result });
        } else {
             console.log(`Unregistered user tried .autoabsen: ${senderNumber}`);
        }
     });
};
