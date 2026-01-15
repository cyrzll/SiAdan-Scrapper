const { getBrowser } = require('../../lib/browserManager');
const { processExamSchedule, getTodayExamSchedule } = require('../../lib/ujianScrap');
const { loginToSiAdin } = require('./webLogin');

const startExamScraper = async (user) => {
    const { id } = user;
    const browser = getBrowser(id);
    if (!browser) {
        return "Belum login. Silahkan ketik .login terlebih dahulu.";
    }

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    console.log(`Fetching exam schedule for user ${user.nim}...`);
    try {
        const schedule = await processExamSchedule(page);
        return schedule;
    } catch (err) {
        console.error("Error fetching schedule:", err);
        return "Terjadi kesalahan saat mengambil jadwal ujian.";
    }
};

const startDailyScraper = async (user) => {
    const { id, nim, password } = user;
    const browser = getBrowser(id);
    if (!browser) {
        return "Belum login. Silahkan ketik .login terlebih dahulu.";
    }

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    console.log(`Fetching daily schedule for user ${nim}...`);
    try {
        await page.goto(`${process.env.SIADIN_BASE_URL}/`, { waitUntil: 'networkidle2' });
        
        // 1. Check if session valid
        const isLoggedIn = await page.evaluate(() => {
            const text = document.body.innerText;
            return text.includes('Dashboard') || (text.includes('Keluar') && !text.includes('Konfirmasi Keluar'));
        });

        if (isLoggedIn) {
             console.log(`Session valid for ${nim}. Proceeding to scrape...`);
        } else {
            console.log(`Session expired for ${nim}, re-logging in...`);
            if (!password) return "Gagal login ulang. Silahkan ketik .login manual.";
            
            // Perform Login
            await loginToSiAdin(page, nim, password);
        }

        let output = "";

        // 1. Scrape Dashboard for Classes
        const scheduleText = await page.evaluate(() => {
            const result = [];
            
            // Refined Selector Strategy for "Jadwal Hari Ini"
            const allElements = Array.from(document.querySelectorAll('*'));
            const title = allElements.find(el => el.innerText && el.innerText.trim().includes('Jadwal Hari Ini') && ['H1','H2','H3','H4','H5','H6','P','SPAN'].includes(el.tagName));
            
            if (!title) return null;
            
            let container = title.parentElement;
            let wrapper = null;
            let attempts = 0;
            while(container && attempts < 4) {
                const next = container.nextElementSibling;
                if (next && next.innerText.includes('schedule')) {
                    wrapper = next;
                    break;
                }
                if (container.querySelector && container.querySelector('.grid')) {
                    if(container.innerText.includes('schedule')) {
                         wrapper = container; 
                         break;
                    }
                }
                container = container.parentElement;
                attempts++;
            }
            
            if (!wrapper) return null;

            // Extract cards
            const cards = Array.from(wrapper.querySelectorAll('.bg-white, .card, div.rounded-lg, div.rounded-xl')); 
            const scheduleCards = cards.filter(c => c.innerText.includes('schedule') && c.innerText.includes('location_on'));

            scheduleCards.forEach(card => {
                const text = card.innerText;
                const lines = text.split('\n').map(l => l.trim()).filter(l => l);
                
                let courseName = lines[0];
                let time = '';
                let room = '';
                
                const scheduleIdx = lines.findIndex(l => l === 'schedule' || l.includes('schedule'));
                if (scheduleIdx !== -1 && lines[scheduleIdx+1]) {
                    time = lines[scheduleIdx+1];
                }
                
                const locationIdx = lines.findIndex(l => l === 'location_on' || l.includes('location_on'));
                if (locationIdx !== -1 && lines[locationIdx+1]) {
                    room = lines[locationIdx+1];
                }
                
                if (courseName && time) {
                    result.push({ courseName, time, room });
                }
            });
            
            return result;
        });

        if (scheduleText && Array.isArray(scheduleText) && scheduleText.length > 0) {
            output += '📅 *JADWAL KULIAH HARI INI*\n';
            scheduleText.forEach(item => {
                output += `\n📚 *${item.courseName}*\n`;
                output += `   ⏰ ${item.time}\n`;
                output += `   📍 ${item.room}\n`;
            });
        } else {
             output += "✅ *Tidak ada jadwal kuliah hari ini*.\n";
        }

        // 2. Fetch Exams (Today Only)
        const examOutput = await getTodayExamSchedule(page);
        if (examOutput) {
            output += `\n${examOutput}`;
        }
        
        if (page.url().includes('jadwalUjian')) {
             await page.goto(`${process.env.SIADIN_BASE_URL}/`, { waitUntil: 'load' });
        }

        return output;

    } catch (err) {
        console.error("Error fetching daily schedule:", err);
        return "Terjadi kesalahan saat mengambil jadwal hari ini.";
    }
};

module.exports = { startExamScraper, startDailyScraper };
