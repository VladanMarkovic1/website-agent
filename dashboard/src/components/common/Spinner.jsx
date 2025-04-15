import React from 'react';

const Spinner = ({ size = 'h-12 w-12', color = 'border-blue-500' }) => {
  return (
    <div className={`animate-spin rounded-full ${size} border-t-2 border-b-2 ${color}`}></div>
  );
};

export default Spinner; 