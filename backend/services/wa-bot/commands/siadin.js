const { browserStore } = require('../../../lib/browserManager');

module.exports = async ({ sock, sender, db, senderNumber }) => {
    db.get('SELECT * FROM users WHERE whatsapp = ?', [senderNumber], async (err, row) => {
        if (err) return console.error(err);
        if (row) {
            const isLoggedIn = browserStore.has(row.id);
            let menu = "🤖 *Menu SiAdin Bot*\n\n";
            if (isLoggedIn) {
                menu += "✅ *Status: Terhubung*\n\n";
                menu += "📌 *.jadwal* - Jadwal Kuliah & Ujian Hari Ini\n";
                menu += "📌 *.jadwalujian* - Jadwal Ujian Lengkap\n";
                menu += "📌 *.absen* - Cek / Input Presensi Online\n";
                menu += "📌 *.autoabsen* - Auto Presensi (Real-time)\n";
                menu += "📌 *.stopabsen* - Berhenti Auto Presensi\n";
                menu += "📌 *.logout* - Keluar Sesi\n";
            } else {
                 menu += "❌ *Status: Belum Login*\n\n";
                 menu += "📌 *.login* - Masuk ke SiAdin\n";
            }
            await sock.sendMessage(sender, { text: menu });
        }
    });
};
