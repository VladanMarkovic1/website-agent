import React, { useState, useEffect } from 'react';
import { getAnalyticsData, getTodaysAnalytics } from '../../services/analyticsService';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

const AnalyticsDashboard = () => {
    const [analytics, setAnalytics] = useState(null);
    const [todaysSummary, setTodaysSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const businessId = user?.businessId;

    useEffect(() => {
        const fetchData = async () => {
            if (!businessId) {
                console.error('[Analytics] Missing businessId, redirecting...');
                setError('Business ID not found. Please log in again.');
                setLoading(false);
                navigate('/login');
                return;
            }

            try {
                setLoading(true);
                setError(null);
                
                const today = new Date();
                const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                
                const [todayResponse, analyticsResponse] = await Promise.all([
                    getTodaysAnalytics(businessId),
                    getAnalyticsData(
                        businessId, 
                        format(lastWeek, 'yyyy-MM-dd'), 
                        format(today, 'yyyy-MM-dd')
                    )
                ]);

                if (!todayResponse.success || !analyticsResponse.success) {
                    throw new Error(todayResponse.error || analyticsResponse.error || 'Failed to load analytics');
                }

                setTodaysSummary(todayResponse.data);
                setAnalytics(analyticsResponse.data);
            } catch (error) {
                console.error('Error fetching analytics:', error);
                setError(error.response?.data?.error || error.message || 'Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        const pollInterval = setInterval(fetchData, 30000);

        return () => clearInterval(pollInterval);
    }, [businessId, navigate]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>
            
            {loading && (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {!loading && !error && todaysSummary && (
                <div className="space-y-6">
                    {/* Main Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg shadow p-4">
                            <h3 className="text-lg font-semibold text-gray-700">All Captured Leads</h3>
                            <p className="text-3xl font-bold text-blue-600">{todaysSummary.allTime?.totalLeads || 0}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <h3 className="text-lg font-semibold text-gray-700">Total Chats</h3>
                            <p className="text-3xl font-bold text-green-600">{todaysSummary.allTime?.totalConversations || 0}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <h3 className="text-lg font-semibold text-gray-700">Conversion Rate</h3>
                            <p className="text-3xl font-bold text-purple-600">
                                {todaysSummary.allTime?.conversionRate ? todaysSummary.allTime.conversionRate.toFixed(1) : '0'}%
                            </p>
                        </div>
                    </div>

                    {/* Today's Stats */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Today's Stats</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <p className="text-xl font-bold text-blue-600">
                                    {todaysSummary.today?.totalLeads || 0}
                                </p>
                                <p className="text-gray-600">Today's Captured Leads</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-bold text-green-600">
                                    {todaysSummary.today?.totalConversations || 0}
                                </p>
                                <p className="text-gray-600">Today's Chats</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard; 