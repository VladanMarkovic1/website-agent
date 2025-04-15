import ChatAnalytics from '../../models/ChatAnalytics.js';

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