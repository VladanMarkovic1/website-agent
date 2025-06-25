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

// Helper function to extract text content
const extractText = ($, selector, fallbackSelectors = []) => {
    let text = '';
    const selectors = [selector, ...fallbackSelectors].filter(Boolean);
    
    for (const sel of selectors) {
        const element = $(sel).first();
        if (element.length) {
            text = element.text().trim();
            if (text) break;
        }
    }
    
    return text;
};

// Helper function to extract multiple elements
const extractMultiple = ($, selector, limit = 10) => {
    const elements = [];
    $(selector).each((i, el) => {
        if (i >= limit) return false;
        const text = $(el).text().trim();
        if (text && text.length > 3) {
            elements.push(text);
        }
    });
    return elements;
};

// Helper function to extract team members
const extractTeamMembers = ($) => {
    const teamMembers = [];
    const teamSelectors = [
        '.team-member',
        '.staff-member',
        '.doctor',
        '.dentist',
        '.physician',
        '[class*="team"]',
        '[class*="staff"]',
        '[class*="doctor"]'
    ];
    
    teamSelectors.forEach(selector => {
        $(selector).each((i, el) => {
            const $member = $(el);
            const name = extractText($member, '.name, h3, h4, .title');
            const role = extractText($member, '.role, .position, .specialty');
            const bio = extractText($member, '.bio, .description, p');
            const education = extractText($member, '.education, .credentials');
            
            if (name && name.length > 2) {
                teamMembers.push({
                    name: name,
                    role: role || 'Team Member',
                    title: role,
                    education: education,
                    bio: bio,
                    specializations: [],
                    languages: [],
                    imageUrl: $member.find('img').attr('src') || ''
                });
            }
        });
    });
    
    return teamMembers.slice(0, 10); // Limit to 10 team members
};

// Helper function to extract testimonials
const extractTestimonials = ($) => {
    const testimonials = [];
    const testimonialSelectors = [
        '.testimonial',
        '.review',
        '.feedback',
        '[class*="testimonial"]',
        '[class*="review"]'
    ];
    
    testimonialSelectors.forEach(selector => {
        $(selector).each((i, el) => {
            const $testimonial = $(el);
            const patientName = extractText($testimonial, '.name, .author, .patient-name');
            const review = extractText($testimonial, '.review, .feedback, .testimonial-text, p');
            const service = extractText($testimonial, '.service, .treatment');
            const rating = $testimonial.find('.rating, .stars').length || 5;
            
            if (review && review.length > 10) {
                testimonials.push({
                    patientName: patientName || 'Anonymous',
                    service: service,
                    rating: rating,
                    review: review,
                    date: new Date(),
                    isVerified: false,
                    isFeatured: false,
                    tags: []
                });
            }
        });
    });
    
    return testimonials.slice(0, 10); // Limit to 10 testimonials
};

// Helper function to extract technology information
const extractTechnology = ($) => {
    const technology = [];
    const techKeywords = [
        'technology', 'equipment', 'digital', 'laser', '3D', 'scanner', 'x-ray', 'imaging',
        'CAD/CAM', 'crown', 'implant', 'whitening', 'sedation', 'anesthesia'
    ];
    
    techKeywords.forEach(keyword => {
        const selector = `[class*="${keyword}"], [id*="${keyword}"]`;
        $(selector).each((i, el) => {
            const $tech = $(el);
            const name = extractText($tech, 'h3, h4, .title, .name');
            const description = extractText($tech, '.description, .info, p');
            
            if (name && name.length > 3) {
                technology.push({
                    name: name,
                    description: description,
                    benefits: [],
                    imageUrl: $tech.find('img').attr('src') || '',
                    isAdvanced: true
                });
            }
        });
    });
    
    return technology.slice(0, 5); // Limit to 5 technologies
};

// Helper function to extract awards and certifications
const extractAwards = ($) => {
    const awards = [];
    const awardSelectors = [
        '.award',
        '.certification',
        '.recognition',
        '[class*="award"]',
        '[class*="certification"]'
    ];
    
    awardSelectors.forEach(selector => {
        $(selector).each((i, el) => {
            const $award = $(el);
            const name = extractText($award, '.name, .title, h3, h4');
            const organization = extractText($award, '.organization, .issuer');
            const description = extractText($award, '.description, .details, p');
            const year = extractText($award, '.year, .date');
            
            if (name && name.length > 3) {
                awards.push({
                    name: name,
                    year: year ? parseInt(year.match(/\d{4}/)?.[0]) : null,
                    organization: organization,
                    description: description,
                    imageUrl: $award.find('img').attr('src') || ''
                });
            }
        });
    });
    
    return awards.slice(0, 5); // Limit to 5 awards
};

// Helper function to extract insurance information
const extractInsurance = ($) => {
    const insurance = [];
    const insuranceSelectors = [
        '.insurance',
        '.coverage',
        '.providers',
        '[class*="insurance"]'
    ];
    
    insuranceSelectors.forEach(selector => {
        $(selector).each((i, el) => {
            const $insurance = $(el);
            const provider = extractText($insurance, '.provider, .name, h3, h4');
            const coverage = extractText($insurance, '.coverage, .details, p');
            
            if (provider && provider.length > 2) {
                insurance.push({
                    provider: provider,
                    coverageDetails: coverage,
                    acceptedPlans: [],
                    copayInfo: '',
                    deductibleInfo: '',
                    preAuthorization: false,
                    preAuthProcess: '',
                    claimProcess: '',
                    contactInfo: ''
                });
            }
        });
    });
    
    return insurance.slice(0, 10); // Limit to 10 insurance providers
};

// Helper function to extract business description
const extractBusinessDescription = ($) => {
    const descriptionSelectors = [
        '.about-us',
        '.about',
        '.description',
        '.mission',
        '.vision',
        '[class*="about"]',
        '[class*="description"]'
    ];
    
    for (const selector of descriptionSelectors) {
        const description = extractText($, selector);
        if (description && description.length > 50) {
            return description;
        }
    }
    
    // Fallback: look for paragraphs with business-related keywords
    const businessKeywords = ['dental', 'care', 'health', 'patient', 'treatment', 'service'];
    let bestParagraph = '';
    
    $('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 100 && text.length < 1000) {
            const keywordCount = businessKeywords.filter(keyword => 
                text.toLowerCase().includes(keyword)
            ).length;
            
            if (keywordCount > 2 && text.length > bestParagraph.length) {
                bestParagraph = text;
            }
        }
    });
    
    return bestParagraph;
};

// Helper function to extract specializations
const extractSpecializations = ($) => {
    const specializations = [];
    const specKeywords = [
        'specializing', 'specializes', 'specialty', 'expertise', 'focus', 'concentrate'
    ];
    
    $('p, h1, h2, h3, h4').each((i, el) => {
        const text = $(el).text().trim();
        specKeywords.forEach(keyword => {
            if (text.toLowerCase().includes(keyword)) {
                // Extract text after the keyword
                const keywordIndex = text.toLowerCase().indexOf(keyword);
                const afterKeyword = text.slice(keywordIndex + keyword.length, keywordIndex + 200);
                const matches = afterKeyword.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g);
                if (matches) {
                    specializations.push(...matches.slice(0, 3));
                }
            }
        });
    });
    
    return [...new Set(specializations)].slice(0, 5); // Remove duplicates and limit
};

const scrapeBusinessData = async (business) => {
    const startTime = Date.now();

    try {
        console.log(`Starting enhanced scraping for: ${business.businessName}`);
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
        
        // 1. Enhanced Services Scraping
        const serviceSelector = business.selectors?.serviceSelector || 'h1, h2, h3, .service, .treatment';
        const rawServices = extractMultiple($, serviceSelector, 15);
        
        const services = rawServices.filter(text =>
            text.length > 3 &&
            !text.includes("Dr") &&
            !text.match(/Doctor|Meet|Our Team|Reviews|Testimonials|News|About|Specialist|Physician|Surgeon|Contact/i)
        ).slice(0, 15); // Increased limit to 15 services

        // 2. Enhanced Contact Details
        console.log(`[SCRAPER DEBUG] Using phone selector:`, business.selectors?.contactSelector?.phone);
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
        
        // Fallback to regex
        const fullText = $('body').text();
        const phoneMatches = fullText.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g);
        if (phoneMatches && phoneMatches.length > 0) {
            phone = phoneMatches[0].trim();
        }
        
        // Email extraction
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
        
        // Fallback to regex
        const emailMatches = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (emailMatches && emailMatches.length > 0) {
            email = emailMatches[0].trim();
        }
        
        // Enhanced Address extraction
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
        
        // Boulder-specific pattern
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

        // 3. Enhanced Business Information
        const businessDescription = extractBusinessDescription($);
        const specializations = extractSpecializations($);
        const teamMembers = extractTeamMembers($);
        const testimonials = extractTestimonials($);
        const technology = extractTechnology($);
        const awards = extractAwards($);
        const insurance = extractInsurance($);
        
        // 4. Enhanced FAQs
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
                    })).slice(0, 10); // Increased limit to 10 FAQs
                }
            }
        } catch (faqError) {
            console.log("Could not scrape FAQs:", faqError.message);
        }

        // 5. Extract operating hours
        let operatingHours = null;
        const hoursSelectors = [
            '.hours',
            '.operating-hours',
            '.business-hours',
            '[class*="hours"]',
            '[class*="schedule"]'
        ];
        
        for (const selector of hoursSelectors) {
            const hoursText = extractText($, selector);
            if (hoursText && hoursText.length > 10) {
                operatingHours = hoursText;
                break;
            }
        }

        // Save all enhanced scraped data
        const scrapedData = { 
            services, 
            contactDetails, 
            faqs,
            businessDescription,
            specializations,
            teamMembers,
            testimonials,
            technology,
            awards,
            insurance,
            operatingHours
        };
        
        checkMemoryUsage();
        
        await saveScrapedData(business.businessId, scrapedData);

        const duration = (Date.now() - startTime) / 1000;
        console.log(`Enhanced scraping completed successfully in ${duration} seconds`);
        console.log(`Extracted: ${services.length} services, ${teamMembers.length} team members, ${testimonials.length} testimonials, ${technology.length} technologies`);

    } catch (error) {
        console.error('Enhanced scraping error:', error.message);
        throw error;
    }
};

export default scrapeBusinessData;
