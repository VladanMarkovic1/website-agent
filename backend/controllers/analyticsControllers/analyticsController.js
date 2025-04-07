import { getAnalytics, getTodaysSummary } from './analyticsService.js';

export const getAnalyticsData = async (req, res) => {
    try {
        const { businessId } = req.params;
        const { startDate, endDate } = req.query;

        if (!businessId) {
            return res.status(400).json({ error: 'Business ID is required' });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        const { dailyData, allTime } = await getAnalytics(businessId, startDate, endDate);
        
        // Calculate summary metrics from daily data
        const summary = dailyData.reduce((acc, day) => {
            acc.totalLeads += day.totalLeads || 0;
            acc.totalConversations += day.totalConversations || 0;
            acc.avgConversionRate += day.conversionRate || 0;
            
            // Aggregate leads by service
            Object.entries(day.leadsByService || {}).forEach(([service, count]) => {
                acc.serviceBreakdown[service] = (acc.serviceBreakdown[service] || 0) + count;
            });

            // Aggregate hourly activity
            Object.entries(day.hourlyActivity || {}).forEach(([hour, count]) => {
                acc.hourlyActivity[hour] = (acc.hourlyActivity[hour] || 0) + count;
            });

            return acc;
        }, {
            totalLeads: 0,
            totalConversations: 0,
            avgConversionRate: 0,
            serviceBreakdown: {},
            hourlyActivity: {}
        });

        // Calculate average conversion rate
        summary.avgConversionRate = dailyData.length > 0 ? summary.avgConversionRate / dailyData.length : 0;

        res.status(200).json({
            success: true,
            summary,
            dailyData,
            allTime
        });
    } catch (error) {
        console.error('Error in getAnalyticsData:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
};

export const getTodaysAnalytics = async (req, res) => {
    try {
        const { businessId } = req.params;

        if (!businessId) {
            return res.status(400).json({ error: 'Business ID is required' });
        }

        const todaysSummary = await getTodaysSummary(businessId);

        res.status(200).json({
            success: true,
            data: todaysSummary
        });
    } catch (error) {
        console.error('Error in getTodaysAnalytics:', error);
        res.status(500).json({ error: 'Failed to fetch today\'s analytics' });
    }
}; 