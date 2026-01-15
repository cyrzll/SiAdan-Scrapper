const { startExamScraper } = require('../../../services/siadin/schedule');

module.exports = async ({ sock, sender, db, senderNumber }) => {
    db.get('SELECT * FROM users WHERE whatsapp = ?', [senderNumber], async (err, row) => {
        if (err) return console.error(err);

        if (row) {
             await sock.sendMessage(sender, { text: 'Sedang mengambil jadwal ujian...' });
             const result = await startExamScraper(row);
             await sock.sendMessage(sender, { text: result });
        } else {
            console.log(`Unregistered user tried .jadwalujian: ${senderNumber}`);
        }
    });
};
