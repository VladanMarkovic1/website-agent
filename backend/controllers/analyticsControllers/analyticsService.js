import ChatAnalytics from '../../models/ChatAnalytics.js';

/**
 * Updates chat analytics for a given business
 */
export const trackChatEvent = async (businessId, eventType, data = {}) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let updateTodayOps = {};
        let updateAllTimeOps = {};

        switch (eventType) {
            case 'NEW_CONVERSATION':
                updateTodayOps = { $inc: { totalConversations: 1 } };
                updateAllTimeOps = { $inc: { totalConversations: 1 } };
                break;

            case 'CONVERSATION_COMPLETED':
                updateTodayOps = { $inc: { completedConversations: 1 } };
                updateAllTimeOps = { $inc: { completedConversations: 1 } };
                break;

            case 'NEW_LEAD':
                updateTodayOps = {
                    $inc: {
                        totalLeads: 1,
                        'leadStatus.new': 1
                    }
                };
                updateAllTimeOps = {
                    $inc: {
                        totalLeads: 1,
                        'leadStatus.new': 1
                    }
                };
                
                if (data.service) {
                    updateTodayOps.$inc[`leadsByService.${data.service}`] = 1;
                    updateAllTimeOps.$inc[`leadsByService.${data.service}`] = 1;
                }
                break;

            case 'LEAD_STATUS_UPDATE':
                if (data.oldStatus && data.newStatus && data.oldStatus !== data.newStatus) {
                    updateTodayOps = {
                        $inc: {
                            [`leadStatus.${data.oldStatus}`]: -1,
                            [`leadStatus.${data.newStatus}`]: 1
                        }
                    };
                    updateAllTimeOps = {
                        $inc: {
                            [`leadStatus.${data.oldStatus}`]: -1,
                            [`leadStatus.${data.newStatus}`]: 1
                        }
                    };
                }
                break;

            case 'HOURLY_ACTIVITY':
                const hour = new Date().getHours().toString();
                updateTodayOps = { $inc: { [`hourlyActivity.${hour}`]: 1 } };
                updateAllTimeOps = { $inc: { [`hourlyActivity.${hour}`]: 1 } };
                break;
        }

        // Execute updates atomically
        const [todayAnalytics, allTimeAnalytics] = await Promise.all([
            ChatAnalytics.findOneAndUpdate(
                { businessId, date: today },
                updateTodayOps,
                { 
                    new: true, 
                    upsert: true,
                    setDefaultsOnInsert: true 
                }
            ),
            ChatAnalytics.findOneAndUpdate(
                { businessId, date: null },
                updateAllTimeOps,
                { 
                    new: true, 
                    upsert: true,
                    setDefaultsOnInsert: true 
                }
            )
        ]);

        // Calculate and update conversion rate
        if (allTimeAnalytics.totalConversations > 0) {
            const conversionRate = Math.min(
                (allTimeAnalytics.totalLeads / allTimeAnalytics.totalConversations) * 100,
                100
            );

            await Promise.all([
                ChatAnalytics.findOneAndUpdate(
                    { businessId, date: today },
                    { $set: { conversionRate } }
                ),
                ChatAnalytics.findOneAndUpdate(
                    { businessId, date: null },
                    { $set: { conversionRate } }
                )
            ]);

            todayAnalytics.conversionRate = conversionRate;
            allTimeAnalytics.conversionRate = conversionRate;
        }

        return { today: todayAnalytics, allTime: allTimeAnalytics };
    } catch (error) {
        console.error('Error tracking chat event:', error);
        throw error;
    }
};

/**
 * Gets analytics for a specific date range
 */
export const getAnalytics = async (businessId, startDate, endDate) => {
    try {
        const [rangeAnalytics, allTimeAnalytics] = await Promise.all([
            ChatAnalytics.find({
                businessId,
                date: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            }).sort({ date: 1 }),
            ChatAnalytics.findOne({
                businessId,
                date: null
            })
        ]);

        return {
            dailyData: rangeAnalytics,
            allTime: allTimeAnalytics
        };
    } catch (error) {
        console.error('Error fetching analytics:', error);
        throw error;
    }
};

/**
 * Gets today's analytics summary
 */
export const getTodaysSummary = async (businessId) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [todayAnalytics, allTimeAnalytics] = await Promise.all([
            ChatAnalytics.findOne({
                businessId,
                date: today
            }),
            ChatAnalytics.findOne({
                businessId,
                date: null
            })
        ]);

        const defaultAnalytics = {
            businessId,
            totalLeads: 0,
            leadsByService: {},
            leadStatus: { new: 0, contacted: 0, converted: 0 },
            totalConversations: 0,
            completedConversations: 0,
            hourlyActivity: {},
            conversionRate: 0
        };

        // Ensure we have valid data objects
        const todayData = todayAnalytics || { ...defaultAnalytics, date: today };
        const allTimeData = allTimeAnalytics || { ...defaultAnalytics, date: null };

        // Calculate all-time conversion rate
        const allTimeConversionRate = allTimeData.totalConversations > 0 
            ? (allTimeData.totalLeads / allTimeData.totalConversations) * 100
            : 0;

        // Format response to match frontend expectations
        return {
            success: true,
            data: {
                today: {
                    totalLeads: todayData.totalLeads,
                    leadsByService: todayData.leadsByService,
                    leadStatus: todayData.leadStatus,
                    totalConversations: todayData.totalConversations,
                    completedConversations: todayData.completedConversations,
                    hourlyActivity: todayData.hourlyActivity,
                    conversionRate: todayData.conversionRate,
                    date: today
                },
                allTime: {
                    totalLeads: allTimeData.totalLeads,
                    totalConversations: allTimeData.totalConversations,
                    conversionRate: allTimeConversionRate
                }
            }
        };
    } catch (error) {
        console.error('Error fetching today\'s analytics:', error);
        throw error;
    }
}; 