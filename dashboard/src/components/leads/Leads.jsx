import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { HiOutlineSearch, HiOutlineAdjustments, HiOutlineX, HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi';

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

  // Retrieve user info from localStorage to get businessId
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
  const businessId = user?.businessId;
  
  console.log('User from localStorage:', user);
  console.log('Business ID:', businessId);
  console.log('Raw localStorage user:', localStorage.getItem('user'));

  useEffect(() => {
    fetchLeads();
  }, [businessId]);

  const fetchLeads = async () => {
    if (!businessId) {
      setError('No business information found.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/leads/${businessId}`);
      setLeads(Array.isArray(response.data) ? response.data : []);
      setError(''); // Clear any previous errors
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError(err.response?.data?.error || 'Failed to fetch leads.');
    } finally {
      setLoading(false);
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{lead.name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <HiOutlineX className="h-6 w-6" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Contact Information</p>
            <p><strong>Phone:</strong> {lead.phone}</p>
            <p><strong>Email:</strong> {lead.email || 'N/A'}</p>
            <p><strong>Service:</strong> {lead.service}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Lead Details</p>
            <p><strong>Status:</strong> 
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                className="ml-2 border rounded p-1"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </p>
            <p><strong>Priority:</strong> {lead.priority}</p>
            <p><strong>Created:</strong> {new Date(lead.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Notes & History</p>
          <div className="max-h-60 overflow-y-auto border rounded p-2">
            {[...(lead.callHistory || [])]
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .map((call, index) => (
                <div key={index} className="mb-2 p-2 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500 mb-1">
                    {new Date(call.timestamp).toLocaleString()}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{call.notes}</p>
                </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {successMessage && (
            <div className="mb-2 p-2 bg-green-100 text-green-700 rounded">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="mb-2 p-2 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          <textarea
            ref={textareaRef}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add a note..."
            rows="3"
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                await handleAddNote(lead._id, e.target.value, textareaRef.current);
              }
            }}
          />
          <p className="text-sm text-gray-500 mt-1">Press Enter to add note (Shift + Enter for new line)</p>
        </div>
      </div>
    </div>
  )};

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse flex space-x-4">
          <div className="h-12 w-12 bg-blue-400 rounded-full"></div>
          <div className="h-12 w-12 bg-blue-400 rounded-full"></div>
          <div className="h-12 w-12 bg-blue-400 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Your Leads</h2>
          
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search leads..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                className="w-full sm:w-64 pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <HiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <HiOutlineAdjustments className="h-5 w-5 mr-2" />
              Filters
              {showFilters ? (
                <HiOutlineChevronUp className="ml-2 h-5 w-5" />
              ) : (
                <HiOutlineChevronDown className="ml-2 h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Priorities</option>
              {PRIORITY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {!error && leads.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No leads</h3>
          <p className="mt-1 text-sm text-gray-500">New leads will appear here when customers contact you.</p>
        </div>
      ) : (
        <>
          {/* Mobile View */}
          <div className="sm:hidden space-y-4">
            {filteredAndSortedLeads().map((lead) => (
              <LeadCard key={lead._id} lead={lead} />
            ))}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block">
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
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
        </>
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
