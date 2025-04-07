import React, { useState, useEffect } from 'react';
import { getAnalyticsData, getTodaysAnalytics } from '../../services/analyticsService';
import { format } from 'date-fns';

const AnalyticsDashboard = () => {
    const [analytics, setAnalytics] = useState(null);
    const [todaysSummary, setTodaysSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const businessId = user.businessId;

    useEffect(() => {
        const fetchData = async () => {
            if (!businessId) {
                setError('Business ID not found. Please log in again.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                
                const today = new Date();
                const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                
                const [todayData, analyticsData] = await Promise.all([
                    getTodaysAnalytics(businessId),
                    getAnalyticsData(
                        businessId, 
                        format(lastWeek, 'yyyy-MM-dd'), 
                        format(today, 'yyyy-MM-dd')
                    )
                ]);

                setTodaysSummary(todayData);
                setAnalytics(analyticsData);
            } catch (error) {
                console.error('Error fetching analytics:', error);
                setError(error.response?.data?.error || 'Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [businessId]);

    if (!businessId) {
        return (
            <div className="p-6">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    Business ID not found. Please log in again.
                </div>
            </div>
        );
    }

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
                    {/* Today's Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg shadow p-4">
                            <h3 className="text-lg font-semibold text-gray-700">Today's Leads</h3>
                            <p className="text-3xl font-bold text-blue-600">{todaysSummary.today?.totalLeads || 0}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <h3 className="text-lg font-semibold text-gray-700">Total Chats</h3>
                            <p className="text-3xl font-bold text-green-600">{todaysSummary.today?.totalConversations || 0}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <h3 className="text-lg font-semibold text-gray-700">Conversion Rate</h3>
                            <p className="text-3xl font-bold text-purple-600">
                                {todaysSummary.today?.conversionRate ? todaysSummary.today.conversionRate.toFixed(1) : '0'}%
                            </p>
                        </div>
                    </div>

                    {/* Lead Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Today's Lead Status */}
                        <div className="bg-white rounded-lg shadow p-4">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4">Today's Lead Status</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-xl font-bold text-blue-600">
                                        {todaysSummary.today?.leadStatus?.new || 0}
                                    </p>
                                    <p className="text-gray-600">New</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-bold text-yellow-600">
                                        {todaysSummary.today?.leadStatus?.contacted || 0}
                                    </p>
                                    <p className="text-gray-600">Contacted</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-bold text-green-600">
                                        {todaysSummary.today?.leadStatus?.converted || 0}
                                    </p>
                                    <p className="text-gray-600">Converted</p>
                                </div>
                            </div>
                        </div>

                        {/* All-time Lead Status */}
                        <div className="bg-white rounded-lg shadow p-4">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4">All-time Lead Status</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-xl font-bold text-blue-600">
                                        {todaysSummary.allTime?.leadStatus?.new || 0}
                                    </p>
                                    <p className="text-gray-600">New</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-bold text-yellow-600">
                                        {todaysSummary.allTime?.leadStatus?.contacted || 0}
                                    </p>
                                    <p className="text-gray-600">Contacted</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-bold text-green-600">
                                        {todaysSummary.allTime?.leadStatus?.converted || 0}
                                    </p>
                                    <p className="text-gray-600">Converted</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard; 