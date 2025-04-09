import ChatAnalytics from '../../models/ChatAnalytics.js';

/**
 * Updates chat analytics for a given business
 */
export const trackChatEvent = async (businessId, eventType, data = {}) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get both today's and all-time analytics
        const [todayAnalytics, allTimeAnalytics] = await Promise.all([
            ChatAnalytics.findOne({ businessId, date: today }),
            ChatAnalytics.findOne({ businessId, date: null }) // null date represents all-time stats
        ]);

        // Initialize today's analytics if not exists
        const analytics = todayAnalytics || new ChatAnalytics({
            businessId,
            date: today,
            totalLeads: 0,
            leadsByService: {},
            leadStatus: { new: 0, contacted: 0, converted: 0 },
            totalConversations: 0,
            completedConversations: 0,
            hourlyActivity: {},
            conversionRate: 0
        });

        // Initialize all-time analytics if not exists
        const allTime = allTimeAnalytics || new ChatAnalytics({
            businessId,
            date: null,
            totalLeads: 0,
            leadsByService: {},
            leadStatus: { new: 0, contacted: 0, converted: 0 },
            totalConversations: 0,
            completedConversations: 0,
            hourlyActivity: {},
            conversionRate: 0
        });

        switch (eventType) {
            case 'NEW_CONVERSATION':
                analytics.totalConversations += 1;
                allTime.totalConversations += 1;
                break;

            case 'CONVERSATION_COMPLETED':
                analytics.completedConversations += 1;
                allTime.completedConversations += 1;
                break;

            case 'NEW_LEAD':
                analytics.totalLeads += 1;
                allTime.totalLeads += 1;
                
                // New leads always start as 'new'
                analytics.leadStatus.new += 1;
                allTime.leadStatus.new += 1;
                
                // Calculate conversion rates using all-time numbers for both
                const allTimeRate = allTime.totalConversations > 0 
                    ? (allTime.totalLeads / allTime.totalConversations) * 100
                    : 0;
                
                analytics.conversionRate = allTimeRate;
                allTime.conversionRate = allTimeRate;
                
                // Track service interest
                if (data.service) {
                    analytics.leadsByService[data.service] = (analytics.leadsByService[data.service] || 0) + 1;
                    allTime.leadsByService[data.service] = (allTime.leadsByService[data.service] || 0) + 1;
                }
                break;

            case 'LEAD_STATUS_UPDATE':
                if (data.oldStatus && data.newStatus && data.oldStatus !== data.newStatus) {
                    // Update today's status
                    if (analytics.leadStatus[data.oldStatus] > 0) {
                        analytics.leadStatus[data.oldStatus] -= 1;
                        analytics.leadStatus[data.newStatus] = (analytics.leadStatus[data.newStatus] || 0) + 1;
                    }
                    
                    // Update all-time status
                    if (allTime.leadStatus[data.oldStatus] > 0) {
                        allTime.leadStatus[data.oldStatus] -= 1;
                        allTime.leadStatus[data.newStatus] = (allTime.leadStatus[data.newStatus] || 0) + 1;
                    }
                    
                    console.log('Updated lead status:', {
                        oldStatus: data.oldStatus,
                        newStatus: data.newStatus,
                        todayStatus: analytics.leadStatus,
                        allTimeStatus: allTime.leadStatus
                    });
                }
                break;

            case 'HOURLY_ACTIVITY':
                const hour = new Date().getHours().toString();
                analytics.hourlyActivity[hour] = (analytics.hourlyActivity[hour] || 0) + 1;
                allTime.hourlyActivity[hour] = (allTime.hourlyActivity[hour] || 0) + 1;
                break;
        }

        // Ensure rates are realistic
        analytics.conversionRate = Math.min(analytics.conversionRate, 100);
        allTime.conversionRate = Math.min(allTime.conversionRate, 100);

        // Log the final state before saving
        console.log('Final analytics state:', {
            today: {
                totalLeads: analytics.totalLeads,
                leadStatus: analytics.leadStatus,
                totalConversations: analytics.totalConversations,
                conversionRate: analytics.conversionRate
            },
            allTime: {
                totalLeads: allTime.totalLeads,
                leadStatus: allTime.leadStatus,
                totalConversations: allTime.totalConversations,
                conversionRate: allTime.conversionRate
            }
        });

        // Save both analytics
        await Promise.all([
            analytics.save(),
            allTime.save()
        ]);

        return { today: analytics, allTime };
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