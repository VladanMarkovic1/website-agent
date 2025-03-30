import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import InputField from '../layout/InputField';
import Button from '../layout/SubmitButton';
import { HiPlus, HiTrash, HiSave, HiRefresh } from 'react-icons/hi';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [lastScrapeTime, setLastScrapeTime] = useState(null);
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

  // Handle website scraping
  const handleScrape = async () => {
    if (!businessId || isScraping) return;

    try {
      setIsScraping(true);
      setMessage('Starting website scraping...');
      
      // Trigger scraping
      await api.get(`/scraper/${businessId}`);
      
      // Wait for 10 seconds to allow scraping to complete
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Fetch updated services
      const response = await api.get(`/services/${businessId}`);
      setServices(Array.isArray(response.data) ? response.data : []);
      
      setLastScrapeTime(new Date().toLocaleString());
      setMessage('Website scraped successfully! Services have been updated.');
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setMessage('');
      }, 5000);
    } catch (err) {
      console.error('Error during scraping:', err);
      setError(err.response?.data?.error || 'Failed to scrape website.');
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setError('');
      }, 5000);
    } finally {
      setIsScraping(false);
    }
  };

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
            {lastScrapeTime && (
              <p className="text-sm text-gray-500 mt-1">
                Last scraped: {lastScrapeTime}
              </p>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleScrape}
              disabled={isScraping}
              className={`inline-flex items-center px-4 py-2 ${
                isScraping 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              } text-white text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out`}
            >
              <HiRefresh className={`w-5 h-5 mr-2 ${isScraping ? 'animate-spin' : ''}`} />
              {isScraping ? 'Scraping...' : 'Update from Website'}
            </button>
            <button
              onClick={addService}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out"
            >
              <HiPlus className="w-5 h-5 mr-2" />
              Add Service
            </button>
          </div>
        </div>

        {error && <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-500">{error}</div>}
        {message && <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-500">{message}</div>}

        <form onSubmit={handleSubmit}>
          {services.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="mt-2 text-sm font-medium text-gray-900">No services</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new service or scraping from your website.</p>
              <div className="mt-6 flex justify-center gap-4">
                <button
                  type="button"
                  onClick={handleScrape}
                  disabled={isScraping}
                  className={`inline-flex items-center px-4 py-2 ${
                    isScraping 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out`}
                >
                  <HiRefresh className={`w-5 h-5 mr-2 ${isScraping ? 'animate-spin' : ''}`} />
                  {isScraping ? 'Scraping...' : 'Scrape Website'}
                </button>
                <button
                  type="button"
                  onClick={addService}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <HiPlus className="-ml-1 mr-2 h-5 w-5" />
                  New Service
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {services.map((service, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-6 transition-all duration-200 hover:shadow-md">
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
                    <InputField label="Service Name" value={service.name} onChange={(e) => handleServiceChange(index, 'name', e.target.value)} required />
                    <InputField label="Description" value={service.description} onChange={(e) => handleServiceChange(index, 'description', e.target.value)} />
                    <InputField label="Price" value={service.price} onChange={(e) => handleServiceChange(index, 'price', e.target.value)} />
                  </div>
                  <div className="mt-4">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={service.manualOverride}
                        onChange={(e) => handleServiceChange(index, 'manualOverride', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-600">Manual Override</span>
                    </label>
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-6">
                <Button type="submit" className="w-full">
                  <HiSave className="w-5 h-5 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Services;
