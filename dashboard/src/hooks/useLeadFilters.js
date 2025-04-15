import { useState, useMemo, useCallback } from 'react';

export const useLeadFilters = (initialLeads = []) => {
  const [filters, setFilters] = useState({
    status: '',
    service: '',
    searchTerm: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc'
  });

  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [filterName]: value
    }));
  }, []);

  const handleSort = useCallback((key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const filteredAndSortedLeads = useMemo(() => {
    if (!Array.isArray(initialLeads)) return []; // Ensure initialLeads is an array

    return initialLeads
      .filter(lead => {
        const matchesStatus = !filters.status || lead.status === filters.status;
        const matchesService = !filters.service || (lead.service || '').toLowerCase().includes(filters.service.toLowerCase());
        const matchesSearch = !filters.searchTerm ||
          (lead.name || '').toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          (lead.email || '').toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          (lead.phone || '').includes(filters.searchTerm);
        return matchesStatus && matchesService && matchesSearch;
      })
      .sort((a, b) => {
        const keyA = a[sortConfig.key];
        const keyB = b[sortConfig.key];

        // Handle date sorting
        if (sortConfig.key === 'createdAt' || sortConfig.key === 'lastContactedAt') {
           const dateA = keyA ? new Date(keyA) : new Date(0); // Handle null/undefined dates
           const dateB = keyB ? new Date(keyB) : new Date(0);
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }

        // Handle potential null/undefined values for other keys
        const valA = keyA ?? ''; // Default to empty string if null/undefined
        const valB = keyB ?? '';

        // Simple comparison for strings/numbers
        if (valA < valB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
  }, [initialLeads, filters, sortConfig]);

  return {
    filters,
    sortConfig,
    handleFilterChange,
    handleSort,
    filteredLeads: filteredAndSortedLeads
  };
}; 