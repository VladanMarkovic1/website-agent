import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/api';
import InputField from '../layout/InputField';
import Button from '../layout/SubmitButton';
import { HiSave, HiPlus, HiTrash, HiClock, HiLocationMarker, HiUserGroup } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext.jsx';

const BusinessProfile = () => {
  const { user } = useAuth();
  const businessId = user?.businessId;

  // Main business profile state
  const [businessProfile, setBusinessProfile] = useState({
    businessName: '',
    businessDescription: '',
    mission: '',
    vision: '',
    specializations: [],
    yearsInBusiness: '',
    certifications: [],
    awards: [],
    teamMembers: [],
    insurancePartners: [],
    paymentOptions: [],
    emergencyProtocol: '',
    businessTone: 'professional',
    communicationStyle: 'empathetic',
    timezone: 'America/New_York',
    phone: '',
    email: ''
  });

  // Location details state
  const [locationDetails, setLocationDetails] = useState({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    parking: '',
    accessibility: '',
    publicTransport: '',
    landmarks: ''
  });

  // Business hours state
  const [businessHours, setBusinessHours] = useState({
    monday: { open: '09:00', close: '17:00', closed: false },
    tuesday: { open: '09:00', close: '17:00', closed: false },
    wednesday: { open: '09:00', close: '17:00', closed: false },
    thursday: { open: '09:00', close: '17:00', closed: false },
    friday: { open: '09:00', close: '17:00', closed: false },
    saturday: { open: '09:00', close: '13:00', closed: true },
    sunday: { open: '09:00', close: '13:00', closed: true }
  });

  // AI Configuration state
  const [aiConfig, setAiConfig] = useState({
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 300,
    includeBusinessContext: true,
    includeServiceDetails: true,
    includeTeamInfo: true,
    includeTestimonials: true
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form states for adding new items
  const [newSpecialization, setNewSpecialization] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [newAward, setNewAward] = useState('');
  const [newInsurancePartner, setNewInsurancePartner] = useState('');
  const [newPaymentOption, setNewPaymentOption] = useState('');
  const [newTeamMember, setNewTeamMember] = useState({
    name: '',
    role: '',
    title: '',
    education: '',
    experience: '',
    specializations: [],
    languages: [],
    bio: ''
  });

  // Load business profile data
  useEffect(() => {
    const fetchBusinessProfile = async () => {
      if (!businessId) return;
      
      try {
        setLoading(true);
        const response = await apiClient.get(`/business/${businessId}/profile`);
        const data = response.data;
        
        if (data) {
          setBusinessProfile({
            businessName: data.businessName || '',
            businessDescription: data.businessDescription || '',
            mission: data.mission || '',
            vision: data.vision || '',
            specializations: data.specializations || [],
            yearsInBusiness: data.yearsInBusiness || '',
            certifications: data.certifications || [],
            awards: data.awards || [],
            teamMembers: data.teamMembers || [],
            insurancePartners: data.insurancePartners || [],
            paymentOptions: data.paymentOptions || [],
            emergencyProtocol: data.emergencyProtocol || '',
            businessTone: data.businessTone || 'professional',
            communicationStyle: data.communicationStyle || 'empathetic',
            timezone: data.timezone || 'America/New_York',
            phone: data.phone || '',
            email: data.email || ''
          });

          setLocationDetails(data.locationDetails || {
            address: '', city: '', state: '', zipCode: '',
            parking: '', accessibility: '', publicTransport: '', landmarks: ''
          });

          setBusinessHours(data.businessHours || {
            monday: { open: '09:00', close: '17:00', closed: false },
            tuesday: { open: '09:00', close: '17:00', closed: false },
            wednesday: { open: '09:00', close: '17:00', closed: false },
            thursday: { open: '09:00', close: '17:00', closed: false },
            friday: { open: '09:00', close: '17:00', closed: false },
            saturday: { open: '09:00', close: '13:00', closed: true },
            sunday: { open: '09:00', close: '13:00', closed: true }
          });

          setAiConfig(data.aiConfig || {
            model: 'gpt-4',
            temperature: 0.7,
            maxTokens: 300,
            includeBusinessContext: true,
            includeServiceDetails: true,
            includeTeamInfo: true,
            includeTestimonials: true
          });
        }
      } catch (err) {
        console.error('Error fetching business profile:', err);
        setError('Failed to load business profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessProfile();
  }, [businessId]);

  // Save business profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!businessId) return;

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      const profileData = {
        ...businessProfile,
        locationDetails,
        businessHours,
        aiConfig
      };

      await apiClient.put(`/business/${businessId}/profile`, profileData);
      setSuccessMessage('Business profile updated successfully!');
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error saving business profile:', err);
      if (err.response?.data?.errors) {
        setError(err.response.data.errors.map(e => e.msg).join(' | '));
      } else {
        setError(err.response?.data?.error || 'Failed to save business profile.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Helper functions for managing arrays
  const addItem = (field, value, setter) => {
    if (value.trim()) {
      setter(prev => [...prev, value.trim()]);
      return '';
    }
    return value;
  };

  const removeItem = (field, index, setter) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  // Team member management
  const addTeamMember = () => {
    if (newTeamMember.name && newTeamMember.role) {
      setBusinessProfile(prev => ({
        ...prev,
        teamMembers: [...prev.teamMembers, { ...newTeamMember }]
      }));
      setNewTeamMember({
        name: '', role: '', title: '', education: '', experience: '',
        specializations: [], languages: [], bio: ''
      });
    }
  };

  const removeTeamMember = (index) => {
    setBusinessProfile(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((_, i) => i !== index)
    }));
  };

  // Business hours management
  const updateBusinessHours = (day, field, value) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Business Profile</h2>
        <Button
          onClick={handleSaveProfile}
          disabled={saving}
          className="flex items-center"
        >
          <HiSave className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Business Name"
              value={businessProfile.businessName}
              onChange={(e) => setBusinessProfile(prev => ({ ...prev, businessName: e.target.value }))}
              required
            />
            <InputField
              label="Business Phone"
              value={businessProfile.phone || ''}
              onChange={(e) => setBusinessProfile(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="e.g. (555) 123-4567"
            />
            <InputField
              label="Business Email"
              value={businessProfile.email || ''}
              onChange={(e) => setBusinessProfile(prev => ({ ...prev, email: e.target.value }))}
              placeholder="e.g. info@yourpractice.com"
              type="email"
            />
            <InputField
              label="Years in Business"
              type="number"
              value={businessProfile.yearsInBusiness}
              onChange={(e) => setBusinessProfile(prev => ({ ...prev, yearsInBusiness: e.target.value }))}
            />
          </div>
          
          <div className="mt-4">
            <InputField
              label="Business Description"
              type="textarea"
              value={businessProfile.businessDescription}
              onChange={(e) => setBusinessProfile(prev => ({ ...prev, businessDescription: e.target.value }))}
              placeholder="Describe your business, services, and what makes you unique..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <InputField
              label="Mission Statement"
              type="textarea"
              value={businessProfile.mission}
              onChange={(e) => setBusinessProfile(prev => ({ ...prev, mission: e.target.value }))}
              placeholder="Your business mission..."
              rows={3}
            />
            <InputField
              label="Vision Statement"
              type="textarea"
              value={businessProfile.vision}
              onChange={(e) => setBusinessProfile(prev => ({ ...prev, vision: e.target.value }))}
              placeholder="Your business vision..."
              rows={3}
            />
          </div>
        </div>

        {/* Specializations */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Specializations</h3>
          <div className="flex gap-2 mb-4">
            <InputField
              value={newSpecialization}
              onChange={(e) => setNewSpecialization(e.target.value)}
              placeholder="Add specialization..."
              className="flex-1"
            />
            <Button
              type="button"
              onClick={() => setNewSpecialization(addItem('specializations', newSpecialization, 
                (value) => setBusinessProfile(prev => ({ ...prev, specializations: [...prev.specializations, value] }))))}
              className="flex items-center"
            >
              <HiPlus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {businessProfile.specializations.map((spec, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
                {spec}
                <button
                  type="button"
                  onClick={() => removeItem('specializations', index, 
                    (value) => setBusinessProfile(prev => ({ ...prev, specializations: prev.specializations.filter((_, i) => i !== index) })))}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <HiTrash className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Insurance Partners & Payment Options */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Insurance Partners & Payment Plans</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Accepted Insurance Providers</label>
            <div className="flex gap-2 mb-2">
              <InputField
                value={newInsurancePartner}
                onChange={(e) => setNewInsurancePartner(e.target.value)}
                placeholder="Add insurance provider..."
                className="flex-1"
              />
              <Button
                type="button"
                onClick={() => setNewInsurancePartner(addItem('insurancePartners', newInsurancePartner, 
                  (value) => setBusinessProfile(prev => ({ ...prev, insurancePartners: [...prev.insurancePartners, value] }))))}
                className="flex items-center"
              >
                <HiPlus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {businessProfile.insurancePartners.map((ins, index) => (
                <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center">
                  {ins}
                  <button
                    type="button"
                    onClick={() => removeItem('insurancePartners', index, 
                      (value) => setBusinessProfile(prev => ({ ...prev, insurancePartners: prev.insurancePartners.filter((_, i) => i !== index) })))}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    <HiTrash className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Plans / Options</label>
            <div className="flex gap-2 mb-2">
              <InputField
                value={newPaymentOption}
                onChange={(e) => setNewPaymentOption(e.target.value)}
                placeholder="Add payment plan or option..."
                className="flex-1"
              />
              <Button
                type="button"
                onClick={() => setNewPaymentOption(addItem('paymentOptions', newPaymentOption, 
                  (value) => setBusinessProfile(prev => ({ ...prev, paymentOptions: [...prev.paymentOptions, value] }))))}
                className="flex items-center"
              >
                <HiPlus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {businessProfile.paymentOptions.map((opt, index) => (
                <span key={index} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm flex items-center">
                  {opt}
                  <button
                    type="button"
                    onClick={() => removeItem('paymentOptions', index, 
                      (value) => setBusinessProfile(prev => ({ ...prev, paymentOptions: prev.paymentOptions.filter((_, i) => i !== index) })))}
                    className="ml-2 text-yellow-600 hover:text-yellow-800"
                  >
                    <HiTrash className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <HiUserGroup className="mr-2 h-5 w-5" />
            Team Members
          </h3>
          
          {/* Add new team member */}
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-700 mb-3">Add Team Member</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Name"
                value={newTeamMember.name}
                onChange={(e) => setNewTeamMember(prev => ({ ...prev, name: e.target.value }))}
              />
              <InputField
                label="Role"
                value={newTeamMember.role}
                onChange={(e) => setNewTeamMember(prev => ({ ...prev, role: e.target.value }))}
              />
              <InputField
                label="Title"
                value={newTeamMember.title}
                onChange={(e) => setNewTeamMember(prev => ({ ...prev, title: e.target.value }))}
              />
              <InputField
                label="Education"
                value={newTeamMember.education}
                onChange={(e) => setNewTeamMember(prev => ({ ...prev, education: e.target.value }))}
              />
            </div>
            <div className="mt-4">
              <InputField
                label="Bio"
                type="textarea"
                value={newTeamMember.bio}
                onChange={(e) => setNewTeamMember(prev => ({ ...prev, bio: e.target.value }))}
                rows={3}
              />
            </div>
            <Button
              type="button"
              onClick={addTeamMember}
              className="mt-4"
            >
              Add Team Member
            </Button>
          </div>

          {/* Existing team members */}
          <div className="space-y-4">
            {businessProfile.teamMembers.map((member, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-medium text-gray-900">{member.name}</h5>
                  <button
                    type="button"
                    onClick={() => removeTeamMember(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <HiTrash className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-600">{member.role}</p>
                {member.title && <p className="text-sm text-gray-600">{member.title}</p>}
                {member.bio && <p className="text-sm text-gray-600 mt-2">{member.bio}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Location Details */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <HiLocationMarker className="mr-2 h-5 w-5" />
            Location Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Main Visiting Address"
              value={locationDetails.address}
              onChange={(e) => setLocationDetails(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Street address for patients to visit"
            />
            <InputField
              label="City"
              value={locationDetails.city}
              onChange={(e) => setLocationDetails(prev => ({ ...prev, city: e.target.value }))}
            />
            <InputField
              label="State"
              value={locationDetails.state}
              onChange={(e) => setLocationDetails(prev => ({ ...prev, state: e.target.value }))}
            />
            <InputField
              label="ZIP Code"
              value={locationDetails.zipCode}
              onChange={(e) => setLocationDetails(prev => ({ ...prev, zipCode: e.target.value }))}
            />
            <InputField
              label="Parking Information"
              value={locationDetails.parking}
              onChange={(e) => setLocationDetails(prev => ({ ...prev, parking: e.target.value }))}
            />
            <InputField
              label="Accessibility"
              value={locationDetails.accessibility}
              onChange={(e) => setLocationDetails(prev => ({ ...prev, accessibility: e.target.value }))}
            />
          </div>
        </div>

        {/* Business Hours */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <HiClock className="mr-2 h-5 w-5" />
            Business Hours
          </h3>
          <div className="space-y-3">
            {Object.entries(businessHours).map(([day, hours]) => (
              <div key={day} className="flex items-center space-x-4">
                <div className="w-24 font-medium text-gray-700 capitalize">{day}</div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={!hours.closed}
                    onChange={(e) => updateBusinessHours(day, 'closed', !e.target.checked)}
                    className="mr-2"
                  />
                  Open
                </label>
                {!hours.closed && (
                  <>
                    <input
                      type="time"
                      value={hours.open}
                      onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1"
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={hours.close}
                      onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Business Personality */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Business Personality</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Tone</label>
              <select
                value={businessProfile.businessTone}
                onChange={(e) => setBusinessProfile(prev => ({ ...prev, businessTone: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
                <option value="caring">Caring</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Communication Style</label>
              <select
                value={businessProfile.communicationStyle}
                onChange={(e) => setBusinessProfile(prev => ({ ...prev, communicationStyle: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="direct">Direct</option>
                <option value="empathetic">Empathetic</option>
                <option value="educational">Educational</option>
                <option value="conversational">Conversational</option>
              </select>
            </div>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">AI Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">AI Model</label>
              <input
                type="text"
                value="GPT-3.5 Turbo"
                disabled
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Temperature</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={aiConfig.temperature}
                onChange={(e) => setAiConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <span className="text-sm text-gray-500">{aiConfig.temperature}</span>
            </div>
          </div>
          
          <div className="mt-4 space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={aiConfig.includeBusinessContext}
                onChange={(e) => setAiConfig(prev => ({ ...prev, includeBusinessContext: e.target.checked }))}
                className="mr-2"
              />
              Include business context in AI responses
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={aiConfig.includeServiceDetails}
                onChange={(e) => setAiConfig(prev => ({ ...prev, includeServiceDetails: e.target.checked }))}
                className="mr-2"
              />
              Include service details in AI responses
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={aiConfig.includeTeamInfo}
                onChange={(e) => setAiConfig(prev => ({ ...prev, includeTeamInfo: e.target.checked }))}
                className="mr-2"
              />
              Include team information in AI responses
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={aiConfig.includeTestimonials}
                onChange={(e) => setAiConfig(prev => ({ ...prev, includeTestimonials: e.target.checked }))}
                className="mr-2"
              />
              Include testimonials in AI responses
            </label>
          </div>
        </div>
      </form>
    </div>
  );
};

export default BusinessProfile; 