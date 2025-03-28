import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

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

  const LeadDetailsModal = ({ lead, onClose }) => {
    const textareaRef = React.useRef();
    
    return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{lead.name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
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
                    {new Date(call.timestamp).toLocaleString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
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
        <p className="text-lg">Loading leads...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Leads</h2>
        <div className="flex gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border rounded p-2"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="border rounded p-2"
          >
            <option value="">All Priorities</option>
            {PRIORITY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search leads..."
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            className="border rounded p-2"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!error && leads.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No leads found yet. They will appear here when customers contact you.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('name')}>
                  Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('service')}>
                  Service {sortConfig.key === 'service' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('status')}>
                  Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('priority')}>
                  Priority {sortConfig.key === 'priority' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('createdAt')}>
                  Created {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedLeads().map((lead) => (
                <tr key={lead._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{lead.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{lead.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{lead.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{lead.service}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                      className={`px-2 py-1 text-xs font-semibold rounded-full
                        ${lead.status === 'new' ? 'bg-green-100 text-green-800' : 
                          lead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                          lead.status === 'attempted-contact' ? 'bg-yellow-100 text-yellow-800' :
                          lead.status === 'scheduled' ? 'bg-purple-100 text-purple-800' :
                          lead.status === 'completed' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-red-100 text-red-800'}`}
                    >
                      {STATUS_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${lead.priority === 'high' ? 'bg-red-100 text-red-800' : 
                        lead.priority === 'normal' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'}`}>
                      {lead.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedLead(lead)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
