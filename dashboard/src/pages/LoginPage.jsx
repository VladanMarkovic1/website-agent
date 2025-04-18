import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '../services/api';
import apiClient from '../services/api';
import InputField from '../components/layout/InputField';
import Button from '../components/layout/SubmitButton';
import { HiOutlineShieldExclamation } from 'react-icons/hi';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSecurityBlocked, setIsSecurityBlocked] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both fields.');
      return;
    }
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response?.data?.error?.includes('security software') || 
          err.response?.data?.error?.includes('Kaspersky')) {
        setIsSecurityBlocked(true);
        setError(err.response.data.error);
      } else {
        setIsSecurityBlocked(false);
        setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
      }
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Login to your account</h2>
        
        {error && (
          <div className={`rounded-md p-4 ${isSecurityBlocked ? 'bg-yellow-50' : 'bg-red-50'}`}>
            {isSecurityBlocked && (
              <div className="flex items-center mb-3">
                <HiOutlineShieldExclamation className="h-6 w-6 text-yellow-600 mr-2" />
                <h3 className="text-sm font-medium text-yellow-800">Security Software Detected</h3>
              </div>
            )}
            <p className={`text-sm ${isSecurityBlocked ? 'text-yellow-700' : 'text-red-600'}`}>
              {error}
            </p>
            {isSecurityBlocked && (
              <div className="mt-3">
                <p className="text-sm text-yellow-700">To resolve this:</p>
                <ul className="list-disc list-inside text-sm text-yellow-700 mt-1">
                  <li>Add this website to your Kaspersky's trusted sites</li>
                  <li>Or temporarily disable web protection</li>
                  <li>Then refresh the page and try again</li>
                </ul>
              </div>
            )}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <InputField
              label="Email:"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
          <Button type="submit">Login</Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
