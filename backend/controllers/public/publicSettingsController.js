import Business from '../../models/Business.js';
import ExtraInfo from '../../models/ExtraInfo.js';
import Service from '../../models/Service.js';

// Service translation mapping
const serviceTranslations = {
    'en': {
        'Pain': 'Pain',
        'Broken teeth': 'Broken teeth',
        'Implants': 'Implants',
        'Regular care': 'Regular care',
        'Teeth Whitening': 'Teeth Whitening',
        'Dental Whitening': 'Dental Whitening',
        'Whitening': 'Whitening',
        'Invisalign': 'Invisalign',
        'Veneers': 'Veneers',
        'Root Canal': 'Root Canal',
        'Crowns': 'Crowns',
        'Bridges': 'Bridges',
        'Dental Cleaning': 'Dental Cleaning',
        'Dental Examination': 'Dental Examination',
        'Emergency Care': 'Emergency Care',
        'Emergency Dental Care': 'Emergency Dental Care',
        'Cosmetic Dentistry': 'Cosmetic Dentistry',
        'General Dentistry': 'General Dentistry',
        'Preventive Care': 'Preventive Care',
        'Restorative Dentistry': 'Restorative Dentistry'
    },
    'es': {
        'Pain': 'Dolor',
        'Broken teeth': 'Dientes rotos',
        'Implants': 'Implantes',
        'Regular care': 'Cuidado regular',
        'Teeth Whitening': 'Blanqueamiento dental',
        'Dental Whitening': 'Blanqueamiento dental',
        'Whitening': 'Blanqueamiento',
        'Invisalign': 'Invisalign',
        'Veneers': 'Carillas',
        'Root Canal': 'Endodoncia',
        'Crowns': 'Coronas',
        'Bridges': 'Puentes',
        'Dental Cleaning': 'Limpieza dental',
        'Dental Examination': 'Examen dental',
        'Emergency Care': 'Cuidado de emergencia',
        'Emergency Dental Care': 'Cuidado dental de emergencia',
        'Cosmetic Dentistry': 'Odontología cosmética',
        'General Dentistry': 'Odontología general',
        'Preventive Care': 'Cuidado preventivo',
        'Restorative Dentistry': 'Odontología restaurativa'
    },
    'it': {
        'Pain': 'Dolore',
        'Broken teeth': 'Denti rotti',
        'Implants': 'Impianti',
        'Regular care': 'Cura regolare',
        'Teeth Whitening': 'Sbiancamento dentale',
        'Dental Whitening': 'Sbiancamento dentale',
        'Whitening': 'Sbiancamento',
        'Invisalign': 'Invisalign',
        'Veneers': 'Faccette',
        'Root Canal': 'Devitalizzazione',
        'Crowns': 'Corone',
        'Bridges': 'Ponti',
        'Dental Cleaning': 'Pulizia dentale',
        'Dental Examination': 'Esame dentale',
        'Emergency Care': 'Cura d\'emergenza',
        'Emergency Dental Care': 'Cura dentale d\'emergenza',
        'Cosmetic Dentistry': 'Odontoiatria cosmetica',
        'General Dentistry': 'Odontoiatria generale',
        'Preventive Care': 'Cura preventiva',
        'Restorative Dentistry': 'Odontoiatria restaurativa'
    }
};

// Function to translate service names
const translateServiceName = (serviceName, language) => {
    const translations = serviceTranslations[language] || serviceTranslations['en'];
    return translations[serviceName] || serviceName; // Fallback to original if no translation
};

// Controller to get public widget settings (NO AUTH)
export const getPublicWidgetConfig = async (req, res) => {
    const { businessId } = req.params;

    if (!businessId) {
        return res.status(400).json({ error: 'Business ID is required.' });
    }

    try {
        // Select widgetConfig, showLanguageMenu, and supportedLanguages
        const business = await Business.findOne({ businessId }).select('widgetConfig showLanguageMenu supportedLanguages');

        if (!business) {
            return res.status(404).json({ error: 'Configuration not found for this business ID.' });
        }

        // Return widgetConfig and language menu settings
        res.status(200).json({
            widgetConfig: business.widgetConfig || {},
            showLanguageMenu: business.showLanguageMenu || false,
            supportedLanguages: business.supportedLanguages || ['en']
        });

    } catch (error) {
        console.error(`Error fetching public widget config for ${businessId}:`, error);
        res.status(500).json({ error: 'Failed to fetch widget configuration.' });
    }
};

// Controller to get public-safe business options (days, times, insurance)
export const getPublicBusinessOptions = async (req, res) => {
    try {
        const { businessId } = req.params;
        const { language = 'en' } = req.query; // Get language from query parameter

        if (!businessId) {
            return res.status(400).json({ error: "Business ID is required" });
        }

        // Fetch both ExtraInfo and Service data in parallel
        const [extraInfo, serviceData] = await Promise.all([
            ExtraInfo.findOne({ businessId }),
            Service.findOne({ businessId })
        ]);

        // Default values if no data found
        const defaultDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        const defaultTimes = ["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM"];

        // --- Featured services logic ---
        let allServices = serviceData?.services || [];
        let featuredServices = extraInfo?.featuredServices || [];
        let featuredForFrontend = [];
        if (featuredServices.length > 0) {
            // Use the stored display names with translation
            featuredForFrontend = featuredServices.map(fs => ({
                name: translateServiceName(fs.displayName, language),
                description: (allServices.find(s => s.name === fs.originalName)?.description) || ''
            }));
        } else {
            // Fallback: first 6 services, use their name as displayName with translation
            featuredForFrontend = allServices.slice(0, 6).map(service => ({
                name: translateServiceName(service.name, language),
                description: service.description
            }));
        }

        const response = {
            availableDays: extraInfo?.availableDays || defaultDays,
            availableTimes: extraInfo?.availableTimes || defaultTimes,
            services: featuredForFrontend
        };

        res.json(response);
    } catch (error) {
        console.error("Error fetching public business options:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}; 