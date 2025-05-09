import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../utils/api';
import InputField from '../layout/InputField';
import Button from '../layout/SubmitButton';
import { HiPlus, HiTrash, HiSave, HiRefresh, HiExclamation, HiWifi } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [lastScrapeTime, setLastScrapeTime] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);
  const messageTimeoutRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const businessId = user?.businessId;

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

  // Cleanup function for message timeout
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  // Effect to scroll container to bottom when services array grows
  useEffect(() => {
    if (scrollContainerRef.current && services.length > 0) {
      setTimeout(() => {
        const container = scrollContainerRef.current;
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }, 0);
    }
  }, [services.length]);

  // Fetch services on component mount or when retry is triggered
  useEffect(() => {
    const fetchServices = async () => {
      if (!businessId) {
        console.error('[Services] Missing businessId, redirecting...');
        setError('No business information found. Please log in again.');
        setLoading(false);
        navigate('/login');
        return;
      }

      if (isOffline) {
        setError('You are currently offline. Please check your internet connection.');
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get(`/services/${businessId}`);
        // Backend returns array directly
        setServices(Array.isArray(response.data) ? response.data : []);
        setError(''); // Clear any previous errors
      } catch (err) {
        console.error('Error fetching services:', err);
        setError(err.response?.data?.error || 'Failed to fetch services.');
        
        // If error is related to security software, show more helpful message
        if (err.response?.data?.error?.includes('security software')) {
          setError(
            'Your security software (like Kaspersky) is blocking connections to our server. ' +
            'Please add this website to your trusted sites or temporarily disable web protection.'
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [businessId, isOffline, retryCount, navigate]);

  // Handle website scraping
  const handleScrape = async () => {
    if (!businessId || isScraping || isOffline) return;

    try {
      setIsScraping(true);
      setMessage('Starting website scraping...');
      
      // Trigger scraping
      await apiClient.get(`/scraper/${businessId}`);
      
      // Wait for 10 seconds to allow scraping to complete
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Fetch updated services
      const response = await apiClient.get(`/services/${businessId}`);
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

  // Retry connection
  const handleRetry = () => {
    setLoading(true);
    setError('');
    setRetryCount(prev => prev + 1);
  };

  // Add a new service
  const addService = () => {
    const newService = { 
      name: '', 
      description: '', 
      price: '',
      manualOverride: false 
    };
    setServices(prevServices => [...prevServices, newService]);
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
    if (!businessId || isOffline) {
      return;
    }

    setLoading(true);
    try {
      await apiClient.put(`/services/${businessId}`, { services });
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

  // Show network error state
  if (isOffline) {
    return (
      <div className="h-full w-full overflow-y-auto md:pt-0 pt-16 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
          <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-8">
            <div className="flex flex-col items-center justify-center py-12">
              <HiWifi className="w-16 h-16 text-gray-400 mb-4" />
              <h2 className="text-xl font-bold text-gray-700 mb-2">You're offline</h2>
              <p className="text-gray-500 text-center max-w-md mb-6">
                We can't load your services because you appear to be offline. Please check your 
                internet connection and try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
              >
                <HiRefresh className="w-5 h-5 mr-2" />
                Refresh page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-pulse flex space-x-4">
        <div className="h-12 w-12 bg-blue-400 rounded-full animate-bounce"></div>
        <div className="h-12 w-12 bg-blue-500 rounded-full animate-bounce delay-100"></div>
        <div className="h-12 w-12 bg-blue-600 rounded-full animate-bounce delay-200"></div>
      </div>
    </div>
  );

  // Show error state with retry option
  if (error && error.includes('security software')) {
    return (
      <div className="h-full w-full overflow-y-auto md:pt-0 pt-16 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
          <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-8">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-red-100 p-3 rounded-full mb-4">
                <HiExclamation className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-700 mb-2">Connection Blocked</h2>
              <p className="text-gray-500 text-center max-w-md mb-2">
                Your security software (like Kaspersky) is blocking connections to our server.
              </p>
              <p className="text-gray-500 text-center max-w-md mb-6">
                Please add this website to your trusted sites or temporarily disable web protection 
                to use all features.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
                >
                  <HiRefresh className="w-5 h-5 mr-2" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="h-full w-full overflow-y-auto md:pt-0 pt-16 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-8">
          {/* Title section - desktop */}
          <div className="hidden md:flex justify-between items-center mb-8">
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

          {/* Title section - mobile */}
          <div className="md:hidden mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Services</h1>
            {lastScrapeTime && (
              <p className="text-xs text-gray-500">
                Last scraped: {lastScrapeTime}
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleScrape}
                disabled={isScraping}
                className={`flex-1 inline-flex items-center justify-center px-3 py-2 ${
                  isScraping 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                } text-white text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out`}
              >
                <HiRefresh className={`w-4 h-4 mr-1 ${isScraping ? 'animate-spin' : ''}`} />
                {isScraping ? 'Scraping...' : 'Update from Website'}
              </button>
              <button
                onClick={addService}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out"
              >
                <HiPlus className="w-4 h-4 mr-1" />
                Add Service
              </button>
            </div>
          </div>

          {error && <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-500 flex items-start">
            <HiExclamation className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p>{error}</p>
              <button 
                onClick={handleRetry}
                className="mt-2 text-blue-600 hover:text-blue-800 font-medium flex items-center"
              >
                <HiRefresh className="w-4 h-4 mr-1" />
                Try again
              </button>
            </div>
          </div>}
          
          {message && <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-500">{message}</div>}

          <form onSubmit={handleSubmit}>
            {services.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="mt-2 text-sm font-medium text-gray-900">No services</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new service or scraping from your website.</p>
                <div className="mt-6 flex flex-col md:flex-row justify-center gap-4">
                  <button
                    type="button"
                    onClick={handleScrape}
                    disabled={isScraping}
                    className={`inline-flex items-center justify-center px-4 py-2 ${
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
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <HiPlus className="-ml-1 mr-2 h-5 w-5" />
                    New Service
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {services.map((service, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-50 rounded-xl p-4 md:p-6 transition-all duration-200 hover:shadow-md"
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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
                  <Button type="submit" className="w-full md:w-auto">
                    <HiSave className="w-5 h-5 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Services;
