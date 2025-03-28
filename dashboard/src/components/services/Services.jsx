import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import InputField from '../layout/InputField';
import Button from '../layout/SubmitButton';
import { HiPlus, HiTrash, HiSave } from 'react-icons/hi';

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
      <div className="animate-pulse flex space-x-4">
        <div className="h-12 w-12 bg-blue-400 rounded-full animate-bounce"></div>
        <div className="h-12 w-12 bg-blue-500 rounded-full animate-bounce delay-100"></div>
        <div className="h-12 w-12 bg-blue-600 rounded-full animate-bounce delay-200"></div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Services</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your dental services and pricing</p>
          </div>
          <button
            onClick={addService}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out"
          >
            <HiPlus className="w-5 h-5 mr-2" />
            Add Service
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-500 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
        
        {message && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-500 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {services.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No services</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new service.</p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={addService}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <HiPlus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  New Service
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {services.map((service, index) => (
                <div 
                  key={index}
                  className="bg-gray-50 rounded-xl p-6 transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Service #{index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeService(index)}
                      className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800 transition-colors duration-150"
                    >
                      <HiTrash className="w-4 h-4 mr-1" />
                      Remove
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Service Name</label>
                      <input
                        type="text"
                        value={service.name || ''}
                        onChange={(e) => handleServiceChange(index, 'name', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="e.g., Dental Cleaning"
                        required
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <input
                        type="text"
                        value={service.description || ''}
                        onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="Brief description of the service"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Price</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="text"
                          value={service.price || ''}
                          onChange={(e) => handleServiceChange(index, 'price', e.target.value)}
                          className="block w-full pl-7 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={service.manualOverride || false}
                        onChange={(e) => handleServiceChange(index, 'manualOverride', e.target.checked.toString())}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-600">Manual Override</span>
                    </label>
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-6">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out"
                >
                  <HiSave className="w-5 h-5 mr-2" />
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Services;
