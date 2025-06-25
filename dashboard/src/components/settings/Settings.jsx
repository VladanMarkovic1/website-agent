import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/api'; // Import apiClient from correct path
import InputField from '../layout/InputField'; // Re-use InputField
import Button from '../layout/SubmitButton'; // Re-use Button
import { HiSave } from 'react-icons/hi'; // Icon for save button
import { useAuth } from '../../context/AuthContext.jsx'; // Import useAuth
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { getFeaturedServices, updateFeaturedServices } from '../../utils/api';
import BusinessProfile from './BusinessProfile.jsx';

const Settings = () => {
  const { user } = useAuth(); // Get user from context
  const navigate = useNavigate(); // Initialize useNavigate
  const businessId = user?.businessId; // Safely derive businessId

  // Tab state
  const [activeTab, setActiveTab] = useState('widget');

  // State for widget settings form
  const [primaryColor, setPrimaryColor] = useState('#3B82F6'); // Default blue
  const [position, setPosition] = useState('bottom-right');
  
  // State for loading and feedback
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // State for featured services
  const [allServices, setAllServices] = useState([]);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [fsLoading, setFsLoading] = useState(true);
  const [fsError, setFsError] = useState('');
  const [fsSuccess, setFsSuccess] = useState('');

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

  // Fetch all services and featured services
  useEffect(() => {
    const fetchServices = async () => {
      if (!businessId) return;
      setFsLoading(true);
      setFsError('');
      try {
        // Fetch all services
        const res = await apiClient.get(`/services/${businessId}`);
        setAllServices(res.data || []);
        
        // Fetch featured services
        const featuredRes = await apiClient.get(`/clients/${businessId}/featured-services`);
        const featuredServicesData = featuredRes.data || [];
        
        // Map the featured services, preserving display names
        const formattedFeaturedServices = featuredServicesData.map(service => ({
          originalName: service.originalName,
          displayName: service.displayName
        }));
        
        setFeaturedServices(formattedFeaturedServices);
      } catch (err) {
        console.error('Error loading services:', err);
        setFsError('Failed to load services.');
      } finally {
        setFsLoading(false);
      }
    };
    fetchServices();
  }, [businessId]);

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

  // Handler for toggling featured service selection
  const handleToggleFeatured = (serviceName) => {
    setFeaturedServices(prevServices => {
      const isCurrentlySelected = prevServices.some(fs => fs.originalName === serviceName);
      if (isCurrentlySelected) {
        return prevServices.filter(fs => fs.originalName !== serviceName);
      } else {
        if (prevServices.length < 7) {
          // When adding a new service, set displayName same as originalName initially
          return [...prevServices, { originalName: serviceName, displayName: serviceName }];
        }
        return prevServices;
      }
    });
  };

  // Handler for changing display name
  const handleDisplayNameChange = (serviceName, newDisplayName) => {
    setFeaturedServices(prevServices => 
      prevServices.map(fs =>
        fs.originalName === serviceName 
          ? { ...fs, displayName: newDisplayName || serviceName }
          : fs
      )
    );
  };

  // Handler for saving featured services
  const handleSaveFeatured = async (e) => {
    e.preventDefault();
    setFsLoading(true);
    setFsError('');
    setFsSuccess('');
    try {
      // Save the featured services
      await apiClient.put(`/clients/${businessId}/featured-services`, { 
        featuredServices: featuredServices
      });
      setFsSuccess('Featured services updated!');
      
      // Refetch to ensure we have the latest data
      const featuredRes = await apiClient.get(`/clients/${businessId}/featured-services`);
      const featuredServicesData = featuredRes.data || [];
      setFeaturedServices(featuredServicesData);
      
      setTimeout(() => setFsSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving featured services:', err);
      setFsError('Failed to update featured services.');
    } finally {
      setFsLoading(false);
    }
  };

  // Render null or loading indicator if user/businessId isn't available yet
  if (!user || !businessId) { 
      // You might want a more sophisticated loading state here
      return null; 
  }

  const tabs = [
    { id: 'widget', name: 'Widget Settings', icon: '⚙️' },
    { id: 'services', name: 'Featured Services', icon: '🎯' },
    { id: 'profile', name: 'Business Profile', icon: '🏢' }
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
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

      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'widget' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Chatbot Widget Configuration</h3>
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
          )}

          {activeTab === 'services' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Chatbot Featured Services</h3>
              <p className="text-sm text-gray-600 mb-2">Select up to 7 services to show as quick buttons in the chatbot. "Other" will always be shown.</p>
              {fsError && <p className="text-red-500 text-sm mb-2">{fsError}</p>}
              {fsSuccess && <p className="text-green-500 text-sm mb-2">{fsSuccess}</p>}
              {fsLoading ? (
                <p>Loading services...</p>
              ) : (
                <form onSubmit={handleSaveFeatured} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {allServices.map(service => {
                      const selected = featuredServices.some(fs => fs.originalName === service.name);
                      const displayName = featuredServices.find(fs => fs.originalName === service.name)?.displayName || service.name;
                      return (
                        <div key={service.name} className="flex flex-col gap-1 p-2 rounded border bg-gray-50 border-gray-200">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => handleToggleFeatured(service.name)}
                              disabled={!selected && featuredServices.length >= 7}
                            />
                            <span className="font-medium">{service.name}</span>
                          </label>
                          {selected && (
                            <input
                              type="text"
                              className="mt-1 p-1 border rounded text-sm"
                              value={displayName}
                              maxLength={32}
                              onChange={e => handleDisplayNameChange(service.name, e.target.value)}
                              placeholder="Button label"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-2">
                    <Button type="submit" disabled={fsLoading || featuredServices.length === 0} className="w-full md:w-auto">
                      <HiSave className="-ml-1 mr-2 h-5 w-5" />
                      {fsLoading ? 'Saving...' : 'Save Featured Services'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <BusinessProfile />
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings; 