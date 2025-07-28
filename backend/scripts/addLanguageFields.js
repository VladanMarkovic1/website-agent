import mongoose from 'mongoose';
import Business from '../models/Business.js';
import dotenv from 'dotenv';

dotenv.config();

const addLanguageFields = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Update all existing businesses to add the new fields
        const result = await Business.updateMany(
            {}, // Update all documents
            {
                $set: {
                    showLanguageMenu: false, // Default to false for existing businesses
                    supportedLanguages: ['en'] // Default to English only
                }
            }
        );

        console.log(`Updated ${result.modifiedCount} business documents`);
        console.log('Language fields added successfully!');

        // Optional: Update specific test business to enable language menu
        const testBusiness = await Business.findOneAndUpdate(
            { businessId: 'test-business' },
            {
                $set: {
                    showLanguageMenu: true,
                    supportedLanguages: ['en', 'es']
                }
            },
            { new: true }
        );

        if (testBusiness) {
            console.log('Test business updated with language menu enabled');
        }

    } catch (error) {
        console.error('Error updating businesses:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Run the migration
addLanguageFields(); 