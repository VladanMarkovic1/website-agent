import puppeteer from 'puppeteer';
import saveScrapedData from '../scraper/saveScrapedData.js';

const scrapeBusinessData = async (business) => {
    console.log(`🌍 Visiting main page: ${business.websiteUrl}`);

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(business.websiteUrl, { waitUntil: 'domcontentloaded' });

        // ✅ Scraping Services
        console.log('🔍 Scraping Services...');
        const rawServices = await page.evaluate(() => {
            return [...document.querySelectorAll("ul.dropdown-menu.sub-nav li:not([id*=doctor]):not([id*=team]) a")]
                .map(el => el.textContent.trim());
        });

        const services = rawServices.filter(text =>
            text.length > 3 &&  
            !text.includes("Dr") &&  
            !text.match(/Doctor|Meet|Our Team|Reviews|Testimonials|News|About|Specialist|Physician|Surgeon|Contact/i)
        );

        console.log("✅ Services Found:", services);

        // ✅ Scraping Contact Information
        console.log('📞 Scraping Contact Details...');
        const contactDetails = await page.evaluate((selectors) => {
            return {
                phone: document.querySelector(selectors.phone)?.textContent.trim() || "Not found",
                email: document.querySelector(selectors.email)?.textContent.trim() || "Not found"
            };
        }, business.selectors.contactSelector);

        console.log(`✅ Contact Details Found:`, contactDetails);

        // ✅ Scraping FAQs
        console.log("❓ Scraping FAQs...");
        await page.goto(`${business.websiteUrl}/faq`, { waitUntil: 'domcontentloaded' });

        await page.waitForSelector(".grid-title.text-left.faq-heading", { visible: true, timeout: 20000 });
        await page.waitForSelector(".grid-desc.text-left", { visible: true, timeout: 20000 });

        const questions = await page.evaluate(() => {
            return [...document.querySelectorAll(".grid-title.text-left.faq-heading")]
                .map(el => el.textContent.trim());
        });

        const answers = await page.evaluate(() => {
            return [...document.querySelectorAll(".grid-desc.text-left")]
                .map(el => el.textContent.trim());
        });

        const faqs = questions.map((q, i) => ({
            question: q,
            answer: answers[i] || "No answer found"
        }));

        console.log("✅ FAQs Extracted:", faqs);

        // ✅ Save Scraped Data
        const scrapedData = { services, contactDetails, faqs };
        console.log("⚡ Calling saveScrapedData...");
        await saveScrapedData(business.businessId, scrapedData);

        console.log("✅ Scraping and Saving Completed!");
        await browser.close();
    } catch (error) {
        console.error(`❌ Error during scraping: ${error.message}`);
        await browser.close();
    }
};

export default scrapeBusinessData;
