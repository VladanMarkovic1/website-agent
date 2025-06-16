import React, { useState, useRef, useCallback } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import { STATUS_OPTIONS } from './constants';
import { addLeadNote, removeLeadNote, updateLeadStatus } from '../../services/leadService';

const LeadDetailsModal = ({ lead: initialLead, businessId, onClose, onLeadUpdate }) => {
  const textareaRef = useRef();
  const [currentLead, setCurrentLead] = useState(initialLead);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Function to display temporary success messages
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Handler for status changes within the modal
  const handleModalStatusChange = useCallback(async (newStatus) => {
    setIsUpdatingStatus(true);
    setNoteError('');
    try {
      const updatedLead = await updateLeadStatus(businessId, currentLead._id, newStatus);
      setCurrentLead(updatedLead); // Update modal state
      onLeadUpdate(updatedLead); // Update parent state
      showSuccess('Status updated.');
    } catch (err) {
      console.error('Error updating status in modal:', err);
      setNoteError(err.message || 'Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [businessId, currentLead._id, onLeadUpdate]);

  // Handler for adding a note
  const addNote = useCallback(async () => {
    const noteContent = textareaRef.current?.value;
    if (!noteContent || !noteContent.trim()) {
      setNoteError('Note content cannot be empty.');
      return;
    }

    setIsAddingNote(true);
    setNoteError('');
    try {
      const updatedLead = await addLeadNote(businessId, currentLead._id, noteContent);
      setCurrentLead(updatedLead); // Update modal state
      onLeadUpdate(updatedLead); // Update parent state
      if (textareaRef.current) textareaRef.current.value = ''; // Clear textarea
      showSuccess('Note added successfully!');
    } catch (err) {
      console.error('Error adding note in modal:', err);
      setNoteError(err.message || 'Failed to add note.');
    } finally {
      setIsAddingNote(false);
    }
  }, [businessId, currentLead._id, onLeadUpdate]);

  // Handler for removing a note
  const removeNote = useCallback(async (noteId) => {
    if (!window.confirm('Are you sure you want to remove this note?')) {
      return;
    }
    setIsDeletingNote(true);
    setNoteError('');
    try {
      const updatedLead = await removeLeadNote(businessId, currentLead._id, noteId);
      setCurrentLead(updatedLead); // Update modal state
      onLeadUpdate(updatedLead); // Update parent state
      showSuccess('Note removed successfully!');
    } catch (err) {
      console.error('Error removing note in modal:', err);
      setNoteError(err.message || 'Failed to remove note.');
    } finally {
      setIsDeletingNote(false);
    }
  }, [businessId, currentLead._id, onLeadUpdate]);

  if (!currentLead) return null; // Don't render if lead is somehow null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b sticky top-0 bg-white z-10">
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

        {/* Scrollable Content Area */}
        <div className="p-4 overflow-y-auto flex-grow">
           {successMessage && (
             <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">{successMessage}</p>
             </div>
           )}
           {noteError && (
             <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
               <p className="text-sm text-red-600">{noteError}</p>
             </div>
           )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Contact Info */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-2">Contact Information</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone:</dt>
                  <dd className="text-sm text-gray-900">{currentLead.phone}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email:</dt>
                  <dd className="text-sm text-gray-900 break-words">{currentLead.email || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Service Interest:</dt>
                  <dd className="text-sm text-gray-900">{currentLead.service || 'N/A'}</dd>
                </div>
                {/* Extra Details */}
                {currentLead.details && (
                  <>
                    {currentLead.details.concern && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Concern:</dt>
                        <dd className="text-sm text-gray-900">{currentLead.details.concern}</dd>
                      </div>
                    )}
                    {currentLead.details.timing && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Timing:</dt>
                        <dd className="text-sm text-gray-900">{currentLead.details.timing}</dd>
                      </div>
                    )}
                    {currentLead.details.days && currentLead.details.days.length > 0 && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Best Days:</dt>
                        <dd className="text-sm text-gray-900">{currentLead.details.days.join(', ')}</dd>
                      </div>
                    )}
                    {currentLead.details.time && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Preferred Time:</dt>
                        <dd className="text-sm text-gray-900">{currentLead.details.time}</dd>
                      </div>
                    )}
                    {currentLead.details.insurance && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Insurance:</dt>
                        <dd className="text-sm text-gray-900">{currentLead.details.insurance}</dd>
                      </div>
                    )}
                  </>
                )}
              </dl>
            </div>
            {/* Lead Details */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-2">Lead Details</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status:</dt>
                  <dd className="mt-1">
                    <select
                      value={currentLead.status}
                      onChange={(e) => handleModalStatusChange(e.target.value)}
                      disabled={isUpdatingStatus}
                      className={`text-sm rounded-full px-3 py-1 border border-gray-300 ${ 
                        currentLead.status === 'new' ? 'bg-green-100 text-green-800' : 
                        currentLead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                        currentLead.status === 'attempted-contact' ? 'bg-yellow-100 text-yellow-800' :
                        currentLead.status === 'scheduled' ? 'bg-purple-100 text-purple-800' :
                        currentLead.status === 'completed' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-red-100 text-red-800'
                      } ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    {currentLead.createdAt ? new Date(currentLead.createdAt).toLocaleString() : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Contacted:</dt>
                  <dd className="text-sm text-gray-900">
                    {currentLead.lastContactedAt ? new Date(currentLead.lastContactedAt).toLocaleString() : 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Context/Reason */}
          <div className="mb-4">
            <h3 className="text-md font-medium text-gray-900 mb-2">Context/Reason</h3>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{currentLead.reason || 'No context provided'}</p>
            </div>
          </div>

          {/* Notes & History */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-2">Notes & History</h3>
             {/* Combine interactions and callHistory, sort by date */}
             {(() => {
                const history = [
                  ...(currentLead.interactions || []),
                  ...(currentLead.callHistory || [])
                ].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

                return history.length > 0 ? (
                  <div className="space-y-3">
                    {history.map((entry, index) => (
                      <div key={entry._id || `entry-${index}`} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex-1 mr-2">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.notes || entry.message || entry.content || 'No content'}</p>
                            <span className="text-xs text-gray-500 block mt-1">
                               {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'No timestamp'}
                               {entry.type && ` - Type: ${entry.type}`}
                               {entry.status && ` - Status: ${entry.status}`}
                               {entry.service && ` - Service: ${entry.service}`}
                             </span>
                          </div>
                          {/* Only allow deleting notes added via callHistory (assuming they have _id) */}
                          {entry.notes && entry._id && (
                            <button
                              onClick={() => removeNote(entry._id)}
                              disabled={isDeletingNote}
                              className="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Remove note"
                            >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                               </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No notes or history found.</p>
                  </div>
                );
             })()}
          </div>
        </div>

        {/* Footer - Note Input */}
        <div className="p-4 border-t bg-gray-50 sticky bottom-0 z-10">
          <div className="flex gap-2 items-start">
            <textarea
              placeholder="Add a note..."
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              rows="2"
              ref={textareaRef}
            />
            <button
              onClick={addNote}
              disabled={isAddingNote}
              className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium ${ 
                isAddingNote 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
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

export default LeadDetailsModal; 