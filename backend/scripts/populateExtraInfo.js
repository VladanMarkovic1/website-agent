import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExtraInfo from '../models/ExtraInfo.js';
import Business from '../models/Business.js';

dotenv.config();

const defaultData = {
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    availableTimes: ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'],
    operatingHours: 'Monday-Friday: 9:00 AM - 5:00 PM',
};

async function populateExtraInfo() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all business IDs that don't have ExtraInfo
        const existingExtraInfos = await ExtraInfo.find({}, 'businessId');
        const existingBusinessIds = new Set(existingExtraInfos.map(info => info.businessId));

        // Get all business IDs from Business collection
        const businesses = await Business.find({}, 'businessId');

        for (const business of businesses) {
            if (!existingBusinessIds.has(business.businessId)) {
                const extraInfo = new ExtraInfo({
                    businessId: business.businessId,
                    ...defaultData
                });
                await extraInfo.save();
                console.log(`Created ExtraInfo for business: ${business.businessId}`);
            } else {
                // Update existing ExtraInfo if it's missing the new fields
                const updated = await ExtraInfo.updateOne(
                    { 
                        businessId: business.businessId,
                        $or: [
                            { availableDays: { $exists: false } },
                            { availableTimes: { $exists: false } }
                        ]
                    },
                    { 
                        $set: {
                            availableDays: defaultData.availableDays,
                            availableTimes: defaultData.availableTimes
                        }
                    }
                );
                if (updated.modifiedCount > 0) {
                    console.log(`Updated ExtraInfo for business: ${business.businessId}`);
                }
            }
        }

        console.log('Finished populating ExtraInfo');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

populateExtraInfo(); 