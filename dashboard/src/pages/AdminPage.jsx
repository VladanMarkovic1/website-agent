import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import InputField from '../components/layout/InputField';
import Button from '../components/layout/SubmitButton';
import { HiOutlineLogout } from 'react-icons/hi';

const AdminPage = () => {
  const [email, setEmail] = useState('');
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await api.get('/admin/businesses');
        setBusinesses(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch businesses');
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, []);

  const handleLogout = () => {
    // Clear the token and user data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/admin/invite', { 
        email, 
        businessId: selectedBusinessId 
      });
      setMessage('Invitation sent successfully!');
      setError('');
      // Clear form
      setEmail('');
      setSelectedBusinessId('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invitation.');
      setMessage('');
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading businesses...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header with Logout */}
      <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <HiOutlineLogout className="mr-2 -ml-1 h-5 w-5" />
          Logout
        </button>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Generate Invitation</h2>
          
          {message && <p className="mt-2 text-center text-sm text-green-600">{message}</p>}
          {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <InputField
                label="Email:"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div>
                <label htmlFor="businessId" className="block text-sm font-medium text-gray-700">
                  Select Business:
                </label>
                <select
                  id="businessId"
                  value={selectedBusinessId}
                  onChange={(e) => setSelectedBusinessId(e.target.value)}
                  required
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
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
            <Button type="submit">Generate Invitation</Button>
          </form>

          {/* Display Businesses Table */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Available Businesses</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Website
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {businesses.map((business) => (
                    <tr key={business._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {business.businessName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {business.businessId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {business.websiteUrl}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage; 