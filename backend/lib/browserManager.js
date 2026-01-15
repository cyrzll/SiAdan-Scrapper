const puppeteer = require('puppeteer');
const path = require('path');

const browserStore = new Map();

/**
 * Gets an existing browser instance or launches a new one.
 * @param {Object} user - User object containing {id, nim, profil}
 * @returns {Promise<import('puppeteer').Browser>}
 */
const getOrLaunchBrowser = async (user) => {
    const { id, nim, profil } = user;

    if (browserStore.has(id)) {
        console.log(`Browser already open for user ${nim}. Reusing instance...`);
        return browserStore.get(id);
    }

    let launchOptions = {
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=475,738']
    };

    if (profil && profil.trim() !== '') {
        const userDataDir = path.resolve(__dirname, '../../.browser_profiles', profil);
        launchOptions.userDataDir = userDataDir;
        console.log(`Using profile directory: ${userDataDir}`);
    }

    try {
        const browser = await puppeteer.launch(launchOptions);
        browserStore.set(id, browser);
        
        // Ensure store is cleaned up on disconnect
        browser.on('disconnected', () => {
            if (browserStore.get(id) === browser) {
                browserStore.delete(id);
            }
        });

        return browser;
    } catch (err) {
        console.error(`Error launching browser for user ${nim}:`, err.message);
        throw err;
    }
};

/**
 * Gets an existing browser instance if available.
 * @param {string|number} userId 
 * @returns {import('puppeteer').Browser|undefined}
 */
const getBrowser = (userId) => {
    return browserStore.get(userId);
};

/**
 * Closes the browser for a user.
 * @param {string|number} userId 
 */
const closeBrowser = async (userId) => {
    if (browserStore.has(userId)) {
        const browser = browserStore.get(userId);
        await browser.close();
        browserStore.delete(userId);
    }
};

module.exports = {
    getOrLaunchBrowser,
    getBrowser,
    closeBrowser,
    browserStore // Exporting raw store carefully if specific direct access is needed
};
