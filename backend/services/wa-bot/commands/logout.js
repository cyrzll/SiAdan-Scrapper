const { logoutToSiAdin } = require('../../siadin/webLogout');

module.exports = async ({ sock, sender, db, senderNumber }) => {
     db.get('SELECT * FROM users WHERE whatsapp = ?', [senderNumber], async (err, row) => {
        if (err) return console.error(err);
        
        if (row) {
            await sock.sendMessage(sender, { text: 'Sedang mencoba logout...' });
            
            // Stop Auto Absen if running
            const { stopAutoAbsen } = require('../../../services/siadin/attendance');
            await stopAutoAbsen(row);

            const success = await logoutToSiAdin(row);
            if (success) {
                await sock.sendMessage(sender, { text: 'Berhasil logout.' });
            } else {
                await sock.sendMessage(sender, { text: 'Gagal logout.' });
            }
        } else {
            console.log(`Unregistered user tried .logout: ${senderNumber}`);
        }
    });
};
