import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { HiOutlineSearch, HiOutlineAdjustments, HiOutlineX, HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi';
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

  // Get user info and businessId
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const businessId = user?.businessId;
  
  useEffect(() => {
    if (!businessId) {
      console.error('No business ID found - redirecting to login');
      navigate('/login');
      return;
    }
    
    fetchLeads();
    
    // Set up polling every 30 seconds
    const pollInterval = setInterval(() => {
      fetchLeads(false); // Don't show loading state for automatic refreshes
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [businessId, navigate]);

  const handleRefresh = () => {
    fetchLeads(true); // Show loading state for manual refresh
  };

  const fetchLeads = async (showLoadingState = true) => {
    if (!businessId) {
      setError('No business ID found. Please log in again.');
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
    try {
      await api.put(`/leads/${businessId}/${leadId}`, { status: newStatus });
      setLeads(leads.map(lead => 
        lead._id === leadId ? { ...lead, status: newStatus } : lead
      ));
    } catch (err) {
      console.error('Error updating lead status:', err);
      setError('Failed to update lead status.');
    }
  };

  const handleAddNote = async (leadId, note, textareaRef) => {
    try {
      if (!note.trim()) {
        return; // Don't submit empty notes
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
      }
    } catch (err) {
      console.error('Error adding note:', err.response || err);
      setError(err.response?.data?.error || 'Failed to add note.');
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
    
    return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">{lead.name}</h2>
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
                  <dd className="text-sm text-gray-900">{lead.phone}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email:</dt>
                  <dd className="text-sm text-gray-900">{lead.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Service:</dt>
                  <dd className="text-sm text-gray-900">{lead.service}</dd>
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
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Priority:</dt>
                  <dd className="text-sm text-gray-900">{lead.priority}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created:</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-md font-medium text-gray-900 mb-2">Context/Reason</h3>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700">{lead.reason}</p>
            </div>
          </div>

          <div className="h-[calc(100vh-500px)] overflow-y-auto">
            <h3 className="text-md font-medium text-gray-900 mb-2">Notes & History</h3>
            <div className="space-y-3">
              {lead.callHistory && lead.callHistory.map((entry, index) => (
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
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <textarea
              placeholder="Add a note..."
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="2"
              ref={textareaRef}
            />
            <button
              onClick={() => handleAddNote(lead._id, textareaRef.current.value, textareaRef)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              Add Note
            </button>
          </div>
        </div>
      </div>
    </div>
  )};

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
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700">{successMessage}</p>
        </div>
      )}

      <div className="mb-2">
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

        {/* Expandable Filters */}
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

      {!error && leads.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No leads found. New leads will appear here when customers contact you.</p>
        </div>
      ) : (
        <div className="flex-1 -mx-4 px-4 overflow-hidden">
          <div className="h-full bg-white shadow-sm rounded-lg">
            <div className="overflow-x-auto h-full">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {[
                      { key: 'name', label: 'Name' },
                      { key: 'phone', label: 'Phone' },
                      { key: 'email', label: 'Email' },
                      { key: 'service', label: 'Service' },
                      { key: 'status', label: 'Status' },
                      { key: 'priority', label: 'Priority' },
                      { key: 'createdAt', label: 'Created' },
                      { key: 'actions', label: 'Actions' }
                    ].map((column) => (
                      <th
                        key={column.key}
                        onClick={() => column.key !== 'actions' && column.key !== 'phone' && column.key !== 'email' && handleSort(column.key)}
                        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                          column.key !== 'actions' && column.key !== 'phone' && column.key !== 'email' ? 'cursor-pointer hover:text-gray-700' : ''
                        }`}
                      >
                        <div className="flex items-center">
                          {column.label}
                          {sortConfig.key === column.key && (
                            <span className="ml-2">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedLeads().map((lead) => (
                    <tr key={lead._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lead.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.service}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          lead.priority === 'high' ? 'bg-red-100 text-red-800' : 
                          lead.priority === 'normal' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {lead.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
