import api from '../utils/api';

// Fetches leads for a specific business
export const getLeads = async (businessId) => {
  try {
    const response = await api.get(`/leads/${businessId}`);
    // Add basic validation for expected success structure
    if (response.data && response.data.success && Array.isArray(response.data.leads)) {
      return response.data; // Return the whole object { success, count, leads }
    } else {
      console.warn('Unexpected response format from getLeads:', response.data);
      // Return a consistent error structure or throw
      throw new Error(response.data?.error || 'Received invalid data format from server');
    }
  } catch (error) {
    console.error('Error fetching leads in service:', error);
    // Re-throw the error to be handled by the caller (e.g., the hook)
    // Include response data if available
    const err = new Error(error.response?.data?.error || error.message || 'Failed to fetch leads');
    err.response = error.response; // Attach response for status code checks etc.
    throw err;
  }
};

// Updates the status of a specific lead
export const updateLeadStatus = async (businessId, leadId, status) => {
  try {
    const response = await api.put(`/leads/${businessId}/${leadId}`, { status });
    return response.data; // Assuming the updated lead is returned
  } catch (error) {
    console.error('Error updating lead status in service:', error);
    const err = new Error(error.response?.data?.error || 'Failed to update lead status');
    err.response = error.response;
    throw err;
  }
};

// Adds a note to a specific lead
export const addLeadNote = async (businessId, leadId, note) => {
   if (!note || !note.trim()) {
     throw new Error("Note content cannot be empty.");
   }
   // Basic validation for leadId format
   if (!leadId || !/^[0-9a-fA-F]{24}$/.test(leadId)) {
       throw new Error("Invalid lead ID format provided.");
   }
  try {
    const response = await api.post(`/leads/${businessId}/notes/${leadId}`, { note: note.trim() });
    return response.data; // Assuming the updated lead with notes is returned
  } catch (error) {
    console.error('Error adding lead note in service:', error);
    const err = new Error(error.response?.data?.error || 'Failed to add note');
    err.response = error.response;
    throw err;
  }
};

// Removes a note from a specific lead
export const removeLeadNote = async (businessId, leadId, noteId) => {
   // Basic validation
   if (!leadId || !/^[0-9a-fA-F]{24}$/.test(leadId)) {
       throw new Error("Invalid lead ID format provided.");
   }
   if (!noteId || !/^[0-9a-fA-F]{24}$/.test(noteId)) {
       throw new Error("Invalid note ID format provided.");
   }
  try {
    const response = await api.delete(`/leads/${businessId}/notes/${leadId}/${noteId}`);
    return response.data; // Assuming the updated lead is returned
  } catch (error) {
    console.error('Error removing lead note in service:', error);
    const err = new Error(error.response?.data?.error || 'Failed to remove note');
    err.response = error.response;
    throw err;
  }
}; 