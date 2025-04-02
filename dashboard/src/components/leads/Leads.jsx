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

const Leads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
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
        const matchesService = !filters.service || lead.service.toLowerCase().includes(filters.service.toLowerCase());
        const matchesSearch = !filters.searchTerm || 
          lead.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          lead.email?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          lead.phone.includes(filters.searchTerm);
        return matchesStatus && matchesService && matchesSearch;
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
    const [isDeletingNote, setIsDeletingNote] = useState(false);
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

    const removeNote = async (noteId) => {
      if (!window.confirm('Are you sure you want to remove this note?')) {
        return;
      }

      setIsDeletingNote(true);
      setNoteError('');
      
      try {
        const response = await api.delete(`/leads/${businessId}/notes/${currentLead._id}/${noteId}`);

        if (response.data) {
          // Update both the leads array and the current lead in the modal
          setLeads(leads.map(l => l._id === currentLead._id ? response.data : l));
          setCurrentLead(response.data);
          setSelectedLead(response.data);
          
          setSuccessMessage('Note removed successfully!');
          setTimeout(() => setSuccessMessage(''), 3000);
        }
      } catch (err) {
        console.error('Error removing note:', err.response || err);
        setNoteError(err.response?.data?.error || 'Failed to remove note. Please try again.');
      } finally {
        setIsDeletingNote(false);
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
                    <div key={entry._id || index} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{entry.notes}</p>
                          <span className="text-xs text-gray-500 block mt-1">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {entry._id && (
                          <button
                            onClick={() => removeNote(entry._id)}
                            disabled={isDeletingNote}
                            className="ml-2 p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                            title="Remove note"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
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
    <div className="min-h-screen bg-gray-100">
      {/* Mobile View - Card Layout */}
      <div className="md:hidden">
        {filteredAndSortedLeads().map((lead) => (
          <div key={lead._id} className="bg-white rounded-lg shadow-sm p-4">
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
            <button
              onClick={() => setSelectedLead(lead)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View Details
            </button>
          </div>
        ))}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
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

      {/* Filters section */}
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
