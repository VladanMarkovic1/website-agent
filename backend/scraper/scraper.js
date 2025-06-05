console.log("🔄 IMPORTING CHEERIO (NO BROWSER NEEDED)...");
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
console.log("✅ CHEERIO AND FETCH IMPORTED SUCCESSFULLY");
console.log("🔄 IMPORTING SAVE SCRAPED DATA...");
import saveScrapedData from '../scraper/saveScrapedData.js';
console.log("✅ SAVE SCRAPED DATA IMPORTED SUCCESSFULLY");

// Configuration constants
const CONFIG = {
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000, // 2 seconds
    PAGE_TIMEOUT: 30000, // 30 seconds
    SCRAPE_TIMEOUT: 60000, // 1 minute total
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
    console.log('=== Cheerio Scraping (No Browser) ===');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('📊 MEMORY BEFORE SCRAPING:', process.memoryUsage());
    
    try {
        console.log('🔄 MAKING HTTP REQUEST TO WEBSITE...');
        console.log('🔄 TARGET URL:', business.websiteUrl);
        
        // Fetch the webpage with timeout
        const response = await fetch(business.websiteUrl, {
            timeout: CONFIG.PAGE_TIMEOUT,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.log('✅ HTTP REQUEST SUCCESSFUL');
        console.log('📊 Response status:', response.status);
        
        const html = await response.text();
        console.log('✅ HTML CONTENT RECEIVED');
        console.log('📊 HTML length:', html.length);
        
        // Parse HTML with Cheerio
        console.log('🔄 PARSING HTML WITH CHEERIO...');
        const $ = cheerio.load(html);
        console.log('✅ HTML PARSED SUCCESSFULLY');
        
        // 1. Scrape Services
        console.log('🔄 SCRAPING SERVICES...');
        const serviceSelector = business.selectors?.serviceSelector || 'h1, h2, h3, .service, .treatment';
        console.log('🔄 SERVICE SELECTOR:', serviceSelector);
        
        const rawServices = [];
        $(serviceSelector).each((i, el) => {
            const text = $(el).text().trim();
            if (text && text.length > 3) {
                rawServices.push(text);
            }
        });
        
        console.log('✅ RAW SERVICES SCRAPED:', rawServices);

        const services = rawServices.filter(text =>
            text.length > 3 &&
            !text.includes("Dr") &&
            !text.match(/Doctor|Meet|Our Team|Reviews|Testimonials|News|About|Specialist|Physician|Surgeon|Contact/i)
        ).slice(0, 10); // Limit to 10 services
        
        console.log('✅ FILTERED SERVICES:', services);

        // 2. Scrape Contact Details
        console.log('🔄 SCRAPING CONTACT DETAILS...');
        
        // Phone
        let phone = "Not found";
        const phoneSelectors = [
            business.selectors?.contactSelector?.phone,
            'a[href^="tel:"]',
            '.phone',
            '.contact-phone',
            '[class*="phone"]',
            '[id*="phone"]'
        ].filter(Boolean);
        
        for (const selector of phoneSelectors) {
            const phoneEl = $(selector).first();
            if (phoneEl.length) {
                phone = phoneEl.text().trim() || phoneEl.attr('href')?.replace('tel:', '') || phone;
                if (phone !== "Not found") break;
            }
        }
        
        // Email
        let email = "Not found";
        const emailSelectors = [
            business.selectors?.contactSelector?.email,
            'a[href^="mailto:"]',
            '.email',
            '.contact-email',
            '[class*="email"]',
            '[id*="email"]'
        ].filter(Boolean);
        
        for (const selector of emailSelectors) {
            const emailEl = $(selector).first();
            if (emailEl.length) {
                email = emailEl.text().trim() || emailEl.attr('href')?.replace('mailto:', '') || email;
                if (email !== "Not found") break;
            }
        }
        
        const contactDetails = { phone, email };
        console.log('✅ CONTACT DETAILS SCRAPED:', contactDetails);

        // 3. Scrape FAQs (try FAQ page)
        let faqs = [];
        console.log('🔄 ATTEMPTING TO SCRAPE FAQS...');
        try {
            const faqUrl = `${business.websiteUrl}/faq`;
            console.log('🔄 TRYING FAQ PAGE:', faqUrl);
            
            const faqResponse = await fetch(faqUrl, {
                timeout: CONFIG.PAGE_TIMEOUT,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (faqResponse.ok) {
                const faqHtml = await faqResponse.text();
                const $faq = cheerio.load(faqHtml);
                
                if (business.selectors?.faqsSelector?.question && business.selectors?.faqsSelector?.answer) {
                    const questions = [];
                    const answers = [];
                    
                    $faq(business.selectors.faqsSelector.question).each((i, el) => {
                        questions.push($faq(el).text().trim());
                    });
                    
                    $faq(business.selectors.faqsSelector.answer).each((i, el) => {
                        answers.push($faq(el).text().trim());
                    });
                    
                    faqs = questions.map((q, i) => ({
                        question: q,
                        answer: answers[i] || "No answer found"
                    })).slice(0, 5); // Limit to 5 FAQs
                }
                console.log('✅ FAQS SCRAPED:', faqs);
            } else {
                console.log('⚠️ FAQ page not accessible');
            }
        } catch (faqError) {
            console.log("⚠️ Could not scrape FAQs:", faqError.message);
        }

        // Save all scraped data
        console.log('🔄 SAVING SCRAPED DATA...');
        const scrapedData = { services, contactDetails, faqs };
        console.log('📊 FINAL SCRAPED DATA:', JSON.stringify(scrapedData, null, 2));
        console.log('📊 MEMORY AFTER SCRAPING:', process.memoryUsage());
        
        await saveScrapedData(business.businessId, scrapedData);
        console.log('✅ SCRAPED DATA SAVED SUCCESSFULLY');

        const duration = (Date.now() - startTime) / 1000;
        console.log(`🎉 SCRAPING COMPLETED SUCCESSFULLY IN ${duration} SECONDS`);

    } catch (error) {
        console.error('🚨 CHEERIO SCRAPING ERROR:', error.message);
        console.error('🚨 SCRAPING ERROR STACK:', error.stack);
        throw error;
    }
};

console.log("✅ SCRAPE BUSINESS DATA FUNCTION DEFINED");

export default scrapeBusinessData;
