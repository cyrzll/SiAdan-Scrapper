const scrapeExamData = async (page) => {
    // ... (existing scraping logic) ...
    // I need to copy the scraping logic here or reuse it.
    // To minimize code churn, I will keep processExamSchedule as the main entry point but split it internally?
    // Actually, I'll just duplicate the scraping part/extract it to a helper function inside processExamSchedule?
    // No, I need it exported.
    
    // Let's refactor processExamSchedule to be:
    // const scrapeExams = async(page) => { ... returns object ... }
    // const processExamSchedule = async(page) => { const data = await scrapeExams(page); return format(data); }
    // const getTodayExamsString = async(page) => { const data = await scrapeExams(page); return formatToday(data); }
    
    // Just copying the scrape logic is cleaner for the diff than extensive refactoring.
    // I will Extract the scraping logic to `scrapeExams`.
    
    await page.goto(`${process.env.SIADIN_BASE_URL}/akademik/jadwalUjian`, { waitUntil: 'networkidle2' });
     try {
        await page.waitForSelector('table', { timeout: 10000 });
        
        const allSchedules = await page.evaluate(() => {
            const results = [];
            const headerSelectors = [
                { keyword: 'Tengah Semester', type: 'UTS' },
                { keyword: 'Akhir Semester', type: 'UAS' }
            ];

            const extractTableData = (table, type, contextHeader) => {
                 const rows = Array.from(table.querySelectorAll('tbody tr'));
                 const data = rows.map(row => {
                    const cells = Array.from(row.querySelectorAll('td'));
                    return cells.map(cell => cell.innerText.trim());
                 });
                 let heading = contextHeader;
                 let current = table.parentElement;
                 while (current && current !== document.body) {
                     const h3 = current.querySelector('h3');
                     if (h3) {
                         heading = h3.innerText.trim();
                         break;
                     }
                     if (current.classList.contains('grid') || current.classList.contains('mb-4')) break;
                     current = current.parentElement;
                 }
                 return { type, heading, courseName: heading, data, tableRef: table };
            };
            
            const headersNodes = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, span'));
            const processedTables = new Set();

            headerSelectors.forEach(selector => {
                const matches = headersNodes.filter(el => {
                    const text = el.innerText || '';
                    return text.includes('Jadwal Ujian') && text.includes(selector.keyword);
                });
                matches.forEach(header => {
                    let container = header.parentElement;
                    let contentContainer = container ? container.nextElementSibling : null;
                    if (contentContainer && contentContainer.querySelectorAll('table').length > 0) {
                        const tables = Array.from(contentContainer.querySelectorAll('table'));
                        tables.forEach(table => {
                             if (!processedTables.has(table)) {
                                 results.push(extractTableData(table, selector.type, selector.keyword));
                                 processedTables.add(table);
                             }
                        });
                    }
                });
            });

            if (results.length === 0) {
                const tables = Array.from(document.querySelectorAll('table'));
                tables.forEach(table => {
                     let type = 'Lainnya';
                     let heading = 'Jadwal Ujian';
                     let curr = table;
                     for(let i=0; i<6; i++) {
                         if(curr && curr.previousElementSibling) {
                             const text = curr.previousElementSibling.innerText || '';
                             if(text.includes('Tengah Semester')) type = 'UTS';
                             if(text.includes('Akhir Semester')) type = 'UAS';
                         }
                         if(curr) curr = curr.parentElement;
                     }
                     let nameCurr = table.parentElement;
                     while (nameCurr && nameCurr !== document.body) {
                         const h3 = nameCurr.querySelector('h3');
                         if(h3) { heading = h3.innerText.trim(); break; }
                         if (nameCurr.classList.contains('grid')) break;
                         nameCurr = nameCurr.parentElement;
                     }
                     const rows = Array.from(table.querySelectorAll('tbody tr'));
                     const data = rows.map(row => Array.from(row.querySelectorAll('td')).map(c=>c.innerText.trim()));
                     results.push({type, heading, courseName: heading, data});
                });
            }
            return results.map(r => ({type: r.type, heading: r.heading, courseName: r.courseName, data: r.data}));
        });
        
        return allSchedules;
    } catch (e) {
        return [];
    }
};

const parseExamDate = (dateStr) => {
    try {
        const cleaned = dateStr.replace(/,/g, '');
        const parts = cleaned.trim().split(/\s+/);
        if (parts.length < 4) return null;
        const day = parseInt(parts[1]);
        const monthStr = parts[2];
        const year = parseInt(parts[3]);
        const months = {
            'January': 0, 'Januari': 0,
            'February': 1, 'Februari': 1,
            'March': 2, 'Maret': 2,
            'April': 3,
            'May': 4, 'Mei': 4,
            'June': 5, 'Juni': 5,
            'July': 6, 'Juli': 6,
            'August': 7, 'Agustus': 7,
            'September': 8,
            'October': 9, 'Oktober': 9,
            'November': 10,
            'December': 11, 'Desember': 11
        };
        const month = months[monthStr];
        if (month === undefined) return null;
        return new Date(year, month, day);
    } catch (e) {
        return null;
    }
};

const processExamSchedule = async (page) => {
    const allSchedules = await scrapeExamData(page);
    if (!allSchedules.length) return "Gagal mengambil jadwal ujian. Pastikan tabel jadwal tersedia.";

    const sortOrder = { 'UTS': 1, 'UAS': 2, 'Lainnya': 3 };
    allSchedules.sort((a, b) => (sortOrder[a.type] || 3) - (sortOrder[b.type] || 3));

    let output = '';
    output += '🗓️ *JADWAL UJIAN MAHASISWA*\n';

    let currentType = null;
    allSchedules.forEach((schedule) => {
        if (schedule.type !== currentType) {
            currentType = schedule.type;
            output += `\n📂 *${currentType.toUpperCase()}*\n`;
        }
        output += `\n📘 *${schedule.courseName}*\n`;
        if (schedule.data.length === 0) {
            output += '   _(Tidak ada jadwal)_\n';
        } else {
            schedule.data.forEach((row) => {
                 if (row.length >= 3) {
                    const date = row[0] || '-';
                    const time = row[1] || '-';
                    const room = row[2] || '-';
                    const seat = row[3] || '-';
                    const type = row[4] || '-';
                    output += `   🗓  ${date}\n   ⏰  ${time}\n   📍  ${room}  |  🪑 ${seat} (${type})\n`;
                 } else {
                    output += `   ❓ Data tidak lengkap\n`;
                 }
            });
        }
    });

    const allRows = [];
    allSchedules.forEach(schedule => {
        schedule.data.forEach(row => {
            if (row.length > 0) {
                const date = parseExamDate(row[0]);
                if (date) {
                    allRows.push({ date, row, heading: schedule.heading, courseName: schedule.courseName });
                }
            }
        });
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const candidates = allRows.map(item => {
        const diffTime = item.date - today;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        return { ...item, diffDays };
    }).filter(item => item.diffDays >= -1);

    candidates.sort((a, b) => {
        const aIsFuture = a.diffDays >= 0;
        const bIsFuture = b.diffDays >= 0;
        if (aIsFuture && !bIsFuture) return -1;
        if (!aIsFuture && bIsFuture) return 1;
        return a.diffDays - b.diffDays;
    });

    if (candidates.length > 0) {
        output += '\n--------------------------------\n*⚡ UJIAN TERDEKAT*\n';
        const closest = candidates[0];
        let label = "";
        if (closest.diffDays === -1) label = " (Kemarin)";
        else if (closest.diffDays === 0) label = " (Hari Ini)";
        else if (closest.diffDays === 1) label = " (Besok)";
        else if (closest.diffDays > 1) label = ` (Dalam ${closest.diffDays} hari)`;
        
        output += `\n⭐ *${closest.courseName}*${label}\n📅 ${closest.row[0]}\n⏰ ${closest.row[1]}\n🏫 ${closest.row[2]}\n`;
    } else {
        output += '\n✅ *Tidak ada jadwal ujian terdekat.*\n';
    }

    return output;
};

const getTodayExamSchedule = async (page) => {
    const allSchedules = await scrapeExamData(page);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todayExams = [];
    allSchedules.forEach(schedule => {
        schedule.data.forEach(row => {
             const date = parseExamDate(row[0]);
             if (date) {
                 const diffTime = date - today;
                 const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                 if (diffDays === 0) {
                     todayExams.push({ ...schedule, row });
                 }
             }
        });
    });

    if (todayExams.length === 0) return ""; // Return empty if no exams today

    let output = '\n📝 *JADWAL UJIAN HARI INI*\n';
    todayExams.forEach(exam => {
        output += `\n📘 *${exam.courseName}*\n`;
        output += `   ⏰ ${exam.row[1]}\n`;
        output += `   📍 ${exam.row[2]} (Ruang: ${exam.row[3]})\n`;
    });
    return output;
};

module.exports = { processExamSchedule, getTodayExamSchedule };
