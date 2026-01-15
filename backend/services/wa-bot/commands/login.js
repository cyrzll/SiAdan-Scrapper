const { loginUser } = require('../../../services/siadin/auth');

module.exports = async ({ sock, sender, db, senderNumber }) => {
    db.get('SELECT * FROM users WHERE whatsapp = ?', [senderNumber], async (err, row) => {
        if (err) return console.error(err);
        
        if (row) {
            await sock.sendMessage(sender, { text: 'Login ke SiAdin, harap tunggu...' });
            const result = await loginUser(row);
            
            // Helper for greeting
            const getGreeting = () => {
                const hour = new Date().getHours();
                if (hour >= 0 && hour < 10) return 'Pagi';
                if (hour >= 10 && hour < 15) return 'Siang';
                if (hour >= 15 && hour < 18) return 'Sore';
                return 'Malam';
            };

            const status = (typeof result === 'object') ? result.status : result;
            const data = (typeof result === 'object' && result.data) ? result.data : { name: 'Mahasiswa', email: '-', stats: { mk: '-', sks: '-', ipk: '-' } };

            if (status === 'ALREADY_LOGGED_IN' || status === 'SUCCESS' || result === true) {
                 const greeting = getGreeting();
                 const message = `Selamat ${greeting}\n\n${data.name}\n${data.email}\nDashboard Akademik\n\n*Statistik Akademik*\nMata Kuliah: ${data.stats.mk}\nTotal SKS: ${data.stats.sks}\nIPK: ${data.stats.ipk}`;
                 await sock.sendMessage(sender, { text: message });
            } else {
                await sock.sendMessage(sender, { text: 'Gagal login ke siadin.' });
            }
        } else {
            console.log(`Unregistered user tried .login: ${senderNumber}`);
        }
    });
};
