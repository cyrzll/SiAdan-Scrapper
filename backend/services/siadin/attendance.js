const { getBrowser } = require('../../lib/browserManager');
const fs = require('fs');

// Map to store monitoring sessions: userId -> { intervalId, page }
const monitoringSessions = new Map();

const processAbsen = async (page) => {
    console.log("Navigating to Presensi Online...");
    await page.goto(`${process.env.SIADIN_BASE_URL}/akademik/presensiOnline`, { waitUntil: 'networkidle2' });
    
    // Save HTML for debugging
    // const html = await page.content();
    // fs.writeFileSync('absen_debug.html', html);
    // console.log("Saved absen_debug.html");

    const result = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        
        // 1. Check for "Belum Ada Presensi" message
        if (bodyText.includes("Belum Ada Presensi Hari Ini!")) {
            return "✅ *Tidak ada jadwal presensi saat ini.*";
        }

        const buttons = Array.from(document.querySelectorAll('button, a.btn, div.btn'));
        const presensiBtn = buttons.find(b => {
             const text = b.innerText.toLowerCase();
             return text.includes('presensi') || text.includes('simpan') || text.includes('hadir');
        });

        if (presensiBtn) {
            presensiBtn.click();
            return "✅ *Berhasil Presensi!*";
        }

        return "❓ *Status Presensi Tidak Diketahui.*\nSilahkan cek manual di website.";
    });

    return result;
};

const startAbsenScraper = async (user) => {
    const { id, nim } = user;
    const browser = getBrowser(id);
    if (!browser) {
        return "Belum login. Silahkan ketik .login terlebih dahulu.";
    }

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    console.log(`Fetching presence data for user ${nim}...`);
    try {
        const result = await processAbsen(page);
        return result;
    } catch (err) {
        console.error("Error fetching presence data:", err);
        return "Terjadi kesalahan saat mengambil data presensi.";
    }
};

const startAutoAbsenLoop = async (browser, user) => {
    const { nim, id } = user;
    
    if (monitoringSessions.has(id)) {
        return "⚠️ Auto Absen sudah berjalan untuk akun ini.";
    }

    try {
        const page = await browser.newPage();
        console.log(`[AutoAbsen] Starting loop for ${nim} in new tab.`);
        
        // Initial navigation
        await page.goto(`${process.env.SIADIN_BASE_URL}/akademik/presensiOnline`, { waitUntil: 'networkidle2' });

        const intervalId = setInterval(async () => {
            try {
                // Determine if page is still open
                if (page.isClosed()) {
                     console.log(`[AutoAbsen] Page closed manually for ${nim}. Stopping loop.`);
                     stopAutoAbsenLoop(user);
                     return;
                }

                console.log(`[AutoAbsen] Checking presence for ${nim}...`);
                
                // Refresh page or navigate again
                if (!page.url().includes('presensiOnline')) {
                     await page.goto(`${process.env.SIADIN_BASE_URL}/akademik/presensiOnline`, { waitUntil: 'networkidle2' });
                } else {
                     await page.reload({ waitUntil: 'networkidle2' });
                }

                // Check and Click logic
                const clicked = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button, a.btn, div.btn'));
                    const presensiBtn = buttons.find(b => {
                        const text = b.innerText.toLowerCase();
                        return text.includes('presensi') || text.includes('simpan') || text.includes('hadir');
                    });

                    if (presensiBtn) {
                        presensiBtn.click();
                        return true;
                    }
                    return false;
                });

                if (clicked) {
                    console.log(`[AutoAbsen] CLICKED presensi for ${nim}!`);
                } else {
                    console.log(`[AutoAbsen] No button found for ${nim}.`);
                }

            } catch (err) {
                console.error(`[AutoAbsen] Loop error for ${nim}:`, err.message);
            }
        }, 60000); // Check every 60 seconds

        // Store session with page reference
        monitoringSessions.set(id, { intervalId, page });
        return "🚀 *Auto Absen Dimulai!*\nBot akan memantau presensi setiap 1 menit di tab baru.";

    } catch (err) {
        console.error("Error starting auto absen:", err);
        return "❌ Gagal memulai Auto Absen.";
    }
};

const startAutoAbsen = async (user) => {
    const { id, nim } = user;
    const browser = getBrowser(id);
    if (!browser) {
        return "Belum login. Silahkan ketik .login terlebih dahulu.";
    }

    console.log(`Initializing auto-absen for user ${nim}...`);
    return await startAutoAbsenLoop(browser, user);
};

const stopAutoAbsenLoop = async (user) => {
    const { id, nim } = user;
    if (!monitoringSessions.has(id)) {
        return "⚠️ Auto Absen tidak sedang berjalan.";
    }

    const session = monitoringSessions.get(id);
    
    // Clear interval
    clearInterval(session.intervalId);
    
    // Close page if open
    try {
        if (session.page && !session.page.isClosed()) {
            await session.page.close();
            console.log(`[AutoAbsen] Closed tab for ${nim}.`);
        }
    } catch (err) {
        console.error(`[AutoAbsen] Error closing tab for ${nim}:`, err);
    }

    monitoringSessions.delete(id);
    console.log(`[AutoAbsen] Stopped loop for ${nim}.`);
    return "🛑 *Auto Absen Dihentikan.*";
};

const stopAutoAbsen = async (user) => {
    return await stopAutoAbsenLoop(user);
}

module.exports = { startAbsenScraper, startAutoAbsen, stopAutoAbsen };
