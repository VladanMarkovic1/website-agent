import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { 
  HiOutlineClipboardList, 
  HiOutlineCog, 
  HiOutlineLogout,
  HiOutlineOfficeBuilding,
  HiOutlineMenuAlt2,
  HiOutlineX,
} from 'react-icons/hi';

const BusinessOwnerPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Fixed position removed, using flex instead */}
      <aside className={`w-64 bg-gradient-to-b from-blue-600 to-indigo-700 h-screen flex-shrink-0 md:sticky fixed top-0 left-0 overflow-y-auto z-20 transform transition-transform duration-200 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}>
        <div className="p-4">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-xl font-semibold text-white">Dashboard</span>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white">
              <HiOutlineX className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  location.pathname === item.href ? 'bg-white text-blue-600' : 'text-blue-200 hover:bg-blue-600 hover:text-white'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="mt-4 w-full text-left px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            <HiOutlineLogout className="inline-block mr-2 h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Mobile Menu Button */}
        <div className="md:hidden p-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900"
          >
            <HiOutlineMenuAlt2 className="h-6 w-6" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}</h1>
          </div>
          <Outlet />
        </div>
      </main>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-10"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default BusinessOwnerPage;
