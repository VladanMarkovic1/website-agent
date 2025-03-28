import React, { useState } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { HiMenu, HiX } from 'react-icons/hi';
import { 
  HiOutlineClipboardList, 
  HiOutlineCog, 
  HiOutlineLogout,
  HiOutlineOfficeBuilding
} from 'react-icons/hi';

const BusinessOwnerPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    // Clear the token and user data from localStorage on logout
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navigation = [
    { name: 'Leads', href: '/dashboard/leads', icon: HiOutlineClipboardList },
    { name: 'Services', href: '/dashboard/services', icon: HiOutlineOfficeBuilding },
    { name: 'Settings', href: '/dashboard/settings', icon: HiOutlineCog },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static`}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden"
          >
            <HiX className="h-6 w-6" />
          </button>
        </div>

        {/* Sidebar Content */}
        <nav className="mt-5 px-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-4 h-6 w-6 ${
                      isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className={`flex-1 min-w-0 flex flex-col ${isSidebarOpen ? 'lg:pl-64' : ''}`}>
        {/* Top Header */}
        <div className="sticky top-0 z-20 flex-shrink-0 h-16 bg-white shadow">
          <div className="flex items-center justify-between h-full px-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden"
            >
              <HiMenu className="h-6 w-6" />
            </button>
            
            <div className="flex items-center">
              <span className="mr-4 text-sm text-gray-500">
                Welcome, {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <HiOutlineLogout className="mr-2 h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            {/* This Outlet will render nested routes such as Leads or Services */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default BusinessOwnerPage;
