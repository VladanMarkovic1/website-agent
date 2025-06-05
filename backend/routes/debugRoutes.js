import express from 'express';
import Business from '../models/Business.js';
import Contact from '../models/Contact.js';
import Service from '../models/Service.js';
import Selectors from '../models/Selector.js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const router = express.Router();

// Debug endpoint to check contact data and test scraping
router.get('/contact-debug/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        console.log(`🔍 [DEBUG] Checking contact data for business: ${businessId}`);
        
        // Get all data from database
        const [business, contact, selectors] = await Promise.all([
            Business.findOne({ businessId }),
            Contact.findOne({ businessId }),
            Selectors.findOne({ businessId })
        ]);
        
        const debugInfo = {
            business: business ? {
                businessId: business.businessId,
                businessName: business.businessName,
                websiteUrl: business.websiteUrl
            } : null,
            contactInDB: contact,
            selectorsInDB: selectors,
            timestamp: new Date().toISOString()
        };
        
        // If we have the business URL, let's test scraping with different approaches
        if (business?.websiteUrl) {
            console.log(`🔍 [DEBUG] Testing scraping for: ${business.websiteUrl}`);
            
            try {
                const response = await fetch(business.websiteUrl, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (response.ok) {
                    const html = await response.text();
                    const $ = cheerio.load(html);
                    
                    // Test different phone selectors
                    const phoneTests = {
                        currentSelector: selectors?.contactSelector?.phone || 'N/A',
                        currentSelectorResult: selectors?.contactSelector?.phone ? $(selectors.contactSelector.phone).first().text().trim() || $(selectors.contactSelector.phone).first().attr('href') : 'N/A',
                        telLinks: $('a[href^="tel:"]').map((i, el) => $(el).attr('href')).get(),
                        telLinksText: $('a[href^="tel:"]').map((i, el) => $(el).text().trim()).get(),
                        phonePatternInText: html.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g) || [],
                        elementorPhoneIcons: $('.elementor-icon-list-text').map((i, el) => $(el).text().trim()).get().filter(text => text.match(/[\d\s+\-()]{10,}/)),
                        allHrefsWithTel: $('a[href*="tel"]').map((i, el) => ({ href: $(el).attr('href'), text: $(el).text().trim() })).get()
                    };
                    
                    // Test different email selectors
                    const emailTests = {
                        currentSelector: selectors?.contactSelector?.email || 'N/A',
                        currentSelectorResult: selectors?.contactSelector?.email ? $(selectors.contactSelector.email).first().text().trim() || $(selectors.contactSelector.email).first().attr('href') : 'N/A',
                        mailtoLinks: $('a[href^="mailto:"]').map((i, el) => $(el).attr('href')).get(),
                        mailtoLinksText: $('a[href^="mailto:"]').map((i, el) => $(el).text().trim()).get(),
                        emailPatternInText: html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [],
                        allHrefsWithMailto: $('a[href*="mailto"]').map((i, el) => ({ href: $(el).attr('href'), text: $(el).text().trim() })).get()
                    };
                    
                    debugInfo.scrapingTests = {
                        phoneTests,
                        emailTests,
                        htmlLength: html.length,
                        testTime: new Date().toISOString()
                    };
                    
                } else {
                    debugInfo.scrapingError = `HTTP ${response.status}: ${response.statusText}`;
                }
                
            } catch (scrapingError) {
                debugInfo.scrapingError = scrapingError.message;
            }
        }
        
        console.log(`🔍 [DEBUG] Debug info for ${businessId}:`, JSON.stringify(debugInfo, null, 2));
        res.json(debugInfo);
        
    } catch (error) {
        console.error(`🚨 [DEBUG] Error in contact debug:`, error);
        res.status(500).json({ error: error.message });
    }
});

export default router; 