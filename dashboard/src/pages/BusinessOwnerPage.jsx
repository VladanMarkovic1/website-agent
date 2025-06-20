import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { 
  HiOutlineClipboardList, 
  HiOutlineCog, 
  HiOutlineLogout,
  HiOutlineOfficeBuilding,
  HiOutlineMenuAlt2,
  HiOutlineX,
  HiOutlineChartBar,
  HiOutlinePhone,
} from 'react-icons/hi';
import { useAuth } from '../context/AuthContext.jsx';

const BusinessOwnerPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!user) {
      console.warn('[BusinessOwnerPage] No user found in context, redirecting to login.');
      navigate('/login');
      return;
    }
    setIsSidebarOpen(false);
  }, [location.pathname, user, navigate]);

  const handleLogout = () => {
    logout();
  };

  const navigation = [
    { name: 'Leads', href: '/dashboard/leads', icon: HiOutlineClipboardList },
    { name: 'Analytics', href: '/dashboard/analytics', icon: HiOutlineChartBar },
    { name: 'Call Tracking', href: '/dashboard/call-tracking', icon: HiOutlinePhone },
    { name: 'Services', href: '/dashboard/services', icon: HiOutlineOfficeBuilding },
    { name: 'Settings', href: '/dashboard/settings', icon: HiOutlineCog },
  ];

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-x-auto">
      {/* Sidebar - Always visible on desktop, toggleable on mobile/tablet */}
      <aside className={`fixed top-0 left-0 h-screen overflow-y-auto z-50 md:w-44 lg:w-48 xl:w-60 bg-gradient-to-b from-blue-600 to-indigo-700 transition-transform duration-200 ease-in-out ${
        isSidebarOpen ? 'translate-x-0 w-80' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-4">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-lg font-semibold text-white">Dashboard</span>
            <button onClick={() => setIsSidebarOpen(false)} className="text-white md:hidden">
              <HiOutlineX className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  location.pathname === item.href ? 'bg-white text-blue-600' : 'text-blue-200 hover:bg-blue-600 hover:text-white'
                }`}
              >
                <item.icon className="mr-2 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="mt-4 w-full text-left px-3 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <HiOutlineLogout className="inline-block mr-2 h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-hidden lg:ml-48 xl:ml-60">
        {/* Mobile/Tablet Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 p-4 z-30 bg-white shadow-sm w-full flex items-center">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900 p-2 inline-flex"
          >
            <HiOutlineMenuAlt2 className="h-6 w-6" />
          </button>
          <h1 className="ml-2 text-xl font-semibold text-gray-900">Welcome, {user.name}</h1>
        </div>

        {/* Main Content Area */}
        <div className="h-full p-4 lg:p-6">
          {/* Desktop Header */}
          <div className="hidden lg:flex justify-between items-center mb-6 pt-4">
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}</h1>
          </div>
          {/* Mobile/Tablet Spacing */}
          <div className="lg:hidden h-16"></div>
          {/* Content Area */}
          <div className="h-[calc(100vh-theme(spacing.32))] overflow-y-auto">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Overlay - Shows when mobile/tablet sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default BusinessOwnerPage;
