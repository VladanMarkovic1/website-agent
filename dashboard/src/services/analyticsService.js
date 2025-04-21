import apiClient from '../utils/api';

export const getAnalyticsData = async (businessId, startDate, endDate) => {
    try {
        const encodedBusinessId = encodeURIComponent(businessId);
        const response = await apiClient.get(`/analytics/business/${encodedBusinessId}`, {
            params: { startDate, endDate }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching analytics data:', error);
        throw error;
    }
};

export const getTodaysAnalytics = async (businessId) => {
    try {
        const encodedBusinessId = encodeURIComponent(businessId);
        const response = await apiClient.get(`/analytics/business/${encodedBusinessId}/today`);
        return response.data;
    } catch (error) {
        console.error('Error fetching today\'s analytics:', error);
        throw error;
    }
}; 