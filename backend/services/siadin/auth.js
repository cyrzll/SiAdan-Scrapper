const { getOrLaunchBrowser, closeBrowser, getBrowser } = require('../../lib/browserManager');
const { loginToSiAdin } = require('./webLogin');

const loginUser = async (user) => {
    const { nim, password, id } = user;
    
    if (!nim || !password) {
        console.log(`Skipping user with missing credentials.`);
        return false;
    }

    console.log(`--------------------------------------------------`);
    console.log(`Starting login for user: ${nim}`);

    let browser;
    try {
        browser = await getOrLaunchBrowser(user);
    } catch (err) {
        return false;
    }

    let page;
    try {
        const pages = await browser.pages();
        page = pages.length > 0 ? pages[0] : await browser.newPage();

        // Navigation and Login Logic
        console.log(`Navigating to ${process.env.SIADIN_BASE_URL}/ for ${nim}...`);
        await page.goto(`${process.env.SIADIN_BASE_URL}/`, { waitUntil: 'networkidle2' });
        
        // Helper to scrape dashboard data
        const scrapeDashboardData = async () => {
             console.log("Waiting for dashboard to load...");
             try {
                // Wait for the specific data content to appear
                await page.waitForFunction(() => document.body.innerText.includes('Statistik Akademik'), { timeout: 15000 });
             } catch (e) {
                console.log("Timeout waiting for 'Statistik Akademik', trying to scrape anyway...");
             }

             return await page.evaluate(() => {
                const data = {
                    name: "Mahasiswa",
                    email: "-",
                    stats: { mk: "-", sks: "-", ipk: "-" }
                };

                // Scrape Name & Email
                const sidebarContainer = document.querySelector('aside .text-center');
                if (sidebarContainer) {
                    const paragraphs = Array.from(sidebarContainer.querySelectorAll('p'));
                    if (paragraphs.length >= 1) data.name = paragraphs[0].innerText.trim();
                    const emailP = paragraphs.find(p => p.innerText.includes('@'));
                    if (emailP) data.email = emailP.innerText.trim();
                }
                
                const getStatValue = (label) => {
                    const allElems = Array.from(document.querySelectorAll('*'));
                    const labelElem = allElems.find(el => el.innerText === label && el.children.length === 0);
                    
                    if (labelElem) {
                        if (labelElem.previousElementSibling) {
                             const val = labelElem.previousElementSibling.innerText.trim();
                             if (val.match(/[\d\.]+/)) return val;
                        }
                        if (labelElem.parentElement && labelElem.parentElement.previousElementSibling) {
                             const val = labelElem.parentElement.previousElementSibling.innerText.trim();
                             if (val.match(/[\d\.]+/)) return val;
                        }
                    }
                    return "-";
                };

                data.stats.mk = getStatValue('Mata Kuliah') || getStatValue('Mata Kuliah Icon');
                data.stats.sks = getStatValue('Total SKS');
                data.stats.ipk = getStatValue('IPK');

                return data;
             });
        };

        // Check login status
        const isLoggedIn = await page.evaluate(() => {
            const text = document.body.innerText;
            return text.includes('Dashboard') || text.includes('Keluar') || text.includes('Logout');
        });

        if (isLoggedIn) {
            console.log(`User ${nim} is already logged in.`);
            const data = await scrapeDashboardData();
            return { status: 'ALREADY_LOGGED_IN', data };
        }
        
        const loginFormExists = await page.$('input[name="username"]');
        if (!loginFormExists) {
             const data = await scrapeDashboardData();
             return { status: 'ALREADY_LOGGED_IN', data };
        }
        
        console.log("Login form detected, proceeding to login...");
        await loginToSiAdin(page, nim, password);
        
        console.log(`Login complete for ${nim}.`);
        console.log(`Browser left open for ${nim}.`);
        const finalData = await scrapeDashboardData();
        return { status: 'SUCCESS', data: finalData };

    } catch (err) {
        console.error(`Error logging in for user ${nim}:`, err.message);
        await closeBrowser(id);
        return false;
    }
};

module.exports = { loginUser };
