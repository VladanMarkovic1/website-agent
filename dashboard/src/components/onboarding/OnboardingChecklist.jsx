import React, { useState, useEffect } from 'react';
import { HiCheck, HiExclamation, HiInformationCircle, HiArrowRight } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext.jsx';
import apiClient from '../../utils/api';

const OnboardingChecklist = () => {
  const { user } = useAuth();
  const businessId = user?.businessId;
  
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Load business profile and validate completion
  useEffect(() => {
    const loadBusinessProfile = async () => {
      if (!businessId) return;
      
      try {
        setLoading(true);
        const response = await apiClient.get(`/business/${businessId}/profile`);
        const profile = response.data;
        
        const checklistItems = generateChecklist(profile);
        setChecklist(checklistItems);
        
        const completed = checklistItems.filter(item => item.completed).length;
        const percentage = Math.round((completed / checklistItems.length) * 100);
        setCompletionPercentage(percentage);
        
      } catch (err) {
        console.error('Error loading business profile:', err);
        setError('Failed to load business profile');
      } finally {
        setLoading(false);
      }
    };

    loadBusinessProfile();
  }, [businessId]);

  const generateChecklist = (profile) => {
    return [
      // Required Fields (Critical for AI functionality)
      {
        id: 'business_name',
        title: 'Business Name',
        description: 'Your business name is required for all communications',
        category: 'required',
        completed: !!profile.businessName,
        field: 'businessName',
        value: profile.businessName
      },
      {
        id: 'business_description',
        title: 'Business Description',
        description: 'A clear description helps AI understand your business',
        category: 'required',
        completed: !!profile.businessDescription,
        field: 'businessDescription',
        value: profile.businessDescription
      },
      {
        id: 'services',
        title: 'Services',
        description: 'List your main services for accurate AI responses',
        category: 'required',
        completed: profile.services && profile.services.length > 0,
        field: 'services',
        value: profile.services
      },
      {
        id: 'contact_info',
        title: 'Contact Information',
        description: 'Phone number and email for customer inquiries',
        category: 'required',
        completed: !!(profile.contact?.phone || profile.contact?.email),
        field: 'contact',
        value: profile.contact
      },
      {
        id: 'business_hours',
        title: 'Business Hours',
        description: 'Operating hours for appointment scheduling',
        category: 'required',
        completed: !!profile.businessHours,
        field: 'businessHours',
        value: profile.businessHours
      },

      // Important Fields (Enhances AI responses)
      {
        id: 'specializations',
        title: 'Specializations',
        description: 'Your areas of expertise and focus',
        category: 'important',
        completed: profile.specializations && profile.specializations.length > 0,
        field: 'specializations',
        value: profile.specializations
      },
      {
        id: 'team_members',
        title: 'Team Members',
        description: 'Information about your staff and their roles',
        category: 'important',
        completed: profile.teamMembers && profile.teamMembers.length > 0,
        field: 'teamMembers',
        value: profile.teamMembers
      },
      {
        id: 'location_details',
        title: 'Location Details',
        description: 'Address and location information',
        category: 'important',
        completed: !!(profile.locationDetails?.address || profile.locationDetails?.city),
        field: 'locationDetails',
        value: profile.locationDetails
      },
      {
        id: 'insurance_partners',
        title: 'Insurance Partners',
        description: 'Accepted insurance providers',
        category: 'important',
        completed: profile.insurancePartners && profile.insurancePartners.length > 0,
        field: 'insurancePartners',
        value: profile.insurancePartners
      },
      {
        id: 'payment_options',
        title: 'Payment Options',
        description: 'Accepted payment methods',
        category: 'important',
        completed: profile.paymentOptions && profile.paymentOptions.length > 0,
        field: 'paymentOptions',
        value: profile.paymentOptions
      },

      // Recommended Fields (Improves AI personality)
      {
        id: 'business_tone',
        title: 'Business Tone',
        description: 'How you want your AI to communicate (professional, friendly, etc.)',
        category: 'recommended',
        completed: !!profile.businessTone,
        field: 'businessTone',
        value: profile.businessTone
      },
      {
        id: 'communication_style',
        title: 'Communication Style',
        description: 'Your preferred communication approach',
        category: 'recommended',
        completed: !!profile.communicationStyle,
        field: 'communicationStyle',
        value: profile.communicationStyle
      },
      {
        id: 'years_in_business',
        title: 'Years in Business',
        description: 'Your experience and establishment history',
        category: 'recommended',
        completed: !!profile.yearsInBusiness,
        field: 'yearsInBusiness',
        value: profile.yearsInBusiness
      },
      {
        id: 'certifications',
        title: 'Certifications & Awards',
        description: 'Professional certifications and recognition',
        category: 'recommended',
        completed: (profile.certifications && profile.certifications.length > 0) || 
                  (profile.awards && profile.awards.length > 0),
        field: 'certifications',
        value: { certifications: profile.certifications, awards: profile.awards }
      },
      {
        id: 'emergency_protocol',
        title: 'Emergency Protocol',
        description: 'How to handle urgent situations',
        category: 'recommended',
        completed: !!profile.emergencyProtocol,
        field: 'emergencyProtocol',
        value: profile.emergencyProtocol
      }
    ];
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'required':
        return <HiExclamation className="h-5 w-5 text-red-500" />;
      case 'important':
        return <HiInformationCircle className="h-5 w-5 text-yellow-500" />;
      case 'recommended':
        return <HiInformationCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <HiInformationCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'required':
        return 'border-red-200 bg-red-50';
      case 'important':
        return 'border-yellow-200 bg-yellow-50';
      case 'recommended':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const handleCompleteItem = (itemId) => {
    // Navigate to the appropriate settings section
    // This would typically open the business profile form with focus on the specific field
    console.log(`Navigate to complete: ${itemId}`);
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

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  const requiredItems = checklist.filter(item => item.category === 'required');
  const importantItems = checklist.filter(item => item.category === 'important');
  const recommendedItems = checklist.filter(item => item.category === 'recommended');

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Business Profile Setup</h2>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{completionPercentage}%</div>
            <div className="text-sm text-gray-500">Complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>

        <p className="text-gray-600 mb-6">
          Complete your business profile to enable AI-powered responses that are tailored to your specific business. 
          The more information you provide, the better your chatbot will be able to assist your customers.
        </p>

        {/* Required Fields */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <HiExclamation className="h-5 w-5 text-red-500 mr-2" />
            Required Fields
            <span className="ml-2 text-sm text-gray-500">
              ({requiredItems.filter(item => item.completed).length}/{requiredItems.length} complete)
            </span>
          </h3>
          <div className="space-y-3">
            {requiredItems.map((item) => (
              <div 
                key={item.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${getCategoryColor(item.category)}`}
              >
                <div className="flex items-center">
                  {item.completed ? (
                    <HiCheck className="h-5 w-5 text-green-500 mr-3" />
                  ) : (
                    getCategoryIcon(item.category)
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="text-sm text-gray-600">{item.description}</div>
                  </div>
                </div>
                {!item.completed && (
                  <button
                    onClick={() => handleCompleteItem(item.id)}
                    className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Complete
                    <HiArrowRight className="h-4 w-4 ml-1" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Important Fields */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <HiInformationCircle className="h-5 w-5 text-yellow-500 mr-2" />
            Important Fields
            <span className="ml-2 text-sm text-gray-500">
              ({importantItems.filter(item => item.completed).length}/{importantItems.length} complete)
            </span>
          </h3>
          <div className="space-y-3">
            {importantItems.map((item) => (
              <div 
                key={item.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${getCategoryColor(item.category)}`}
              >
                <div className="flex items-center">
                  {item.completed ? (
                    <HiCheck className="h-5 w-5 text-green-500 mr-3" />
                  ) : (
                    getCategoryIcon(item.category)
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="text-sm text-gray-600">{item.description}</div>
                  </div>
                </div>
                {!item.completed && (
                  <button
                    onClick={() => handleCompleteItem(item.id)}
                    className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Complete
                    <HiArrowRight className="h-4 w-4 ml-1" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Fields */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <HiInformationCircle className="h-5 w-5 text-blue-500 mr-2" />
            Recommended Fields
            <span className="ml-2 text-sm text-gray-500">
              ({recommendedItems.filter(item => item.completed).length}/{recommendedItems.length} complete)
            </span>
          </h3>
          <div className="space-y-3">
            {recommendedItems.map((item) => (
              <div 
                key={item.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${getCategoryColor(item.category)}`}
              >
                <div className="flex items-center">
                  {item.completed ? (
                    <HiCheck className="h-5 w-5 text-green-500 mr-3" />
                  ) : (
                    getCategoryIcon(item.category)
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="text-sm text-gray-600">{item.description}</div>
                  </div>
                </div>
                {!item.completed && (
                  <button
                    onClick={() => handleCompleteItem(item.id)}
                    className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Complete
                    <HiArrowRight className="h-4 w-4 ml-1" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Completion Message */}
        {completionPercentage === 100 && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <HiCheck className="h-5 w-5 mr-2" />
              <span className="font-medium">Congratulations!</span>
            </div>
            <p className="mt-1">
              Your business profile is complete. Your AI chatbot is now fully configured with your business information 
              and ready to provide personalized responses to your customers.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {completionPercentage < 100 && (
              <span>
                {checklist.filter(item => !item.completed && item.category === 'required').length} required fields remaining
              </span>
            )}
          </div>
          <button
            onClick={() => window.location.href = '/dashboard/settings'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingChecklist;
 