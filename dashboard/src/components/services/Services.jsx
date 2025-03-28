import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import InputField from '../layout/InputField';
import Button from '../layout/SubmitButton';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const messageTimeoutRef = useRef(null);

  // Cleanup function for message timeout
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  // Retrieve businessId from stored user data
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
  const businessId = user?.businessId;

  // Fetch services on component mount
  useEffect(() => {
    const fetchServices = async () => {
      if (!businessId) {
        setError('No business information found.');
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/services/${businessId}`);
        // Backend returns array directly
        setServices(Array.isArray(response.data) ? response.data : []);
        setError(''); // Clear any previous errors
      } catch (err) {
        console.error('Error fetching services:', err);
        setError(err.response?.data?.error || 'Failed to fetch services.');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [businessId]);

  // Add a new service
  const addService = () => {
    setServices([...services, { 
      name: '', 
      description: '', 
      price: '',
      manualOverride: false 
    }]);
  };

  // Remove a service
  const removeService = (index) => {
    setServices(services.filter((_, i) => i !== index));
  };

  // Update the local state when a service field changes
  const handleServiceChange = (index, field, value) => {
    const updatedServices = [...services];
    updatedServices[index] = { 
      ...updatedServices[index], 
      [field]: field === 'manualOverride' ? value === 'true' : value 
    };
    setServices(updatedServices);
  };

  // Submit updated services to the backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!businessId) {
      return;
    }

    setLoading(true);
    try {
      await api.put(`/services/${businessId}`, { services });
      setMessage('Services saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error updating services:', err);
      setError(err.response?.data?.error || 'Failed to save services.');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <p className="text-lg">Processing...</p>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Services</h2>
        <Button type="button" onClick={addService}>Add Service</Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 relative">
          <span className="block sm:inline">{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {services.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No services found. Click "Add Service" to create one.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {services.map((service, index) => (
              <div key={index} className="p-4 border rounded-lg bg-white shadow-sm">
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={() => removeService(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField
                    label="Service Name"
                    name={`service-name-${index}`}
                    type="text"
                    value={service.name || ''}
                    onChange={(e) => handleServiceChange(index, 'name', e.target.value)}
                    required
                  />
                  <InputField
                    label="Description"
                    name={`service-description-${index}`}
                    type="text"
                    value={service.description || ''}
                    onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                  />
                  <InputField
                    label="Price"
                    name={`service-price-${index}`}
                    type="text"
                    value={service.price || ''}
                    onChange={(e) => handleServiceChange(index, 'price', e.target.value)}
                  />
                </div>
                <div className="mt-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={service.manualOverride || false}
                      onChange={(e) => handleServiceChange(index, 'manualOverride', e.target.checked.toString())}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="text-sm text-gray-700">Manual Override</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {services.length > 0 && (
          <div className="flex justify-end mt-6">
            <Button type="submit">Save Changes</Button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Services;
