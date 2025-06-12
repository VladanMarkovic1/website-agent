import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  ChartBarIcon, 
  PhoneIcon, 
  ChatBubbleLeftRightIcon, 
  Cog6ToothIcon,
  UserGroupIcon,
  PhoneXMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { 
  getRecentCalls, 
  getMissedCalls,
  getSMSConversations,
  getPhoneSettings,
  sendManualSMS
} from '../services/callTrackingService';
import AnalyticsDashboard from '../components/calltracking/AnalyticsDashboard';

// Individual page components for call tracking sections
const CallTrackingAnalytics = () => <AnalyticsDashboard />;

const CallTrackingCalls = () => {
  const { user } = useAuth();
  const businessId = user?.businessId;
  
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (businessId) {
      loadCalls();
    }
  }, [businessId, filter]);

  const loadCalls = async () => {
    if (!businessId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let callsData;
      if (filter === 'missed') {
        const response = await getMissedCalls(businessId, 20);
        callsData = response.success ? response.missedCalls : [];
      } else {
        const response = await getRecentCalls(businessId, 20, filter === 'missed');
        callsData = response.success ? response.calls : [];
      }
      
      setCalls(callsData);
    } catch (err) {
      console.error('Failed to load calls:', err);
      setError('Failed to load call data');
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCallTime = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Recent Calls</h1>
        <div className="flex space-x-3">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Calls</option>
            <option value="missed">Missed Calls</option>
            <option value="answered">Completed Calls</option>
          </select>
          <button 
            onClick={loadCalls}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Call History</h3>
        </div>
        
        {calls.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <PhoneIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p>No calls found for the selected filter.</p>
            <p className="text-sm mt-1">Calls will appear here once your phone tracking is active.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {calls.map((call) => (
              <div key={call.callId || call._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${call.isMissedCall ? 'bg-red-100' : 'bg-green-100'}`}>
                    <PhoneIcon className={`h-5 w-5 ${call.isMissedCall ? 'text-red-600' : 'text-green-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {call.callerNumber || call.formattedCallerNumber || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {call.extractedInfo?.serviceInterest || 'General Inquiry'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-900">
                      {call.timeAgo || formatCallTime(call.callTime || call.callStartTime)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDuration(call.duration || call.callDuration)}
                    </p>
                  </div>
                  <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                    call.isMissedCall ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {call.isMissedCall ? 'Missed' : 'Completed'}
                  </div>
                  <div className="flex flex-col text-xs text-gray-500">
                    {call.smsTriggered && (
                      <span className="text-green-600">✓ SMS Sent</span>
                    )}
                    {call.leadCreated && (
                      <span className="text-blue-600">✓ Lead Created</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CallTrackingConversations = () => {
  const { user } = useAuth();
  const businessId = user?.businessId;
  
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (businessId) {
      loadConversations();
    }
  }, [businessId]);

  const loadConversations = async () => {
    if (!businessId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await getSMSConversations(businessId, 20, 'all');
      if (response.success) {
        setConversations(response.conversations);
        if (response.conversations.length > 0 && !selectedConversation) {
          setSelectedConversation(response.conversations[0]);
        }
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setError('Failed to load conversation data');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !businessId) return;
    
    setSending(true);
    try {
      await sendManualSMS(businessId, selectedConversation.phoneNumber, newMessage);
      setNewMessage('');
      // Reload conversations to get updated messages
      await loadConversations();
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">SMS Conversations</h1>
        <button 
          onClick={loadConversations}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation List */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">Active Conversations ({conversations.length})</h3>
            </div>
            
            {conversations.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No conversations found.</p>
                <p className="text-sm mt-1">SMS conversations will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {conversations.map((conversation) => (
                  <div 
                    key={conversation.conversationId} 
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                      selectedConversation?.conversationId === conversation.conversationId ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <ChatBubbleLeftRightIcon className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {conversation.phoneNumber || conversation.formattedPhoneNumber}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {conversation.lastMessage?.content || conversation.latestMessage || 'No messages'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="text-xs text-gray-500">
                          {conversation.timeAgo || formatMessageTime(conversation.lastActivity)}
                        </p>
                        <div className="flex items-center space-x-1 mt-1">
                          {conversation.triggeredByMissedCall && (
                            <PhoneXMarkIcon className="h-3 w-3 text-red-500" title="Triggered by missed call" />
                          )}
                          {conversation.leadCreated && (
                            <UserGroupIcon className="h-3 w-3 text-green-500" title="Lead created" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg h-96 flex flex-col">
            {selectedConversation ? (
              <>
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">
                      {selectedConversation.phoneNumber || selectedConversation.formattedPhoneNumber}
                    </h3>
                    <div className="text-xs text-gray-500">
                      {selectedConversation.messageCount} messages
                    </div>
                  </div>
                  {selectedConversation.extractedInfo && (
                    <div className="mt-1 text-xs text-gray-600">
                      Interest: {selectedConversation.extractedInfo.serviceInterest || 'General'}
                      {selectedConversation.extractedInfo.urgencyLevel && 
                        ` • Priority: ${selectedConversation.extractedInfo.urgencyLevel}`
                      }
                    </div>
                  )}
                </div>
                
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                  {selectedConversation.messages && selectedConversation.messages.length > 0 ? (
                    selectedConversation.messages.map((message, index) => (
                      <div key={index} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`rounded-lg px-3 py-2 max-w-xs ${
                          message.direction === 'outbound' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.direction === 'outbound' ? 'text-blue-200' : 'text-gray-500'
                          }`}>
                            {formatMessageTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <p>No messages in this conversation yet.</p>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-gray-200 p-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={sending}
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={sending || !newMessage.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p>Select a conversation to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CallTrackingSettings = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-gray-900">Phone Settings</h1>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Phone Configuration */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Phone Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Business Phone Number</label>
            <input
              type="text"
              value="(555) 123-DENTAL"
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tracking Number</label>
            <input
              type="text"
              value="(555) 987-TRACK"
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Call Forwarding</label>
            <select className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Forward to main line</option>
              <option>Forward to mobile</option>
              <option>Send to voicemail</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* SMS Templates */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">SMS Templates</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Missed Call Response</label>
            <textarea
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue="Hi! I see you called Bright Smile Dental. We'd love to help you schedule an appointment. Please reply with your preferred date and time, or call us back at (555) 123-DENTAL."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Emergency Response</label>
            <textarea
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue="This is an emergency line. Please call us immediately at (555) 123-DENTAL or visit our emergency contact page for after-hours care."
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const CallTrackingPage = () => {
  const location = useLocation();
  
  // Sub-navigation for call tracking sections
  const callTrackingNav = [
    { name: 'Analytics', path: '/dashboard/call-tracking', icon: ChartBarIcon },
    { name: 'Calls', path: '/dashboard/call-tracking/calls', icon: PhoneIcon },
    { name: 'Conversations', path: '/dashboard/call-tracking/conversations', icon: ChatBubbleLeftRightIcon },
    { name: 'Settings', path: '/dashboard/call-tracking/settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Call Tracking Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Call Tracking Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage your phone calls, SMS conversations, and call tracking settings</p>
      </div>

      {/* Sub Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {callTrackingNav.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path === '/dashboard/call-tracking' && location.pathname === '/dashboard/call-tracking');
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div>
        <Routes>
          <Route index element={<CallTrackingAnalytics />} />
          <Route path="calls" element={<CallTrackingCalls />} />
          <Route path="conversations" element={<CallTrackingConversations />} />
          <Route path="settings" element={<CallTrackingSettings />} />
        </Routes>
      </div>
    </div>
  );
};

export default CallTrackingPage; 