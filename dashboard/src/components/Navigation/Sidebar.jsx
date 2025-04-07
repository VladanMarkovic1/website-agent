import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, MessageCircle, Settings, LogOut, BarChart2 } from 'react-feather';

const Sidebar = ({ onLogout }) => {
    const navItems = [
        {
            icon: <Home size={20} />,
            text: 'Dashboard',
            path: '/dashboard'
        },
        {
            icon: <MessageCircle size={20} />,
            text: 'Chat',
            path: '/chat'
        },
        {
            icon: <Users size={20} />,
            text: 'Leads',
            path: '/leads'
        },
        {
            icon: <BarChart2 size={20} />,
            text: 'Analytics',
            path: '/analytics'
        },
        {
            icon: <Settings size={20} />,
            text: 'Settings',
            path: '/settings'
        }
    ];

    return (
        <div className="h-screen w-64 bg-white border-r">
            <div className="p-4">
                <h1 className="text-xl font-bold">Dental Dashboard</h1>
            </div>
            <nav className="mt-8">
                {navItems.map((item, index) => (
                    <NavLink
                        key={index}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 ${
                                isActive ? 'bg-gray-100 border-r-4 border-blue-500' : ''
                            }`
                        }
                    >
                        {item.icon}
                        <span className="ml-4">{item.text}</span>
                    </NavLink>
                ))}
                <button
                    onClick={onLogout}
                    className="w-full flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100"
                >
                    <LogOut size={20} />
                    <span className="ml-4">Logout</span>
                </button>
            </nav>
        </div>
    );
};

export default Sidebar; 