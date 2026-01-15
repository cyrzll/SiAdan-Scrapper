const loginToSiAdin = async (page, username, password) => {
    try {
        console.log('Typing NIM...');
        await page.waitForSelector('input[name="username"]');
        await page.type('input[name="username"]', username);

        console.log('Typing Password...');
        await page.waitForSelector('input[name="password"]');
        await page.type('input[name="password"]', password);

        console.log('Clicking Login button in 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        const loginButton = await page.waitForSelector('button[type="submit"]');
        await loginButton.click();
        
        // Wait for navigation after login
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('Login submitted, checking new page title...');
        
        const newTitle = await page.title();
        console.log(`New Page Title: ${newTitle}`);
        return true;
    } catch (error) {
        console.error('Login failed:', error);
        throw error;
    }
};

module.exports = { loginToSiAdin };