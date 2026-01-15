const puppeteer = require('puppeteer');
const path = require('path');
const { browserStore } = require('../../lib/browserManager');

async function logoutToSiAdin(user) {
    const { nim, profil, id } = user;
    
    console.log(`--------------------------------------------------`);
    console.log(`Starting logout for user: ${nim}`);

    let browser;
    let page;

    // Check if we have an active browser instance
    if (browserStore.has(id)) {
        console.log("Found active browser session, reusing...");
        browser = browserStore.get(id);
        const pages = await browser.pages();
        page = pages.length > 0 ? pages[0] : await browser.newPage();
    } else {
        console.log("No active browser session found in memory.");
        // If we want to support logout from a fresh start (e.g. after server restart),
        // we would need to check if the profile is locked or not.
        // For now, based on user flow, we assume they logged in via this server session.
        // Attempting to launch might fail if "Browser is already running".
        
        let launchOptions = {
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        };

        if (profil && profil.trim() !== '') {
            const userDataDir = path.resolve(__dirname, '../../.browser_profiles', profil);
            launchOptions.userDataDir = userDataDir;
            console.log(`Using profile directory for logout: ${userDataDir}`);
        }

        try {
            browser = await puppeteer.launch(launchOptions);
            page = await browser.newPage();
        } catch (err) {
            console.error("Failed to launch browser (likely already running externally):", err.message);
            return false;
        }
    }

    try {
        console.log(`Navigating to dashboard...`);
        // Ensure we are on the main page
        if (!page.url().includes('mhs.dinus.ac.id')) {
            await page.goto(`${process.env.SIADIN_BASE_URL}/`, { waitUntil: 'networkidle2' });
        }

        const title = await page.title();
        console.log("Current Page Title:", title);

        if (title.includes("Login") || page.url().includes("login")) {
            console.log("User is already logged out.");
            if (!browserStore.has(id)) await browser.close(); 
            return true;
        }

        // Check if login form is present (meaning we are already logged out)
        const loginForm = await page.$('input[name="username"]');
        if (loginForm) {
            console.log("Login form detected, user is already logged out.");
            if (!browserStore.has(id)) await browser.close();
            return true;
        }

        console.log("Attempting to click 'Keluar'...");
        
        // Debug: Check if 'Keluar' exists in the text content of the page
        const bodyText = await page.evaluate(() => document.body.innerText);
        console.log("Page contains 'Keluar'?", bodyText.includes('Keluar'));
        
        // 1. Click "Keluar" - Search all elements (button, a, span, div) checking text directly
        const logoutFound = await page.evaluate(() => {
            // Helper to check text
            const hasText = (el) => {
                const text = el.innerText || el.textContent;
                return text && (text.trim() === 'Keluar' || text.trim() === 'Logout');
            };

            // Strategy 1: Look for button or a tags first
            const clickables = Array.from(document.querySelectorAll('a, button, span.btn, div.btn'));
            let target = clickables.find(el => hasText(el));
            
            // Strategy 2: If not found, look for any element with the text, but try to find the most specific one
            if (!target) {
                const all = Array.from(document.querySelectorAll('*'));
                target = all.find(el => hasText(el) && el.children.length === 0); // Leaf node with text
            }

            if (target) {
                target.scrollIntoView();
                target.click();
                return true;
            }
            
            // Strategy 3: Setup for dropdown? 
            // If we didn't find specific 'Keluar', maybe looked for a profile dropdown? 
            // For now, let's just return false and let the user see the log.
            return false;
        });
        
        if (logoutFound) {
            console.log("Clicked 'Keluar'. Waiting for confirmation modal...");
            
            // 2. Wait for modal "konfirmasi keluar" and click "ya"
            try {
                // Wait for any button/link with text "Ya" or "Yes"
                await page.waitForFunction(() => {
                    const buttons = Array.from(document.querySelectorAll('button, a'));
                    return buttons.some(b => b.textContent.trim().toLowerCase() === 'ya' || b.textContent.trim().toLowerCase() === 'yes');
                }, { timeout: 5000 });
                
                const confirmed = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button, a'));
                    const yaBtn = buttons.find(b => b.textContent.trim().toLowerCase() === 'ya' || b.textContent.trim().toLowerCase() === 'yes');
                    if (yaBtn) {
                        yaBtn.click();
                        return true;
                    }
                    return false;
                });

                if (confirmed) {
                    await page.waitForNavigation({ waitUntil: 'networkidle2' });
                    console.log("Logout confirmed.");
                }
            } catch (modalErr) {
                console.log("Confirmation modal not matching expected 'Ya' button or timed out:", modalErr.message);
            }
            
        } else {
             console.log("'Keluar' button not found, trying fallback URL...");
             await page.goto(`${process.env.SIADIN_BASE_URL}/logout`, { waitUntil: 'networkidle2' });
        }

        console.log(`Logout complete for ${nim}.`);
        
        // Close browser after logout and remove from store
        // await browser.close();
        // browserStore.delete(id);
        console.log("Browser left open after logout.");
        return true;
        
    } catch (err) {
        console.error(`Error logging out for user ${nim}:`, err.message);
        // Do not close if error, so we can debug, unless it was a fresh launch
        if (!browserStore.has(id)) {
             if (browser) await browser.close();
        }
        return false;
    }
}

module.exports = { logoutToSiAdin };
