import * as v from 'valibot';

// Base schema for step 1
export const step1Schema = v.object({
  name: v.pipe(
    v.string('Name is required'),
    v.trim(),
    v.minLength(2, 'Name must be at least 2 characters'),
    v.maxLength(100, 'Name must be less than 100 characters')
  ),
  email: v.pipe(
    v.string('Email is required'),
    v.trim(),
    v.email('Please enter a valid email address'),
    v.maxLength(255, 'Email must be less than 255 characters')
  ),
  inquiryType: v.picklist(['general', 'service'], 'Please select an inquiry type')
});

// Schema for step 2 (Service Request)
export const step2Schema = v.object({
  serviceNeeded: v.picklist([
    'music-production',
    'voice-over', 
    'gaming-content',
    'technical-consulting',
    'creative-direction',
    'other'
  ], 'Please select a service type'),
  budgetRange: v.picklist([
    'under-500',
    '500-1000',
    '1000-2500', 
    '2500-5000',
    '5000-10000',
    '10000-plus',
    'lets-discuss'
  ], 'Please select a budget range'),
  timeline: v.picklist([
    'asap',
    'within-1-week',
    'within-2-weeks',
    'within-1-month',
    'within-3-months',
    'no-rush',
    'flexible'
  ], 'Please select a timeline'),
  projectDetails: v.pipe(
    v.string('Project details are required'),
    v.trim(),
    v.minLength(20, 'Please provide more details about your project (at least 20 characters)'),
    v.maxLength(2000, 'Project details must be less than 2000 characters')
  )
});

// Schema for step 3 (General Message)
export const step3Schema = v.object({
  generalMessage: v.pipe(
    v.string('Message is required'),
    v.trim(),
    v.minLength(10, 'Please provide a more detailed message (at least 10 characters)'),
    v.maxLength(2000, 'Message must be less than 2000 characters')
  )
});

// Complete form schema combining all steps
export const contactFormSchema = v.variant('inquiryType', [
  // Service request form
  v.object({
    inquiryType: v.literal('service'),
    name: step1Schema.entries.name,
    email: step1Schema.entries.email,
    serviceNeeded: step2Schema.entries.serviceNeeded,
    budgetRange: step2Schema.entries.budgetRange,
    timeline: step2Schema.entries.timeline,
    projectDetails: step2Schema.entries.projectDetails,
    recaptchaToken: v.optional(v.string()),
    honeypot: v.optional(v.pipe(v.string(), v.maxLength(0, 'Bot detected'))) // Anti-spam honeypot
  }),
  // General message form  
  v.object({
    inquiryType: v.literal('general'),
    name: step1Schema.entries.name,
    email: step1Schema.entries.email,
    generalMessage: step3Schema.entries.generalMessage,
    recaptchaToken: v.optional(v.string()),
    honeypot: v.optional(v.pipe(v.string(), v.maxLength(0, 'Bot detected')))
  })
]);

// Helper function to get service display names
export function getServiceDisplayName(service) {
  const serviceNames = {
    'music-production': 'Music Production',
    'voice-over': 'Voice-Over',
    'gaming-content': 'Gaming Content',
    'technical-consulting': 'Technical Consulting',
    'creative-direction': 'Creative Direction',
    'other': 'Other'
  };
  return serviceNames[service] || service;
}

// Helper function to get budget display names
export function getBudgetDisplayName(budget) {
  const budgetNames = {
    'under-500': 'Under $500',
    '500-1000': '$500 - $1,000',
    '1000-2500': '$1,000 - $2,500',
    '2500-5000': '$2,500 - $5,000',
    '5000-10000': '$5,000 - $10,000',
    '10000-plus': '$10,000+',
    'lets-discuss': "Let's discuss"
  };
  return budgetNames[budget] || budget;
}

// Helper function to get timeline display names
export function getTimelineDisplayName(timeline) {
  const timelineNames = {
    'asap': 'ASAP',
    'within-1-week': 'Within 1 week',
    'within-2-weeks': 'Within 2 weeks',
    'within-1-month': 'Within 1 month',
    'within-3-months': 'Within 3 months',
    'no-rush': 'No rush',
    'flexible': 'Flexible'
  };
  return timelineNames[timeline] || timeline;
}

// Helper function to get inquiry type display name
export function getInquiryTypeDisplayName(inquiryType) {
  const inquiryNames = {
    'general': 'General Message',
    'service': 'Service Request'
  };
  return inquiryNames[inquiryType] || inquiryType;
}

// Validation messages for better UX
export const validationMessages = {
  step1: {
    title: 'Basic Information',
    description: 'Tell us who you are and what type of inquiry you have'
  },
  step2: {
    title: 'Service Request Details',
    description: 'Help us understand your project requirements and timeline'
  },
  step3: {
    title: 'Your Message',
    description: 'Share your thoughts, questions, or feedback with us'
  }
};

// Form field configurations for consistent UI
export const fieldConfigs = {
  name: {
    label: 'Name',
    placeholder: 'Your full name',
    helpText: 'How should we address you in our response?'
  },
  email: {
    label: 'Email',
    placeholder: 'your@email.com',
    helpText: 'We\'ll send our response to this email address'
  },
  inquiryType: {
    label: 'Inquiry Type',
    helpText: 'Choose the category that best describes your request'
  },
  serviceNeeded: {
    label: 'Service Needed',
    helpText: 'What type of creative service are you looking for?'
  },
  budgetRange: {
    label: 'Budget Range',
    helpText: 'This helps us tailor our proposal to your needs'
  },
  timeline: {
    label: 'Timeline',
    helpText: 'When would you like to have this project completed?'
  },
  projectDetails: {
    label: 'Project Details',
    placeholder: 'Tell us about your project, goals, target audience, specific requirements, and any inspiration or references you have in mind...',
    helpText: 'The more details you provide, the better we can help you'
  },
  generalMessage: {
    label: 'General Message',
    placeholder: 'Share your thoughts, questions, or feedback...',
    helpText: 'What would you like to talk about?'
  }
};

export default contactFormSchema;