import React, { useState, useEffect, useCallback } from 'react';
import { HiOutlineSearch, HiOutlineAdjustments, HiOutlineX, HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineRefresh, HiOutlineExclamation, HiOutlineWifi } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';
import { useFetchLeads } from '../../hooks/useFetchLeads';
import { useLeadFilters } from '../../hooks/useLeadFilters';
import { updateLeadStatus } from '../../services/leadService';
import LeadCard from './LeadCard';
import LeadDetailsModal from './LeadDetailsModal';
import { STATUS_OPTIONS } from './constants';
import Spinner from '../common/Spinner'; // Correct path to the new Spinner component

const Leads = () => {
  const navigate = useNavigate();
  const [selectedLead, setSelectedLead] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [actionError, setActionError] = useState(''); // For errors from status updates etc.
  const [successMessage, setSuccessMessage] = useState(''); // For general success messages
  const { user } = useAuth(); // Get user from Auth context

  // Derive businessId safely from the user context
  const businessId = user?.businessId;

  // Redirect if businessId is missing (should not happen if logged in correctly)
  useEffect(() => {
    if (!businessId) {
      console.error('[Leads.jsx] Missing businessId, redirecting to login.');
      // Consider calling logout() from context here too for full cleanup
      navigate('/login'); 
    }
  }, [businessId, navigate]);

  // --- Custom Hooks --- 
  const {
    leads,
    setLeads, // Get setLeads to update list after modal actions
    loading,
    error: fetchError,
    isOffline,
    setIsOffline, // Allow hook to update offline state
    refreshing,
    handleRefresh,
    handleRetry,
  } = useFetchLeads(businessId);

  const {
    filters,
    sortConfig,
    handleFilterChange,
    handleSort,
    filteredLeads
  } = useLeadFilters(leads);
  // --- End Custom Hooks ---

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

  // Show temporary success messages
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Handle status change directly from the list (Table/Card)
  const handleListStatusChange = useCallback(async (leadId, newStatus) => {
    if (isOffline) {
      setActionError('Cannot update status while offline.');
      return;
    }
    setActionError(''); // Clear previous action errors
    try {
      const updatedLead = await updateLeadStatus(businessId, leadId, newStatus);
      // Optimistically update the list or re-fetch if needed
      // Here, we update the state managed by useFetchLeads
      setLeads(currentLeads =>
        currentLeads.map(l => (l._id === leadId ? updatedLead : l))
      );
      showSuccess('Status updated successfully!');
    } catch (err) {
      console.error('Error updating lead status from list:', err);
      setActionError(err.message || 'Failed to update status.');
    } 
  }, [businessId, isOffline, setLeads]); // Include setLeads dependency

  // Callback for when the modal updates a lead (e.g., adds/removes note)
  const handleLeadUpdateFromModal = useCallback((updatedLead) => {
    setLeads(currentLeads => 
        currentLeads.map(l => l._id === updatedLead._id ? updatedLead : l)
    );
    // Optionally update the selected lead state if it's still open
    if (selectedLead && selectedLead._id === updatedLead._id) {
      setSelectedLead(updatedLead);
    }
  }, [setLeads, selectedLead]);

  // ---- Helper variables for rendering logic ----
  const shouldShowLeadsContainer = !loading;
  // Determine which specific error message to show, if any (excluding security/offline handled separately)
  const generalFetchError = (!loading && fetchError && !fetchError.includes('No leads found') && !fetchError.includes('security software')) ? fetchError : null;
  const noLeadsFoundError = (!loading && fetchError && fetchError.includes('No leads found')) ? fetchError : null;
  // Condition to show the empty state (either no leads fetched or filtered to empty)
  const showEmptyState = !loading && filteredLeads.length === 0;

  // ---- Render Logic ----

  if (isOffline) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 bg-gray-100">
         <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <HiOutlineWifi className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">You're offline</h2>
            <p className="text-gray-500 mb-6">
             We can't load your leads right now. Please check your connection.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm"
            >
              <HiOutlineRefresh className="w-5 h-5 mr-2" />
              Refresh page
            </button>
         </div>
      </div>
    );
  }

  // Specific error for security software blocking
  if (fetchError && (fetchError.includes('security software') || fetchError.includes('blocked'))) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 bg-gray-100">
         <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="bg-red-100 p-3 rounded-full mb-4 inline-block">
               <HiOutlineExclamation className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Connection Blocked</h2>
            <p className="text-gray-500 mb-2 max-w-md mx-auto">
              Your security software might be blocking connections to our server.
            </p>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Please add this website to trusted sites or adjust web protection settings.
            </p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm"
            >
              <HiOutlineRefresh className="w-5 h-5 mr-2" />
              Try again
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          {/* Header with Title, Search, Filter Toggle, Refresh */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Leads</h1>
            <div className="flex items-center gap-2 flex-grow md:flex-grow-0 md:w-auto">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search name, email, phone..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <HiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg ${showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                title={showFilters ? 'Hide Filters' : 'Show Filters'}
              >
                <HiOutlineAdjustments className="h-5 w-5" />
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`p-2 rounded-lg text-gray-500 hover:bg-gray-100 ${refreshing ? 'animate-spin' : ''}`}
                title="Refresh Leads"
              >
                <HiOutlineRefresh className="h-5 w-5" />
              </button>
            </div>
          </div>
          {/* Filter Section */}
          {showFilters && (
            <div className="mt-4 border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                       id="status-filter"
                       value={filters.status}
                       onChange={(e) => handleFilterChange('status', e.target.value)}
                       className="w-full rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                       <option value="">All Statuses</option>
                       {STATUS_OPTIONS.map(option => (
                       <option key={option.value} value={option.value}>{option.label}</option>
                       ))}
                    </select>
                 </div>
                 {/* Add other filters here if needed (e.g., Service) */}
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
           <div className="flex justify-center items-center py-10">
              <Spinner />
           </div>
        )}

        {/* General Fetch Error Display */}
        {generalFetchError && (
           <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">
             <strong className="font-bold">Error: </strong>
             <span className="block sm:inline">{generalFetchError}</span>
             {generalFetchError.includes('Failed') && (
                 <button onClick={handleRetry} className="ml-4 px-2 py-1 bg-red-100 border border-red-300 rounded text-sm font-medium hover:bg-red-200">Retry</button>
             )}
           </div>
        )}

        {/* Action Error/Success Display */}
        {actionError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm" role="alert">
                {actionError}
            </div>
        )}
        {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg mb-4 text-sm" role="alert">
                {successMessage}
            </div>
        )}

        {/* Leads Display Area (Render if not loading and no critical errors handled above) */}
        {shouldShowLeadsContainer && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
             {showEmptyState ? (
                <div className="text-center p-6 text-gray-500">
                   {noLeadsFoundError ? noLeadsFoundError : 'No leads match the current filters.'}
                </div>
             ) : (
                <React.Fragment>
                   {/* Mobile View - Card Layout */}
                   <div className="md:hidden divide-y divide-gray-100">
                     {filteredLeads.map((lead) => (
                       <LeadCard
                         key={lead._id}
                         lead={lead}
                         onStatusChange={handleListStatusChange}
                         onSelectLead={setSelectedLead}
                       />
                     ))}
                   </div>

                   {/* Desktop View - Table Layout */}
                   <div className="hidden md:block">
                     <table className="min-w-full divide-y divide-gray-200">
                       <thead className="bg-gray-50">
                         <tr>
                           {/* Add onClick handlers for sorting */}
                           <th scope="col" onClick={() => handleSort('name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                              Name/Service {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                           </th>
                           <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Contact
                           </th>
                           <th scope="col" onClick={() => handleSort('status')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                              Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                           </th>
                           <th scope="col" onClick={() => handleSort('createdAt')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                              Created {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                           </th>
                           <th scope="col" className="relative px-6 py-3">
                             <span className="sr-only">Actions</span>
                           </th>
                         </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-gray-200">
                         {filteredLeads.map((lead) => (
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
                                 <div className="text-sm text-gray-500 break-all">{lead.email || 'N/A'}</div>
                               </div>
                             </td>
                             <td className="px-6 py-4">
                               <select
                                 value={lead.status}
                                 onChange={(e) => handleListStatusChange(lead._id, e.target.value)}
                                  onClick={(e) => e.stopPropagation()} // Prevent row click when changing status
                                  className={`text-sm rounded-full px-3 py-1 border border-transparent ${ 
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
                               {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'N/A'}
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
                </React.Fragment>
             )}
          </div>
        )}

        {/* Modal */}
        {selectedLead && (
          <LeadDetailsModal
            lead={selectedLead}
            businessId={businessId}
            onClose={() => setSelectedLead(null)}
            onLeadUpdate={handleLeadUpdateFromModal}
          />
        )}
      </div>
    </div>
  );
};

export default Leads;
