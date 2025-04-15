import React from 'react';
import { STATUS_OPTIONS } from './constants'; // Assuming constants are moved

const LeadCard = ({ lead, onStatusChange, onSelectLead }) => (
  <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3 className="font-medium text-gray-900">{lead.name}</h3>
        <p className="text-sm text-gray-500">{lead.service}</p>
      </div>
      <select
        value={lead.status}
        onChange={(e) => onStatusChange(lead._id, e.target.value)}
        onClick={(e) => e.stopPropagation()} // Prevent card click when changing status
        className={`text-sm rounded-full px-3 py-1 ${ 
            lead.status === 'new' ? 'bg-green-100 text-green-800' : 
            lead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
            lead.status === 'attempted-contact' ? 'bg-yellow-100 text-yellow-800' :
            lead.status === 'scheduled' ? 'bg-purple-100 text-purple-800' :
            lead.status === 'completed' ? 'bg-indigo-100 text-indigo-800' :
            'bg-red-100 text-red-800'
          }`}
      >
        {STATUS_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
      <div>
        <p className="text-gray-500">Phone</p>
        <p className="font-medium">{lead.phone}</p>
      </div>
      <div>
        <p className="text-gray-500">Email</p>
        <p className="font-medium truncate">{lead.email || 'N/A'}</p>
      </div>
    </div>
    <div className="flex justify-between items-center">
       <p className="text-xs text-gray-400">
          Created: {new Date(lead.createdAt).toLocaleDateString()}
       </p>
      <button
        onClick={() => onSelectLead(lead)}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        View Details
      </button>
    </div>
  </div>
);

export default LeadCard; 