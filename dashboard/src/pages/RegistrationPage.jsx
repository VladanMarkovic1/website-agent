import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import InputField from '../components/layout/InputField';
import Button from '../components/layout/SubmitButton';

const Register = () => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const queryToken = queryParams.get('token');
    if (queryToken) {
      setToken(queryToken);
      console.log('Token received:', queryToken);
    } else {
      setError('No invitation token provided.');
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !password || !token) {
      setError('Please fill in all required fields and ensure you have a valid invitation token.');
      return;
    }

    try {
      const registrationData = {
        token: token,
        name: name.trim(),
        password: password
      };

      console.log('Attempting registration with:', {
        ...registrationData,
        password: '***'
      });
      
      const response = await api.post('/auth/register', registrationData);
      console.log('Registration response:', response.data);
      
      if (response.data && response.data.success) {
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
        navigate('/login');
      } else {
        throw new Error(response.data?.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.status === 404) {
        setError('Registration endpoint not found. Please check if the backend server is running.');
      } else if (!err.response) {
        setError('Cannot connect to the server. Please check if the backend is running.');
      } else {
        setError('Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
        {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <InputField
              label="Name:"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <InputField
              label="Password:"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit">Register</Button>
        </form>
      </div>
    </div>
  );
};

export default Register;
