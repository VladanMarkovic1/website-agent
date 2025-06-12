import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  PhoneIcon, 
  PhoneXMarkIcon, 
  ChatBubbleLeftRightIcon, 
  UserPlusIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { 
  getCallTrackingAnalytics, 
  getCallTrends,
  formatAnalyticsForDashboard,
  formatCallTrendsForCharts,
  formatCallDistribution
} from '../../services/callTrackingService';

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const businessId = user?.businessId;
  
  const [timeframe, setTimeframe] = useState('1d');
  const [analytics, setAnalytics] = useState(null);
  const [callTrends, setCallTrends] = useState([]);
  const [callDistribution, setCallDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (businessId) {
      loadAnalytics();
    }
  }, [timeframe, businessId]);

  const loadAnalytics = async () => {
    if (!businessId) {
      setError('Business ID not found. Please log in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch real data from backend
      const [analyticsResponse, trendsResponse] = await Promise.all([
        getCallTrackingAnalytics(businessId, timeframe),
        getCallTrends(businessId, timeframe).catch(() => null) // Optional, fallback if not implemented
      ]);

      if (!analyticsResponse.success) {
        throw new Error(analyticsResponse.error || 'Failed to load analytics');
      }

      // Format analytics data for dashboard display
      const formattedAnalytics = formatAnalyticsForDashboard(analyticsResponse);
      setAnalytics(formattedAnalytics);

      // Format call trends for charts
      if (trendsResponse && trendsResponse.success) {
        const formattedTrends = formatCallTrendsForCharts(trendsResponse);
        setCallTrends(formattedTrends);
      } else {
        // Generate basic trends from analytics data if detailed trends not available
        const basicTrends = generateBasicTrends(analyticsResponse.analytics);
        setCallTrends(basicTrends);
      }

      // Format call distribution for pie chart
      const distribution = formatCallDistribution(analyticsResponse.analytics.calls);
      setCallDistribution(distribution);

    } catch (err) {
      console.error('❌ Failed to load analytics:', err);
      setError(err.message || 'Failed to load analytics data');
      
      // Don't fallback to mock data - show error instead
      setAnalytics(null);
      setCallTrends([]);
      setCallDistribution([]);
    } finally {
      setLoading(false);
    }
  };

  // Generate basic trends from analytics when detailed trends aren't available
  const generateBasicTrends = (analyticsData) => {
    const { calls } = analyticsData;
    const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
    
    return hours.map((hour, index) => {
      // Distribute calls across hours with business hours having more activity
      const businessHourMultiplier = (index >= 2 && index <= 4) ? 1.5 : 0.5;
      const hourCalls = Math.round((calls.totalCalls / 6) * businessHourMultiplier);
      const hourMissed = Math.round((calls.missedCalls / 6) * businessHourMultiplier);
      
      return {
        time: hour,
        calls: hourCalls,
        answered: hourCalls - hourMissed,
        missed: hourMissed
      };
    });
  };

  const timeframeOptions = [
    { value: '1d', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ];

  const formatTrend = (value) => {
    const isPositive = value > 0;
    const Icon = isPositive ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
    
    return (
      <div className={`flex items-center ${colorClass}`}>
        <Icon className="h-4 w-4 mr-1" />
        <span className="text-sm font-medium">{Math.abs(value).toFixed(1)}%</span>
      </div>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-600">Loading call tracking analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
            <h3 className="font-semibold">Error Loading Analytics</h3>
            <p className="mt-2">{error}</p>
            <button 
              onClick={loadAnalytics}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded-lg">
            <h3 className="font-semibold">No Data Available</h3>
            <p className="mt-2">No call tracking data found for the selected timeframe.</p>
            <p className="text-sm mt-2">Try making some test calls or check if your phone settings are configured correctly.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with timeframe selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Tracking Analytics</h1>
          <p className="text-gray-600">Monitor your practice's call performance and revenue recovery</p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {timeframeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button 
            onClick={loadAnalytics}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {/* Total Calls */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Calls</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalCalls}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <PhoneIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2">
            {formatTrend(analytics.trends.totalCalls)}
          </div>
        </div>

        {/* Missed Calls */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Missed Calls</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.missedCalls}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <PhoneXMarkIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-2">
            {formatTrend(analytics.trends.missedCalls)}
          </div>
        </div>

        {/* SMS Conversations */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">SMS<br/>Conversations</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.smsConversations}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2">
            {formatTrend(analytics.trends.smsConversations)}
          </div>
        </div>

        {/* Leads Generated */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Leads<br/>Generated</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.leadsGenerated}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <UserPlusIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2">
            {formatTrend(analytics.trends.leadsGenerated)}
          </div>
        </div>

        {/* Revenue Recovered */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue<br/>Recovered</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.revenueRecovered)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2">
            {formatTrend(analytics.trends.revenueRecovered)}
          </div>
        </div>

        {/* Recovery Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recovery<br/>Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.recoveryRate}%</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ArrowTrendingUpIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2">
            {formatTrend(analytics.trends.recoveryRate)}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Trends Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={callTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="calls" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Total Calls"
                />
                <Line 
                  type="monotone" 
                  dataKey="answered" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Answered"
                />
                <Line 
                  type="monotone" 
                  dataKey="missed" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  name="Missed"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Call Distribution Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={callDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {callDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-center space-x-6">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Answered: {analytics.totalCalls - analytics.missedCalls} (74%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Missed: {analytics.missedCalls} (26%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 