console.log("🔄 IMPORTING PLAYWRIGHT...");
import { webkit } from 'playwright';
console.log("✅ WEBKIT IMPORTED SUCCESSFULLY (LIGHTER THAN CHROMIUM)");
console.log("🔄 IMPORTING SAVE SCRAPED DATA...");
import saveScrapedData from '../scraper/saveScrapedData.js';
console.log("✅ SAVE SCRAPED DATA IMPORTED SUCCESSFULLY");

// Configuration constants
const CONFIG = {
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000, // 2 seconds
    PAGE_TIMEOUT: 60000, // Increased to 60 seconds
    SCRAPE_TIMEOUT: 120000, // 2 minutes total
};

console.log("✅ CONFIG OBJECT CREATED");

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

console.log("✅ VALIDATION FUNCTIONS CREATED");

// Helper function for delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry failed operations
async function withRetry(operation, name, maxAttempts = CONFIG.RETRY_ATTEMPTS) {
    console.log(`🔄 STARTING RETRY OPERATION: ${name}`);
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`🔄 ATTEMPT ${attempt}/${maxAttempts} FOR: ${name}`);
            const result = await operation();
            console.log(`✅ SUCCESS ON ATTEMPT ${attempt} FOR: ${name}`);
            return result;
        } catch (error) {
            console.log(`❌ ATTEMPT ${attempt} FAILED FOR: ${name}`, error.message);
            if (attempt === maxAttempts) {
                console.log(`🚨 ALL ATTEMPTS FAILED FOR: ${name}`);
                throw error;
            }
            console.log(`⚠️ Attempt ${attempt} failed for ${name}. Retrying in ${CONFIG.RETRY_DELAY/1000}s...`);
            await delay(CONFIG.RETRY_DELAY);
        }
    }
}

console.log("✅ HELPER FUNCTIONS CREATED");

const scrapeBusinessData = async (business) => {
    console.log("🚀 STARTING SCRAPE BUSINESS DATA FUNCTION");
    console.log("📋 BUSINESS DATA:", JSON.stringify(business, null, 2));
    
    const startTime = Date.now();
    console.log('=== Playwright Debug Info ===');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PWD:', process.env.PWD);
    console.log('__dirname:', typeof __dirname !== 'undefined' ? __dirname : 'undefined');
    console.log('process.cwd():', process.cwd());
    
    let browser = null;
    let page = null;
    
    try {
        console.log('🔄 ATTEMPTING TO LAUNCH PLAYWRIGHT WEBKIT...');
        console.log('🔄 WEBKIT LAUNCH OPTIONS:', {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        
        // Log memory before browser launch
        console.log('📊 MEMORY BEFORE BROWSER LAUNCH:', process.memoryUsage());
        
        browser = await webkit.launch({
            headless: true,
            timeout: 30000, // 30 second timeout
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        console.log('✅ WEBKIT LAUNCHED SUCCESSFULLY!');
        
        console.log('🔄 CREATING NEW PAGE...');
        page = await browser.newPage();
        console.log('✅ NEW PAGE CREATED SUCCESSFULLY');
        
        // Set longer timeouts
        console.log('🔄 SETTING PAGE TIMEOUTS...');
        await page.setDefaultNavigationTimeout(CONFIG.PAGE_TIMEOUT);
        console.log('✅ PAGE TIMEOUTS SET');
        
        // 1. Scrape Main Page
        try {
            console.log('🔄 NAVIGATING TO MAIN PAGE:', business.websiteUrl);
            await page.goto(business.websiteUrl, { 
                waitUntil: 'domcontentloaded',
                timeout: CONFIG.PAGE_TIMEOUT 
            });
            console.log('✅ NAVIGATION TO MAIN PAGE SUCCESSFUL');
            
            // Simple delay instead of waitForTimeout
            console.log('🔄 WAITING 3 SECONDS FOR PAGE TO LOAD...');
            await delay(3000);
            console.log('✅ PAGE LOAD DELAY COMPLETED');

            // 2. Scrape Services
            console.log('🔄 SCRAPING SERVICES...');
            console.log('🔄 SERVICE SELECTOR:', business.selectors?.serviceSelector);
            const rawServices = await page.evaluate((serviceSelector) => {
                console.log('📄 EVALUATING SERVICE SELECTOR IN PAGE:', serviceSelector);
                const elements = document.querySelectorAll(serviceSelector);
                console.log('📄 FOUND ELEMENTS:', elements.length);
                return Array.from(elements)
                    .map(el => el.textContent.trim())
                    .filter(text => text.length > 0);
            }, business.selectors?.serviceSelector || 'h1, h2, h3');
            console.log('✅ RAW SERVICES SCRAPED:', rawServices);

            const services = rawServices.filter(text =>
                text.length > 3 &&
                !text.includes("Dr") &&
                !text.match(/Doctor|Meet|Our Team|Reviews|Testimonials|News|About|Specialist|Physician|Surgeon|Contact/i)
            );
            console.log('✅ FILTERED SERVICES:', services);

            // 3. Scrape Contact Details
            console.log('🔄 SCRAPING CONTACT DETAILS...');
            console.log('🔄 CONTACT SELECTORS:', business.selectors?.contactSelector);
            const contactDetails = await page.evaluate((selectors) => {
                console.log('📄 EVALUATING CONTACT SELECTORS IN PAGE:', selectors);
                return {
                    phone: document.querySelector(selectors?.phone || 'a[href^="tel:"]')?.textContent.trim() || "Not found",
                    email: document.querySelector(selectors?.email || 'a[href^="mailto:"]')?.textContent.trim() || "Not found"
                };
            }, business.selectors?.contactSelector || {});
            console.log('✅ CONTACT DETAILS SCRAPED:', contactDetails);

            // 4. Scrape FAQs
            let faqs = [];
            console.log('🔄 ATTEMPTING TO SCRAPE FAQS...');
            try {
                const faqUrl = `${business.websiteUrl}/faq`;
                console.log('🔄 NAVIGATING TO FAQ PAGE:', faqUrl);
                await page.goto(faqUrl, { 
                    waitUntil: 'domcontentloaded',
                    timeout: CONFIG.PAGE_TIMEOUT 
                });
                console.log('✅ NAVIGATION TO FAQ PAGE SUCCESSFUL');
                
                console.log('🔄 WAITING 3 SECONDS FOR FAQ PAGE TO LOAD...');
                await delay(3000);
                console.log('✅ FAQ PAGE LOAD DELAY COMPLETED');

                if (business.selectors?.faqsSelector?.question && business.selectors?.faqsSelector?.answer) {
                    console.log('🔄 SCRAPING FAQ QUESTIONS AND ANSWERS...');
                    const questions = await page.evaluate((selector) => {
                        console.log('📄 EVALUATING FAQ QUESTION SELECTOR:', selector);
                        return Array.from(document.querySelectorAll(selector))
                            .map(el => el.textContent.trim());
                    }, business.selectors.faqsSelector.question);

                    const answers = await page.evaluate((selector) => {
                        console.log('📄 EVALUATING FAQ ANSWER SELECTOR:', selector);
                        return Array.from(document.querySelectorAll(selector))
                            .map(el => el.textContent.trim());
                    }, business.selectors.faqsSelector.answer);

                    faqs = questions.map((q, i) => ({
                        question: q,
                        answer: answers[i] || "No answer found"
                    }));
                    console.log('✅ FAQS SCRAPED:', faqs);
                } else {
                    console.log('⚠️ NO FAQ SELECTORS PROVIDED');
                }
            } catch (faqError) {
                console.log("⚠️ Could not scrape FAQs:", faqError.message);
                // Continue without FAQs
            }

            // Save all scraped data
            console.log('🔄 SAVING SCRAPED DATA...');
            const scrapedData = { services, contactDetails, faqs };
            console.log('📊 FINAL SCRAPED DATA:', JSON.stringify(scrapedData, null, 2));
            await saveScrapedData(business.businessId, scrapedData);
            console.log('✅ SCRAPED DATA SAVED SUCCESSFULLY');

            const duration = (Date.now() - startTime) / 1000;
            console.log(`🎉 SCRAPING COMPLETED SUCCESSFULLY IN ${duration} SECONDS`);

        } catch (navigationError) {
            console.error('🚨 NAVIGATION ERROR:', navigationError.message);
            console.error('🚨 NAVIGATION ERROR STACK:', navigationError.stack);
            throw navigationError;
        }

    } catch (error) {
        console.error('🚨 PLAYWRIGHT LAUNCH ERROR:', error.message);
        console.error('🚨 PLAYWRIGHT ERROR STACK:', error.stack);
        throw error;
    } finally {
        console.log('🔄 CLEANING UP BROWSER RESOURCES...');
        try {
            if (page) {
                console.log('🔄 CLOSING PAGE...');
                await page.close();
                console.log('✅ PAGE CLOSED');
            }
            if (browser) {
                console.log('🔄 CLOSING BROWSER...');
                await browser.close();
                console.log('✅ BROWSER CLOSED');
            }
        } catch (cleanupError) {
            console.error('🚨 CLEANUP ERROR:', cleanupError.message);
        }
        console.log('✅ CLEANUP COMPLETED');
    }
};

console.log("✅ SCRAPE BUSINESS DATA FUNCTION DEFINED");

export default scrapeBusinessData;
