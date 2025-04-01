import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { HiOutlineSearch, HiOutlineAdjustments, HiOutlineX, HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineRefresh, HiOutlineExclamation, HiOutlineWifi } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'green' },
  { value: 'attempted-contact', label: 'Attempted Contact', color: 'yellow' },
  { value: 'contacted', label: 'Contacted', color: 'blue' },
  { value: 'scheduled', label: 'Scheduled', color: 'purple' },
  { value: 'completed', label: 'Completed', color: 'indigo' },
  { value: 'no-response', label: 'No Response', color: 'red' }
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High', color: 'red' },
  { value: 'normal', label: 'Normal', color: 'blue' },
  { value: 'low', label: 'Low', color: 'gray' }
];

const Leads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    service: '',
    searchTerm: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc'
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);

  // Get user info and businessId
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const businessId = user?.businessId;
  
  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Set filter height CSS variable when filter visibility changes
  useEffect(() => {
    if (showFilters) {
      document.documentElement.style.setProperty('--filter-height', '120px');
    } else {
      document.documentElement.style.setProperty('--filter-height', '0px');
    }
  }, [showFilters]);

  useEffect(() => {
    if (!businessId) {
      console.error('No business ID found - redirecting to login');
      navigate('/login');
      return;
    }
    
    fetchLeads();
    
    // Set up polling every 30 seconds
    const pollInterval = setInterval(() => {
      if (!isOffline) {
        fetchLeads(false); // Don't show loading state for automatic refreshes
      }
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [businessId, navigate, isOffline, retryCount]);

  const handleRetry = () => {
    setLoading(true);
    setError('');
    setRetryCount(prev => prev + 1);
  };

  const handleRefresh = () => {
    fetchLeads(true); // Show loading state for manual refresh
  };

  const fetchLeads = async (showLoadingState = true) => {
    if (!businessId) {
      setError('No business ID found. Please log in again.');
      setLoading(false);
      return;
    }

    if (isOffline) {
      setError('You are currently offline. Please check your internet connection.');
      setLoading(false);
      return;
    }

    if (showLoadingState) {
      setLoading(true);
    }
    setRefreshing(true);
    setError(''); // Clear any previous errors

    try {
      const response = await api.get(`/leads/${businessId}`);
      console.log('Fetched leads:', response.data);
      
      if (response.data && response.data.success && Array.isArray(response.data.leads)) {
        setLeads(response.data.leads);
        if (response.data.count === 0) {
          setError('No leads found for your business.');
        }
      } else {
        console.warn('Unexpected response format:', response.data);
        setLeads([]);
        setError('Received invalid data format from server');
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
      const errorMessage = err.response?.data?.error || 'Failed to fetch leads. Please try again.';
      setError(errorMessage);
      
      // If error is related to security software, show more helpful message
      if (err.response?.data?.error?.includes('security software') || 
          err.response?.data?.error?.includes('blocked') ||
          errorMessage.includes('Unable to reach the server')) {
        setError(
          'Your security software (like Kaspersky) might be blocking connections to our server. ' +
          'Please add this website to your trusted sites or temporarily disable web protection.'
        );
      }
      
      if (err.response?.status === 401) {
        console.log('Authentication error - redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    if (isOffline) {
      setError('Cannot update status while offline');
      return;
    }
    
    try {
      await api.put(`/leads/${businessId}/${leadId}`, { status: newStatus });
      setLeads(leads.map(lead => 
        lead._id === leadId ? { ...lead, status: newStatus } : lead
      ));
    } catch (err) {
      console.error('Error updating lead status:', err);
      setError(err.response?.data?.error || 'Failed to update lead status.');
    }
  };

  const handleAddNote = async (leadId, note, textareaRef) => {
    if (isOffline) {
      setError('Cannot add notes while offline');
      return;
    }
    
    try {
      if (!note.trim()) {
        return; // Don't submit empty notes
      }

      // Validate that leadId is a valid MongoDB ObjectId (24 hex characters)
      if (!leadId || !/^[0-9a-fA-F]{24}$/.test(leadId)) {
        setError('Invalid lead ID format');
        return;
      }
      
      const response = await api.post(`/leads/${businessId}/notes/${leadId}`, { 
        note: note.trim() 
      });

      if (response.data) {
        await fetchLeads(); // Refresh leads to get updated notes
        setError(''); // Clear any previous errors
        setSuccessMessage('Note added successfully!');
        if (textareaRef) textareaRef.value = ''; // Clear textarea
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
        setSelectedLead(response.data); // Update the selectedLead state as well
      }
    } catch (err) {
      console.error('Error adding note:', err.response || err);
      
      // Specific error for 404 (Not Found)
      if (err.response && err.response.status === 404) {
        setError('Could not add note: Lead not found. The lead may have been deleted.');
      } else {
        setError(err.response?.data?.error || 'Failed to add note.');
      }
      
      // If there's a specific error message in the response, use it
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      }
    }
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const filteredAndSortedLeads = () => {
    return leads
      .filter(lead => {
        const matchesStatus = !filters.status || lead.status === filters.status;
        const matchesPriority = !filters.priority || lead.priority === filters.priority;
        const matchesService = !filters.service || lead.service.toLowerCase().includes(filters.service.toLowerCase());
        const matchesSearch = !filters.searchTerm || 
          lead.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          lead.email?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          lead.phone.includes(filters.searchTerm);
        return matchesStatus && matchesPriority && matchesService && matchesSearch;
      })
      .sort((a, b) => {
        if (sortConfig.key === 'createdAt') {
          return sortConfig.direction === 'asc' 
            ? new Date(a.createdAt) - new Date(b.createdAt)
            : new Date(b.createdAt) - new Date(a.createdAt);
        }
        return sortConfig.direction === 'asc'
          ? a[sortConfig.key] > b[sortConfig.key] ? 1 : -1
          : a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
      });
  };

  // Mobile Lead Card Component
  const LeadCard = ({ lead }) => (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{lead.name}</h3>
          <p className="text-sm text-gray-500">{lead.service}</p>
        </div>
        <select
          value={lead.status}
          onChange={(e) => handleStatusChange(lead._id, e.target.value)}
          className={`text-sm rounded-full px-3 py-1 ${
            lead.status === 'new' ? 'bg-green-100 text-green-800' : 
            lead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
            lead.status === 'attempted-contact' ? 'bg-yellow-100 text-yellow-800' :
            lead.status === 'scheduled' ? 'bg-purple-100 text-purple-800' :
            lead.status === 'completed' ? 'bg-indigo-100 text-indigo-800' :
            'bg-red-100 text-red-800'
          }`}
        >
          {STATUS_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <p className="text-gray-500">Phone</p>
          <p className="font-medium">{lead.phone}</p>
        </div>
        <div>
          <p className="text-gray-500">Email</p>
          <p className="font-medium truncate">{lead.email || 'N/A'}</p>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          lead.priority === 'high' ? 'bg-red-100 text-red-800' : 
          lead.priority === 'normal' ? 'bg-blue-100 text-blue-800' : 
          'bg-gray-100 text-gray-800'
        }`}>
          {lead.priority}
        </span>
        <button
          onClick={() => setSelectedLead(lead)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View Details
        </button>
      </div>
    </div>
  );

  const LeadDetailsModal = ({ lead, onClose }) => {
    const textareaRef = React.useRef();
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [noteError, setNoteError] = useState('');
    const [currentLead, setCurrentLead] = useState(lead);
    
    const addNote = async () => {
      if (!textareaRef.current?.value.trim()) {
        return; // Don't submit empty notes
      }
      
      setIsAddingNote(true);
      setNoteError('');
      
      try {
        // Make sure we're using the correct leadId from the selected lead
        const response = await api.post(`/leads/${businessId}/notes/${currentLead._id}`, { 
          note: textareaRef.current.value.trim() 
        });

        if (response.data) {
          // Update both the leads array and the current lead in the modal
          setLeads(leads.map(l => l._id === currentLead._id ? response.data : l));
          setCurrentLead(response.data);
          setSelectedLead(response.data); // Update the selectedLead state as well
          
          // Clear the textarea
          if (textareaRef.current) textareaRef.current.value = '';
          
          setSuccessMessage('Note added successfully!');
          setTimeout(() => setSuccessMessage(''), 3000);
        }
      } catch (err) {
        console.error('Error adding note:', err.response || err);
        
        if (err.response?.status === 404) {
          setNoteError('Lead not found. It may have been deleted or moved.');
        } else {
          setNoteError(err.response?.data?.error || 'Failed to add note. Please try again.');
        }
      } finally {
        setIsAddingNote(false);
      }
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">{currentLead.name}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <HiOutlineX className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-2">Contact Information</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone:</dt>
                    <dd className="text-sm text-gray-900">{currentLead.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email:</dt>
                    <dd className="text-sm text-gray-900">{currentLead.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Service:</dt>
                    <dd className="text-sm text-gray-900">{currentLead.service}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-md font-medium text-gray-900 mb-2">Lead Details</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status:</dt>
                    <dd className="mt-1">
                      <select
                        value={currentLead.status}
                        onChange={(e) => handleStatusChange(currentLead._id, e.target.value)}
                        className={`text-sm rounded-full px-3 py-1 ${
                          currentLead.status === 'new' ? 'bg-green-100 text-green-800' :
                          currentLead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                          currentLead.status === 'attempted-contact' ? 'bg-yellow-100 text-yellow-800' :
                          currentLead.status === 'scheduled' ? 'bg-purple-100 text-purple-800' :
                          currentLead.status === 'completed' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-red-100 text-red-800'
                        }`}
                      >
                        {STATUS_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Priority:</dt>
                    <dd className="text-sm text-gray-900">{currentLead.priority}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created:</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(currentLead.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-md font-medium text-gray-900 mb-2">Context/Reason</h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">{currentLead.reason || 'No context provided'}</p>
              </div>
            </div>

            <div className="max-h-[calc(100vh-500px)] min-h-[100px] overflow-y-auto">
              <h3 className="text-md font-medium text-gray-900 mb-2">Notes & History</h3>
              <div className="space-y-3">
                {currentLead.callHistory && currentLead.callHistory.length > 0 ? (
                  currentLead.callHistory.map((entry, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm text-gray-700">{entry.notes}</p>
                        <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {entry.status && (
                        <p className="text-xs text-gray-500">Status: {entry.status}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No notes or history found for this lead.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-t bg-gray-50">
            {noteError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{noteError}</p>
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                placeholder="Add a note..."
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="2"
                ref={textareaRef}
              />
              <button
                onClick={addNote}
                disabled={isAddingNote}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  isAddingNote 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isAddingNote ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Offline state
  if (isOffline) {
    return (
      <div className="h-full w-full overflow-y-auto md:pt-0 pt-16 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
          <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-8">
            <div className="flex flex-col items-center justify-center py-12">
              <HiOutlineWifi className="w-16 h-16 text-gray-400 mb-4" />
              <h2 className="text-xl font-bold text-gray-700 mb-2">You're offline</h2>
              <p className="text-gray-500 text-center max-w-md mb-6">
                We can't load your leads because you appear to be offline. Please check your 
                internet connection and try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
              >
                <HiOutlineRefresh className="w-5 h-5 mr-2" />
                Refresh page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Security software blocking state
  if (error && (error.includes('security software') || error.includes('blocked'))) {
    return (
      <div className="h-full w-full overflow-y-auto md:pt-0 pt-16 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
          <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-8">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-red-100 p-3 rounded-full mb-4">
                <HiOutlineExclamation className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-700 mb-2">Connection Blocked</h2>
              <p className="text-gray-500 text-center max-w-md mb-2">
                Your security software (like Kaspersky) is blocking connections to our server.
              </p>
              <p className="text-gray-500 text-center max-w-md mb-6">
                Please add this website to your trusted sites or temporarily disable web protection 
                to use all features.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
                >
                  <HiOutlineRefresh className="w-5 h-5 mr-2" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <HiOutlineExclamation className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={handleRetry}
              className="mt-2 text-blue-600 hover:text-blue-800 font-medium flex items-center text-sm"
            >
              <HiOutlineRefresh className="w-4 h-4 mr-1" />
              Try again
            </button>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700">{successMessage}</p>
        </div>
      )}

      {!error && leads.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No leads found. New leads will appear here when customers contact you.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          {/* Mobile Header */}
          <div className="md:hidden flex flex-col space-y-2 fixed top-0 left-0 right-0 bg-white z-20 px-4 pb-4 pt-20 border-b shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => document.dispatchEvent(new CustomEvent('toggle-sidebar'))}
                  className="hidden landscape:block -ml-1 p-1 rounded-lg text-gray-500 hover:bg-gray-100"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h2 className="text-lg font-bold text-gray-900">Your Leads</h2>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <svg className={`h-5 w-5 mr-1 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search leads..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              <div className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Filters
              </div>
              {showFilters ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
            {showFilters && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    >
                      <option value="">All Statuses</option>
                      {STATUS_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={filters.priority}
                      onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    >
                      <option value="">All Priorities</option>
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Header - Hide on Mobile */}
          <div className="hidden md:block mb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Your Leads</h2>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className={`inline-flex items-center px-2 py-1 lg:px-3 lg:py-1.5 border rounded-lg text-sm font-medium ${
                    refreshing 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'
                  }`}
                >
                  <svg
                    className={`h-4 w-4 lg:h-5 lg:w-5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              {/* Search and Filter Controls */}
              <div className="flex flex-col lg:flex-row gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search leads..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                    className="w-full lg:w-64 pl-10 pr-4 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <HiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-1.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <HiOutlineAdjustments className="h-5 w-5 mr-2" />
                  Filters
                  {showFilters ? <HiOutlineChevronUp className="ml-2 h-5 w-5" /> : <HiOutlineChevronDown className="ml-2 h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Expandable Filters - Desktop */}
            {showFilters && (
              <div className="mt-2 grid grid-cols-1 lg:grid-cols-4 gap-2">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full border rounded-lg p-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="w-full border rounded-lg p-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Priorities</option>
                  {PRIORITY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="h-full">
            {/* Desktop View - Original Table Layout */}
            <div className="hidden md:block h-full overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name/Service
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedLeads().map((lead) => (
                    <tr key={lead._id}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                          <div className="text-sm text-gray-500">{lead.service}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm text-gray-900">{lead.phone}</div>
                          <div className="text-sm text-gray-500">{lead.email || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                          className={`text-sm rounded-full px-3 py-1 ${
                            lead.status === 'new' ? 'bg-green-100 text-green-800' : 
                            lead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                            lead.status === 'attempted-contact' ? 'bg-yellow-100 text-yellow-800' :
                            lead.status === 'scheduled' ? 'bg-purple-100 text-purple-800' :
                            lead.status === 'completed' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-red-100 text-red-800'
                          }`}
                        >
                          {STATUS_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                          lead.priority === 'high' ? 'bg-red-100 text-red-800' : 
                          lead.priority === 'normal' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {lead.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View - Card Layout */}
            <div className="md:hidden h-full overflow-y-auto pt-[calc(140px+var(--filter-height,0px))] landscape:w-screen landscape:pl-0">
              <div className="grid grid-cols-1 gap-4 px-4 pb-4">
                {filteredAndSortedLeads().map((lead) => (
                  <div key={lead._id} className="bg-white rounded-lg shadow-sm p-4 landscape:h-[calc(100vh-12rem)] flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900 text-lg landscape:text-base">{lead.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{lead.service}</p>
                      </div>
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                        className={`text-sm rounded-full px-2 py-1 portrait:block landscape:hidden ${
                          lead.status === 'new' ? 'bg-green-100 text-green-800' : 
                          lead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                          lead.status === 'attempted-contact' ? 'bg-yellow-100 text-yellow-800' :
                          lead.status === 'scheduled' ? 'bg-purple-100 text-purple-800' :
                          lead.status === 'completed' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-red-100 text-red-800'
                        }`}
                      >
                        {STATUS_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-grow flex flex-col justify-between">
                      <div className="grid grid-cols-2 gap-4 landscape:gap-2">
                        <div>
                          <p className="text-gray-500 mb-1 landscape:text-sm">Phone</p>
                          <p className="font-medium landscape:text-sm">{lead.phone}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1 landscape:text-sm">Email</p>
                          <p className="font-medium truncate landscape:text-sm">{lead.email || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 landscape:gap-2 mt-4 landscape:mt-2">
                        <div>
                          <p className="text-gray-500 mb-1 landscape:text-sm">Created</p>
                          <p className="font-medium landscape:text-sm">{new Date(lead.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="portrait:block landscape:hidden">
                          <p className="text-gray-500 mb-1 landscape:text-sm">Priority</p>
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                            lead.priority === 'high' ? 'bg-red-100 text-red-800' : 
                            lead.priority === 'normal' ? 'bg-blue-100 text-blue-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {lead.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end mt-4 landscape:mt-2 pt-4 landscape:pt-2 border-t">
                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedLead && (
        <LeadDetailsModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
};

export default Leads;
