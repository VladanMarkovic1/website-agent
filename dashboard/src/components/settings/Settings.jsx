import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/api'; // Import apiClient from correct path
import InputField from '../layout/InputField'; // Re-use InputField
import Button from '../layout/SubmitButton'; // Re-use Button
import { HiSave } from 'react-icons/hi'; // Icon for save button
import { useAuth } from '../../context/AuthContext.jsx'; // Import useAuth
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const Settings = () => {
  const { user } = useAuth(); // Get user from context
  const navigate = useNavigate(); // Initialize useNavigate
  const businessId = user?.businessId; // Safely derive businessId

  // State for widget settings form
  const [primaryColor, setPrimaryColor] = useState('#3B82F6'); // Default blue
  const [position, setPosition] = useState('bottom-right');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  
  // State for loading and feedback
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch current settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (!businessId) {
        console.error('[Settings] Missing businessId, redirecting...');
        setError('Business ID not found. Cannot load settings.');
        setLoading(false);
        navigate('/login'); // Redirect if no businessId
        return;
      }
      try {
        setLoading(true);
        setError('');
        const response = await apiClient.get(`/clients/${businessId}/settings`);
        const config = response.data; // Assuming response.data is the widgetConfig object
        if (config) {
          setPrimaryColor(config.primaryColor || '#3B82F6');
          setPosition(config.position || 'bottom-right');
          setWelcomeMessage(config.welcomeMessage || 'Hello! How can I help you today?');
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
        setError(err.response?.data?.error || 'Failed to load widget settings.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [businessId, navigate]); // Re-run if businessId changes (though unlikely here)

  const handleSaveSettings = async (e) => {
    e.preventDefault(); // Prevent default form submission
    if (!businessId) {
      setError('Business ID not found. Cannot save settings.');
      return;
    }

    const settingsToSave = {
        widgetConfig: {
            primaryColor,
            position,
            welcomeMessage
        }
    };

    try {
        setLoading(true); // Indicate loading state
        setError('');
        setSuccessMessage('');

        const response = await apiClient.put(`/clients/${businessId}/settings`, settingsToSave);

        setSuccessMessage(response.data?.message || 'Settings saved successfully!');
        // Optionally refetch settings or just assume they were saved correctly

    } catch (err) {
        console.error("Error saving settings:", err);
        setError(err.response?.data?.error || 'Failed to save widget settings.');
    } finally {
        setLoading(false); // End loading state
        // Clear success message after a delay
        setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // Render null or loading indicator if user/businessId isn't available yet
  if (!user || !businessId) { 
      // You might want a more sophisticated loading state here
      return null; 
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <h2 className="text-2xl font-bold">Settings</h2>
      
      {/* User Info Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Account Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <p className="mt-1 text-sm text-gray-900">{user.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <p className="mt-1 text-sm text-gray-900">{user.role}</p>
          </div>
          {/* Display Business ID for reference */} 
          {businessId && (
             <div>
                 <label className="block text-sm font-medium text-gray-700">Business ID</label>
                 <p className="mt-1 text-sm text-gray-900">{businessId}</p>
             </div>
           )}
        </div>
      </div>

      {/* Chatbot Widget Settings Section - TODO: Add form */} 
      <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Chatbot Widget Configuration</h3>
          {/* Add Form Inputs Here */} 
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          {successMessage && <p className="text-green-500 text-sm mb-4">{successMessage}</p>}

          {loading ? (
            <p>Loading settings...</p>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* Primary Color Input */}
                <div>
                    <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">Primary Color</label>
                    <div className="mt-1 flex items-center space-x-3">
                         <input 
                            type="color" 
                            id="primaryColor"
                            name="primaryColor"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="h-10 w-10 rounded-md border border-gray-300 cursor-pointer"
                         />
                        <input 
                            type="text" 
                            value={primaryColor} 
                            onChange={(e) => setPrimaryColor(e.target.value)} 
                            pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" // Basic hex validation
                            title="Enter a valid hex color code (e.g., #3B82F6)"
                            className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Select or enter a hex color code (e.g., #3B82F6).</p>
                </div>

                {/* Position Dropdown */}
                <div>
                    <label htmlFor="position" className="block text-sm font-medium text-gray-700">Widget Position</label>
                    <select 
                        id="position" 
                        name="position"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    >
                        <option value="bottom-right">Bottom Right</option>
                        <option value="bottom-left">Bottom Left</option>
                    </select>
                </div>

                {/* Welcome Message Textarea */}
                <div>
                    <label htmlFor="welcomeMessage" className="block text-sm font-medium text-gray-700">Welcome Message</label>
                    <div className="mt-1">
                        <textarea 
                            id="welcomeMessage" 
                            name="welcomeMessage"
                            rows={3} 
                            value={welcomeMessage}
                            onChange={(e) => setWelcomeMessage(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="Hello! How can we help you today?"
                        />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">The first message the user sees when opening the chatbot.</p>
                </div>

                {/* Save Button */}
                <div className="pt-5">
                    <Button type="submit" disabled={loading} className="w-full md:w-auto">
                        <HiSave className="-ml-1 mr-2 h-5 w-5" />
                        {loading ? 'Saving...' : 'Save Chatbot Settings'}
                    </Button>
                </div>
            </form>
          )}
      </div>

    </div>
  );
};

export default Settings; 