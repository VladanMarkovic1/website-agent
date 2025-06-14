import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import saveScrapedData from './saveScrapedData.js';
import Selectors from '../models/Selector.js';

// Configuration
const CONFIG = {
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000, // 2 seconds
    PAGE_TIMEOUT: 30000, // 30 seconds
    MEMORY_LIMIT: 1024 * 1024 * 512, // 512MB limit
};

// Memory monitoring
const checkMemoryUsage = () => {
    const usage = process.memoryUsage();
    if (usage.heapUsed > CONFIG.MEMORY_LIMIT) {
        throw new Error(`Memory limit exceeded: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
    }
    return usage;
};

// Enhanced retry wrapper with exponential backoff
async function withRetry(operation, name, maxAttempts = CONFIG.RETRY_ATTEMPTS) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxAttempts) {
                console.error(`Final attempt failed for ${name}:`, error.message);
                throw error;
            }
            
            const delay = CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
            console.log(`Attempt ${attempt} failed for ${name}, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

const scrapeBusinessData = async (business) => {
    const startTime = Date.now();

    try {
        console.log(`Starting scraping for: ${business.businessName}`);
        checkMemoryUsage();

        // Fetch latest selectors from DB
        const selectors = await Selectors.findOne({ businessId: business.businessId }).lean();
        if (selectors) {
            business.selectors = selectors;
        } else {
            business.selectors = {};
        }

        const response = await fetch(business.websiteUrl, {
            timeout: CONFIG.PAGE_TIMEOUT,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        
        // Parse HTML with Cheerio
        const $ = cheerio.load(html);
        
        // 1. Scrape Services
        const serviceSelector = business.selectors?.serviceSelector || 'h1, h2, h3, .service, .treatment';
        
        const rawServices = [];
        $(serviceSelector).each((i, el) => {
            const text = $(el).text().trim();
            if (text && text.length > 3) {
                rawServices.push(text);
            }
        });

        const services = rawServices.filter(text =>
            text.length > 3 &&
            !text.includes("Dr") &&
            !text.match(/Doctor|Meet|Our Team|Reviews|Testimonials|News|About|Specialist|Physician|Surgeon|Contact/i)
        ).slice(0, 10); // Limit to 10 services

        // 2. Scrape Contact Details
        console.log(`[SCRAPER DEBUG] Using phone selector:`, business.selectors?.contactSelector?.phone);
        // Phone - try multiple approaches
        let phone = "Not found";
        const phoneSelectors = [
            business.selectors?.contactSelector?.phone,
            'a[href^="tel:"]',
            '.phone',
            '.contact-phone',
            '[class*="phone"]',
            '[id*="phone"]',
            'span.elementor-icon-list-text'
        ].filter(Boolean);
        for (const selector of phoneSelectors) {
            const phoneEl = $(selector).first();
            if (phoneEl.length) {
                phone = phoneEl.text().trim() || phoneEl.attr('href')?.replace('tel:', '') || phone;
                if (phone !== "Not found" && phone.match(/[\d\s+\-()]{10,}/)) break;
            }
        }
        // Always fallback to regex on full page text for this business
        const fullText = $('body').text();
        const phoneMatches = fullText.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g);
        if (phoneMatches && phoneMatches.length > 0) {
            phone = phoneMatches[0].trim();
        }
        // Email - try multiple approaches
        console.log(`[SCRAPER DEBUG] Using email selector:`, business.selectors?.contactSelector?.email);
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
                if (email !== "Not found" && email.includes('@')) break;
            }
        }
        // Always fallback to regex on full page text for this business
        const emailMatches = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (emailMatches && emailMatches.length > 0) {
            email = emailMatches[0].trim();
        }
        // Address - always fallback to keyword search for 'Broadway' and 'Boulder'
        let address = "Not found";
        const addressKeywords = ['address', 'location', 'directions', 'visit us'];
        addressKeywords.forEach(keyword => {
            if (address === "Not found") {
                const keywordIndex = fullText.toLowerCase().indexOf(keyword);
                if (keywordIndex !== -1) {
                    const textAfterKeyword = fullText.slice(keywordIndex, keywordIndex + 200);
                    const addressMatch = textAfterKeyword.match(/\d+\s+[^,]+,?\s*[^,]+,?\s*[A-Z]{2}\s*\d{5}/);
                    if (addressMatch) {
                        address = addressMatch[0].trim();
                    }
                }
            }
        });
        // Extra: Try to match Boulder address pattern if not found
        if (address === "Not found") {
            const boulderMatch = fullText.match(/\d+\s+Broadway[\s\S]{0,50}Boulder[\s\S]{0,20}CO\s*\d{5}/i);
            if (boulderMatch) {
                address = boulderMatch[0].replace(/\s+/g, ' ').trim();
            }
        }
        console.log(`[SCRAPER DEBUG] Final scraped phone:`, phone);
        console.log(`[SCRAPER DEBUG] Final scraped email:`, email);
        console.log(`[SCRAPER DEBUG] Final scraped address:`, address);
        
        const contactDetails = { phone, email, address };

        // 3. Scrape FAQs (try FAQ page)
        let faqs = [];
        try {
            const faqUrl = `${business.websiteUrl}/faq`;
            
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
            }
        } catch (faqError) {
            console.log("Could not scrape FAQs:", faqError.message);
        }

        // Save all scraped data
        const scrapedData = { services, contactDetails, faqs };
        checkMemoryUsage();
        
        await saveScrapedData(business.businessId, scrapedData);

        const duration = (Date.now() - startTime) / 1000;
        console.log(`Scraping completed successfully in ${duration} seconds`);

    } catch (error) {
        console.error('Scraping error:', error.message);
        throw error;
    }
};

export default scrapeBusinessData;
