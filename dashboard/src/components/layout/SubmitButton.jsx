import React from 'react';

const SubmitButton = ({ type = 'button', onClick, children, className = '' }) => {
  const defaultClasses = 'group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';
  
  return (
    <button 
      type={type} 
      onClick={onClick} 
      className={`${defaultClasses} ${className}`}
    >
      {children}
    </button>
  );
};

export default SubmitButton;
