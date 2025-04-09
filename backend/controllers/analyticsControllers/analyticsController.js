import { getAnalytics, getTodaysSummary } from './analyticsService.js';

export const getAnalyticsData = async (req, res) => {
    try {
        const { businessId } = req.params;
        const { startDate, endDate } = req.query;

        if (!businessId) {
            return res.status(400).json({ 
                success: false,
                error: 'Business ID is required' 
            });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ 
                success: false,
                error: 'Start date and end date are required' 
            });
        }

        const analyticsData = await getAnalytics(businessId, startDate, endDate);
        
        res.status(200).json({
            success: true,
            data: analyticsData
        });
    } catch (error) {
        console.error('Error in getAnalyticsData:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch analytics data' 
        });
    }
};

export const getTodaysAnalytics = async (req, res) => {
    try {
        const { businessId } = req.params;

        if (!businessId) {
            return res.status(400).json({ 
                success: false,
                error: 'Business ID is required' 
            });
        }

        const todaysSummary = await getTodaysSummary(businessId);

        res.status(200).json(todaysSummary); // Already has correct format from service
    } catch (error) {
        console.error('Error in getTodaysAnalytics:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch today\'s analytics' 
        });
    }
}; 