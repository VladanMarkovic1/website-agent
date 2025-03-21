import puppeteer from 'puppeteer';
import saveScrapedData from '../scraper/saveScrapedData.js';

const scrapeBusinessData = async (business) => {
    console.log(`🌍 Visiting main page: ${business.websiteUrl}`);

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(business.websiteUrl, { waitUntil: 'domcontentloaded' });

            // 1) Scrape Services Dynamically
        console.log('🔍 Scraping Services...');
        const rawServices = await page.evaluate((serviceSelector) => {
        return [...document.querySelectorAll(serviceSelector)].map(el => el.textContent.trim());
        }, business.selectors.serviceSelector); 
        //   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        //   Using the serviceSelector from the DB


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

        // 3) Scrape FAQs Dynamically
        console.log("❓ Scraping FAQs...");
        await page.goto(`${business.websiteUrl}/faq`, { waitUntil: 'domcontentloaded' });

        // Wait for the question and answer selectors to appear
        await page.waitForSelector(business.selectors.faqsSelector.question, { visible: true, timeout: 20000 });
        await page.waitForSelector(business.selectors.faqsSelector.answer, { visible: true, timeout: 20000 });

        const questions = await page.evaluate((questionSelector) => {
        return [...document.querySelectorAll(questionSelector)].map(el => el.textContent.trim());
        }, business.selectors.faqsSelector.question);

        const answers = await page.evaluate((answerSelector) => {
        return [...document.querySelectorAll(answerSelector)].map(el => el.textContent.trim());
        }, business.selectors.faqsSelector.answer);

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
