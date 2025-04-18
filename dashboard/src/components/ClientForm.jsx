import React, { useState, useEffect } from 'react';
import { createClient, updateClient } from '../services/api'; // Adjust path if needed

// Accepts optional clientData for editing, and an onClose callback
function ClientForm({ clientData = null, onClose }) {
    const [businessName, setBusinessName] = useState('');
    const [allowedOrigins, setAllowedOrigins] = useState(''); // Store as comma/newline separated string for textarea
    const [isActive, setIsActive] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEditing = Boolean(clientData);

    // Populate form if editing
    useEffect(() => {
        if (isEditing && clientData) {
            setBusinessName(clientData.businessName || '');
            setAllowedOrigins((clientData.allowedOrigins || []).join('\n')); // Newline separated for textarea
            setIsActive(clientData.isActive !== undefined ? clientData.isActive : true);
        }
    }, [clientData, isEditing]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        // Convert allowedOrigins string back to array, trimming whitespace and removing empty lines
        const originsArray = allowedOrigins
            .split(/\n|,/)
            .map(origin => origin.trim())
            .filter(origin => origin);
            
        if (!businessName || originsArray.length === 0) {
            setError('Business name and at least one allowed origin are required.');
            setIsSubmitting(false);
            return;
        }

        const payload = {
            businessName,
            allowedOrigins: originsArray,
            isActive,
        };

        try {
            let response;
            if (isEditing) {
                // Use the correct identifier for update (_id or businessId)
                const clientId = clientData._id || clientData.businessId;
                response = await updateClient(clientId, payload);
                alert('Client updated successfully!');
            } else {
                response = await createClient(payload);
                alert('Client created successfully!');
            }
            console.log('API Response:', response);
            onClose(true); // Pass true to indicate success / need to refresh list
        } catch (err) {
            console.error("Form submission error:", err);
            setError(err.message || (isEditing ? 'Failed to update client' : 'Failed to create client'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        // This form should ideally be in a Modal component or on a separate route
        <div className="p-4 border rounded shadow-lg bg-white">
            <h2 className="text-xl font-semibold mb-4">{isEditing ? 'Edit Client' : 'Create New Client'}</h2>
            <form onSubmit={handleSubmit}>
                {error && <p className="text-red-500 mb-3">Error: {error}</p>}
                
                <div className="mb-4">
                    <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                    <input
                        type="text"
                        id="businessName"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="allowedOrigins" className="block text-sm font-medium text-gray-700 mb-1">Allowed Origins (one per line)</label>
                    <textarea
                        id="allowedOrigins"
                        rows="3"
                        value={allowedOrigins}
                        onChange={(e) => setAllowedOrigins(e.target.value)}
                        required
                        placeholder="e.g., https://www.client-a.com\nhttps://client-a.vercel.app"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter each allowed website domain on a new line.</p>
                </div>

                <div className="mb-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-offset-0 focus:ring-indigo-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={() => onClose(false)} // Pass false to indicate cancellation
                        disabled={isSubmitting}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : (isEditing ? 'Update Client' : 'Create Client')}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ClientForm; 