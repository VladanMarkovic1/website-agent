import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/api';
import InputField from '../components/layout/InputField';
import Button from '../components/layout/SubmitButton';
import { 
  HiOutlineLogout, 
  HiOutlineMail, 
  HiOutlineOfficeBuilding,
  HiOutlineGlobe,
  HiOutlineIdentification,
  HiOutlinePlusCircle,
  HiOutlineRefresh,
  HiOutlineUser,
  HiOutlineTrash,
  HiOutlinePencil
} from 'react-icons/hi';
import { useAuth } from '../context/AuthContext.jsx';

const AdminPage = () => {
  const [email, setEmail] = useState('');
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [businessOwners, setBusinessOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  // State for script tag generation
  const [scriptBusinessId, setScriptBusinessId] = useState('');
  const [generatedScriptTag, setGeneratedScriptTag] = useState('');
  const [scriptError, setScriptError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  // State for API Key generation
  const [apiKeyBusinessId, setApiKeyBusinessId] = useState('');
  const [generatedApiKey, setGeneratedApiKey] = useState('');
  const [apiKeyError, setApiKeyError] = useState('');
  const [apiKeyCopySuccess, setApiKeyCopySuccess] = useState('');

  useEffect(() => {
    let isSubscribed = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [businessesResponse, ownersResponse] = await Promise.all([
          apiClient.get('/admin/businesses'),
          apiClient.get('/admin/business-owners')
        ]);

        if (isSubscribed) {
          setBusinesses(businessesResponse.data);
          setBusinessOwners(ownersResponse.data);
          setError('');
        }
      } catch (err) {
        if (isSubscribed) {
          setError('Failed to fetch data');
          console.error('Error fetching data:', err);
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleLogout = () => {
    logout();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setMessage('');
      setError('');
      
      await apiClient.post('/admin/invite', { 
        email, 
        businessId: selectedBusinessId 
      });

      setMessage('Invitation sent successfully!');
      setEmail('');
      setSelectedBusinessId('');
      
      // Refresh business owners list
      const response = await apiClient.get('/admin/business-owners');
      setBusinessOwners(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invitation.');
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const [businessesResponse, ownersResponse] = await Promise.all([
        apiClient.get('/admin/businesses'),
        apiClient.get('/admin/business-owners')
      ]);
      
      setBusinesses(businessesResponse.data);
      setBusinessOwners(ownersResponse.data);
      setError('');
    } catch (err) {
      setError('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateOwner = async (ownerId, currentBusinessId, ownerEmail) => {
    if (!ownerId || ownerId.startsWith('pending_')) {
      setError('Cannot update pending invitations.');
      return;
    }

    // Simple prompt to get the new business ID
    const newBusinessId = window.prompt(
        `Enter the new Business ID to assign to ${ownerEmail} (current: ${currentBusinessId || 'None'}):`,
        currentBusinessId || ''
    );

    if (newBusinessId === null) return; // User cancelled

    if (!newBusinessId.trim()) {
        setError('Business ID cannot be empty.');
        return;
    }

    if (newBusinessId.trim() === currentBusinessId) {
        setMessage('No change in Business ID.'); // Or just return
        return;
    }

    try {
      setMessage('');
      setError('');
      const response = await apiClient.put(`/admin/business-owners/${ownerId}`, { 
        businessId: newBusinessId.trim()
      });
      
      setMessage(`Business assignment for ${ownerEmail} updated successfully.`);
      
      // Refresh the list or update the specific item
      setBusinessOwners(prev => 
        prev.map(owner => {
          if (owner.id === ownerId) {
            // Find the new business name for display
            const newBusiness = businesses.find(b => b.businessId === newBusinessId.trim());
            return { 
              ...owner, 
              businessId: newBusinessId.trim(),
              businessName: newBusiness ? newBusiness.businessName : 'Unknown Business'
            };
          }
          return owner;
        })
      );

    } catch (err) {
      setError(err.response?.data?.error || `Failed to update assignment for ${ownerEmail}.`);
    }
};

  const handleDeleteOwner = async (ownerId, ownerEmail) => {
    if (!ownerId || ownerId.startsWith('pending_')) {
      setError('Cannot delete pending invitations directly. Try refreshing.');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete the invitation for ${ownerEmail}? This action cannot be undone.`)) {
      try {
        setMessage('');
        setError('');
        await apiClient.delete(`/admin/business-owners/${ownerId}`);
        setMessage(`Invitation for ${ownerEmail} deleted successfully.`);
        setBusinessOwners(prev => prev.filter(owner => owner.id !== ownerId));
      } catch (err) {
        setError(err.response?.data?.error || `Failed to delete invitation for ${ownerEmail}.`);
      }
    }
  };

  const handleGenerateScript = async () => {
    if (!scriptBusinessId) {
      setScriptError('Please select a business first.');
      setGeneratedScriptTag('');
      return;
    }
    try {
      setScriptError('');
      setGeneratedScriptTag('Generating...');
      setCopySuccess('');
      const response = await apiClient.get(`/admin/script-tag/${scriptBusinessId}`);
      setGeneratedScriptTag(response.data.scriptTag);
    } catch (err) {
      setScriptError(err.response?.data?.error || 'Failed to generate script tag.');
      setGeneratedScriptTag('');
    }
  };

  const handleCopyToClipboard = () => {
    if (!generatedScriptTag || generatedScriptTag === 'Generating...') return;
    navigator.clipboard.writeText(generatedScriptTag).then(() => {
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000); // Clear message after 2s
    }, (err) => {
      setScriptError('Failed to copy script tag.');
      console.error('Could not copy text: ', err);
    });
  };

  const handleGenerateApiKey = async () => {
    if (!apiKeyBusinessId) {
        setApiKeyError('Please select a business first.');
        setGeneratedApiKey('');
        return;
    }
    // Optional: Confirmation
    if (!window.confirm(`Generating a new API key for ${apiKeyBusinessId} will invalidate any existing key. Are you sure?`)) {
        return;
    }

    try {
        setApiKeyError('');
        setGeneratedApiKey('Generating...');
        setApiKeyCopySuccess('');
        const response = await apiClient.post(`/admin/api-key/${apiKeyBusinessId}`);
        setGeneratedApiKey(response.data.apiKey);
        // Optionally display response.data.message as well
    } catch (err) {
        setApiKeyError(err.response?.data?.error || 'Failed to generate API key.');
        setGeneratedApiKey('');
    }
  };

  const handleApiKeyCopyToClipboard = () => {
    if (!generatedApiKey || generatedApiKey === 'Generating...') return;
    navigator.clipboard.writeText(generatedApiKey).then(() => {
        setApiKeyCopySuccess('Copied!');
        setTimeout(() => setApiKeyCopySuccess(''), 2000); 
    }, (err) => {
        setApiKeyError('Failed to copy API key.');
        console.error('Could not copy text: ', err);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse flex space-x-4">
          <div className="h-12 w-12 bg-blue-400 rounded-full"></div>
          <div className="h-12 w-12 bg-blue-400 rounded-full"></div>
          <div className="h-12 w-12 bg-blue-400 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <HiOutlineIdentification className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
            >
              <HiOutlineLogout className="mr-2 -ml-1 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Invitation Form */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <HiOutlinePlusCircle className="h-6 w-6 text-blue-600" />
              <h2 className="ml-2 text-xl font-semibold text-gray-900">Generate Invitation</h2>
            </div>
            
            {message && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {message}
                </p>
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <HiOutlineMail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Business
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <HiOutlineOfficeBuilding className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      value={selectedBusinessId}
                      onChange={(e) => setSelectedBusinessId(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    >
                      <option value="">Select a business</option>
                      {businesses.map((business) => (
                        <option key={business._id} value={business.businessId}>
                          {business.businessName} ({business.businessId})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full">
                <HiOutlineMail className="mr-2 h-5 w-5" />
                Generate Invitation
              </Button>
            </form>
          </div>

          {/* Business Owners List */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <HiOutlineUser className="h-6 w-6 text-blue-600" />
                <h2 className="ml-2 text-xl font-semibold text-gray-900">Business Owners</h2>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <HiOutlineRefresh className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {businessOwners.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                        No business owners found
                      </td>
                    </tr>
                  ) : (
                    businessOwners.map((owner) => (
                      <tr key={owner.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {owner.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {owner.businessName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            owner.status === 'used' 
                              ? 'bg-green-100 text-green-800' 
                              : owner.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {owner.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleUpdateOwner(owner.id, owner.businessId, owner.email)} 
                            className="text-indigo-600 hover:text-indigo-900 mr-3 disabled:text-gray-400 disabled:cursor-not-allowed"
                            disabled={owner.id.startsWith('pending_')} // Disable edit for pending
                          >
                            <HiOutlinePencil className="h-5 w-5" />
                          </button>
                          {/* Delete Button */}
                          <button 
                            onClick={() => handleDeleteOwner(owner.id, owner.email)}
                            className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                            disabled={owner.id.startsWith('pending_')}
                          >
                            <HiOutlineTrash className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Script Tag Generation Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
          <div className="flex items-center mb-6">
             <HiOutlineGlobe className="h-6 w-6 text-blue-600" /> 
            <h2 className="ml-2 text-xl font-semibold text-gray-900">Generate Chatbot Script Tag</h2>
          </div>

          {scriptError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 flex items-center">
                 <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                 </svg>
                {scriptError}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Business for Script Tag
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiOutlineOfficeBuilding className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={scriptBusinessId}
                  onChange={(e) => {
                      setScriptBusinessId(e.target.value);
                      setGeneratedScriptTag(''); // Clear previous script on change
                      setScriptError('');
                      setCopySuccess('');
                  }}
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                >
                  <option value="">-- Select a Business --</option>
                  {businesses.map((business) => (
                    <option key={business._id} value={business.businessId}>
                      {business.businessName} ({business.businessId})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button 
              onClick={handleGenerateScript} 
              disabled={!scriptBusinessId}
              className="w-full md:w-auto"
            >
              <HiOutlineGlobe className="mr-2 h-5 w-5" />
              Generate Script
            </Button>

            {generatedScriptTag && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Generated Script Tag (Copy and paste into your website's HTML before the closing &lt;/body&gt; tag):
                </label>
                <div className="relative">
                  <textarea
                    readOnly
                    value={generatedScriptTag}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    rows="4"
                  />
                  <button
                    onClick={handleCopyToClipboard}
                    className="absolute top-2 right-2 inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    title="Copy to Clipboard"
                  >
                     {copySuccess ? copySuccess : 'Copy'} 
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* API Key Generation Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
          <div className="flex items-center mb-6">
             <HiOutlineIdentification className="h-6 w-6 text-blue-600" /> 
            <h2 className="ml-2 text-xl font-semibold text-gray-900">Generate/Regenerate Chatbot API Key</h2>
          </div>

          {apiKeyError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 flex items-center">
                 <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                 </svg>
                {apiKeyError}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Business for API Key
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiOutlineOfficeBuilding className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={apiKeyBusinessId}
                  onChange={(e) => {
                      setApiKeyBusinessId(e.target.value);
                      setGeneratedApiKey(''); // Clear previous key on change
                      setApiKeyError('');
                      setApiKeyCopySuccess('');
                  }}
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                >
                  <option value="">-- Select a Business --</option>
                  {businesses.map((business) => (
                    <option key={business._id} value={business.businessId}>
                      {business.businessName} ({business.businessId})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button 
              onClick={handleGenerateApiKey} 
              disabled={!apiKeyBusinessId}
              className="w-full md:w-auto"
            >
              <HiOutlineIdentification className="mr-2 h-5 w-5" />
              Generate API Key
            </Button>

            {generatedApiKey && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Generated API Key (Save this securely, it won't be shown again!):
                </label>
                <div className="relative">
                  <input
                    readOnly
                    type="text"
                    value={generatedApiKey}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleApiKeyCopyToClipboard}
                    className="absolute top-1/2 right-2 transform -translate-y-1/2 inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    title="Copy API Key"
                  >
                     {apiKeyCopySuccess ? apiKeyCopySuccess : 'Copy'} 
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminPage; 