import mongoose from 'mongoose';
import Business from '../models/Business.js';
import dotenv from 'dotenv';

dotenv.config();

const checkLanguageFields = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find the test business
        const testBusiness = await Business.findOne({ businessId: 'test-business' });
        
        if (testBusiness) {
            console.log('Test Business Found:');
            console.log('- businessId:', testBusiness.businessId);
            console.log('- showLanguageMenu:', testBusiness.showLanguageMenu);
            console.log('- supportedLanguages:', testBusiness.supportedLanguages);
            console.log('- Has showLanguageMenu field:', 'showLanguageMenu' in testBusiness);
            console.log('- Has supportedLanguages field:', 'supportedLanguages' in testBusiness);
        } else {
            console.log('Test business not found!');
        }

        // Check all businesses
        const allBusinesses = await Business.find({}, 'businessId showLanguageMenu supportedLanguages');
        console.log('\nAll Businesses:');
        allBusinesses.forEach(business => {
            console.log(`- ${business.businessId}: showLanguageMenu=${business.showLanguageMenu}, supportedLanguages=${JSON.stringify(business.supportedLanguages)}`);
        });

    } catch (error) {
        console.error('Error checking businesses:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Run the check
checkLanguageFields(); 