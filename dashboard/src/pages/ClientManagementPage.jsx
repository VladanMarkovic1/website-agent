import React, { useState, useEffect } from 'react';
import { fetchClients, deleteClient } from '../services/api'; // Adjust path if needed
// import ClientForm from '../components/ClientForm'; // We'll create this next
// import { Link } from 'react-router-dom'; // If using React Router for navigation

function ClientManagementPage() {
    const [clients, setClients] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    // const [editingClient, setEditingClient] = useState(null); // State for editing

    // Fetch clients on component mount
    useEffect(() => {
        const loadClients = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetchClients();
                if (response.success) {
                    setClients(response.data || []);
                } else {
                    throw new Error(response.error || 'Failed to fetch clients');
                }
            } catch (err) {
                setError(err.message);
                console.error("Fetch clients error:", err);
            }
            setIsLoading(false);
        };
        loadClients();
    }, []);

    const handleDeleteClient = async (clientId) => {
        if (window.confirm('Are you sure you want to delete this client and all associated data?')) {
            setIsLoading(true); // Indicate activity
            try {
                await deleteClient(clientId);
                // Refetch clients list after deletion
                setClients(clients.filter(client => client._id !== clientId || client.businessId !== clientId)); // Basic filter based on what ID is used
                alert('Client deleted successfully');
            } catch (err) {
                setError(err.message || 'Failed to delete client');
                alert(`Error deleting client: ${err.message || 'Unknown error'}`);
            }
            setIsLoading(false);
        }
    };

    // TODO: Handlers for opening edit form, closing forms etc.

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Client Management</h1>

            {error && <p className="text-red-500 mb-4">Error: {error}</p>}

            <div className="mb-4">
                <button 
                    onClick={() => setShowCreateForm(true)} // TODO: Implement proper modal/navigation
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Add New Client
                </button>
            </div>

            {/* Placeholder for ClientForm modal/view */} 
            {/* {showCreateForm && <ClientForm onClose={() => setShowCreateForm(false)} />} */} 
            {/* {editingClient && <ClientForm clientData={editingClient} onClose={() => setEditingClient(null)} />} */} 

            {isLoading ? (
                <p>Loading clients...</p>
            ) : (
                <div className="overflow-x-auto shadow-md sm:rounded-lg">
                    <table className="min-w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th scope="col" className="px-6 py-3">Business Name</th>
                                <th scope="col" className="px-6 py-3">Business ID</th>
                                <th scope="col" className="px-6 py-3">Allowed Origins</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.length > 0 ? (
                                clients.map((client) => (
                                    <tr key={client.businessId || client._id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{client.businessName}</td>
                                        <td className="px-6 py-4">{client.businessId}</td>
                                        <td className="px-6 py-4">{(client.allowedOrigins || []).join(', ')}</td>
                                        <td className="px-6 py-4">{client.isActive ? 'Active' : 'Inactive'}</td>
                                        <td className="px-6 py-4 space-x-2">
                                            <button className="font-medium text-blue-600 hover:underline">Edit</button>
                                            {/* Placeholder for Embed Script Button */}
                                            <button className="font-medium text-green-600 hover:underline">Embed</button> 
                                            <button 
                                                onClick={() => handleDeleteClient(client._id || client.businessId)} // Use appropriate ID
                                                className="font-medium text-red-600 hover:underline"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No clients found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default ClientManagementPage; 