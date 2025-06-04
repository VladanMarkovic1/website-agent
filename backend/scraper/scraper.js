import puppeteer from 'puppeteer-core';
import saveScrapedData from '../scraper/saveScrapedData.js';

// Configuration constants
const CONFIG = {
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000, // 2 seconds
    PAGE_TIMEOUT: 60000, // Increased to 60 seconds
    SCRAPE_TIMEOUT: 120000, // 2 minutes total
};

// Validation functions
const validateData = {
    phone: (phone) => {
        return phone && phone.match(/[\d\s+\-()]+/);
    },
    email: (email) => {
        return email && email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    },
    services: (services) => {
        return Array.isArray(services) && services.length > 0;
    }
};

// Helper function for delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry failed operations
async function withRetry(operation, name, maxAttempts = CONFIG.RETRY_ATTEMPTS) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxAttempts) {
                throw error;
            }
            console.log(`⚠️ Attempt ${attempt} failed for ${name}. Retrying in ${CONFIG.RETRY_DELAY/1000}s...`);
            await delay(CONFIG.RETRY_DELAY);
        }
    }
}

const scrapeBusinessData = async (business) => {
    const startTime = Date.now();
    
    const browser = await puppeteer.launch({ 
        headless: true,
        executablePath: process.env.NODE_ENV === 'production' 
            ? '/opt/render/project/src/backend/node_modules/puppeteer/.local-chromium/linux-*/chrome-linux/chrome'
            : process.platform === 'win32' 
                ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
                : process.platform === 'linux'
                ? '/usr/bin/google-chrome'
                : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ]
    });
    
    try {
        const page = await browser.newPage();
        
        // Set longer timeouts
        await page.setDefaultNavigationTimeout(CONFIG.PAGE_TIMEOUT);
        
        // 1. Scrape Main Page
        try {
            await page.goto(business.websiteUrl, { 
                waitUntil: 'domcontentloaded',
                timeout: CONFIG.PAGE_TIMEOUT 
            });
            
            // Simple delay instead of waitForTimeout
            await delay(3000);

            // 2. Scrape Services
            const rawServices = await page.evaluate((serviceSelector) => {
                return Array.from(document.querySelectorAll(serviceSelector))
                    .map(el => el.textContent.trim())
                    .filter(text => text.length > 0);
            }, business.selectors.serviceSelector);

            const services = rawServices.filter(text =>
                text.length > 3 &&
                !text.includes("Dr") &&
                !text.match(/Doctor|Meet|Our Team|Reviews|Testimonials|News|About|Specialist|Physician|Surgeon|Contact/i)
            );

            // 3. Scrape Contact Details
            const contactDetails = await page.evaluate((selectors) => {
                return {
                    phone: document.querySelector(selectors.phone)?.textContent.trim() || "Not found",
                    email: document.querySelector(selectors.email)?.textContent.trim() || "Not found"
                };
            }, business.selectors.contactSelector);

            // 4. Scrape FAQs
            let faqs = [];
            try {
                await page.goto(`${business.websiteUrl}/faq`, { 
                    waitUntil: 'domcontentloaded',
                    timeout: CONFIG.PAGE_TIMEOUT 
                });
                
                await delay(3000);

                if (business.selectors?.faqsSelector?.question && business.selectors?.faqsSelector?.answer) {
                    const questions = await page.evaluate((selector) => {
                        return Array.from(document.querySelectorAll(selector))
                            .map(el => el.textContent.trim());
                    }, business.selectors.faqsSelector.question);

                    const answers = await page.evaluate((selector) => {
                        return Array.from(document.querySelectorAll(selector))
                            .map(el => el.textContent.trim());
                    }, business.selectors.faqsSelector.answer);

                    faqs = questions.map((q, i) => ({
                        question: q,
                        answer: answers[i] || "No answer found"
                    }));
                }
            } catch (faqError) {
                console.log("⚠️ Could not scrape FAQs:", faqError.message);
                // Continue without FAQs
            }

            // Save all scraped data
            const scrapedData = { services, contactDetails, faqs };
            await saveScrapedData(business.businessId, scrapedData);

            const duration = (Date.now() - startTime) / 1000;

        } catch (navigationError) {
            console.error('Navigation error:', navigationError.message);
            throw navigationError;
        }

    } catch (error) {
        console.error(`❌ Fatal error during scraping for ${business.businessName}:`, error);
        throw error;
    } finally {
        await browser.close();
    }
};

export default scrapeBusinessData;
