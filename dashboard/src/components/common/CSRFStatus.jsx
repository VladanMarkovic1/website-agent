import React from 'react';
import { ShieldCheckIcon, ShieldExclamationIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useCSRF } from '../../hooks/useCSRF.js';

/**
 * CSRF Protection Status Indicator
 * Shows the current state of CSRF protection
 */
const CSRFStatus = ({ showDetails = false, className = '' }) => {
    const { token, loading, error, refreshToken } = useCSRF();

    const getStatus = () => {
        if (loading) return 'loading';
        if (error) return 'error';
        if (token) return 'protected';
        return 'unavailable';
    };

    const getStatusConfig = () => {
        const status = getStatus();
        
        switch (status) {
            case 'protected':
                return {
                    icon: ShieldCheckIcon,
                    color: 'text-green-600',
                    bgColor: 'bg-green-50',
                    borderColor: 'border-green-200',
                    text: 'CSRF Protected',
                    description: 'Requests are protected against CSRF attacks'
                };
            case 'loading':
                return {
                    icon: ArrowPathIcon,
                    color: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                    borderColor: 'border-blue-200',
                    text: 'Loading...',
                    description: 'Obtaining CSRF protection token'
                };
            case 'error':
                return {
                    icon: ShieldExclamationIcon,
                    color: 'text-red-600',
                    bgColor: 'bg-red-50',
                    borderColor: 'border-red-200',
                    text: 'CSRF Error',
                    description: 'Failed to obtain CSRF protection'
                };
            default:
                return {
                    icon: ShieldExclamationIcon,
                    color: 'text-yellow-600',
                    bgColor: 'bg-yellow-50',
                    borderColor: 'border-yellow-200',
                    text: 'No Protection',
                    description: 'CSRF protection unavailable'
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    if (!showDetails) {
        // Compact version - just icon and status
        return (
            <div className={`flex items-center space-x-2 ${className}`}>
                <div className={`p-1 rounded-full ${config.bgColor}`}>
                    <Icon className={`h-4 w-4 ${config.color} ${loading ? 'animate-spin' : ''}`} />
                </div>
                <span className={`text-sm font-medium ${config.color}`}>
                    {config.text}
                </span>
            </div>
        );
    }

    // Detailed version - with description and action button
    return (
        <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4 ${className}`}>
            <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 p-2 rounded-full bg-white`}>
                    <Icon className={`h-5 w-5 ${config.color} ${loading ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-medium ${config.color}`}>
                            {config.text}
                        </h3>
                        {error && (
                            <button
                                onClick={refreshToken}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Retry
                            </button>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                        {config.description}
                    </p>
                    {error && (
                        <p className="text-xs text-red-600 mt-1">
                            Error: {error}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Simple CSRF status badge for headers/nav
 */
export const CSRFBadge = ({ className = '' }) => {
    const { token, loading, error } = useCSRF();
    
    const getStatusColor = () => {
        if (loading) return 'bg-blue-500';
        if (error) return 'bg-red-500';
        if (token) return 'bg-green-500';
        return 'bg-yellow-500';
    };

    const getTooltip = () => {
        if (loading) return 'Loading CSRF protection...';
        if (error) return 'CSRF protection error';
        if (token) return 'CSRF protected';
        return 'CSRF protection unavailable';
    };

    return (
        <div className={`flex items-center ${className}`} title={getTooltip()}>
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
            <span className="ml-1 text-xs text-gray-500">CSRF</span>
        </div>
    );
};

export default CSRFStatus; 