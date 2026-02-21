<script>
  import { browser } from '$app/environment';
  import { deserialize } from '$app/forms';
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { step1Schema, step2Schema, step3Schema } from '$lib/schemas/contactForm.js';
  import * as v from 'valibot';
  import FormProgressIndicator from './FormProgressIndicator.svelte';
  import FormStep1 from './FormStep1.svelte';
  import FormStep2 from './FormStep2.svelte';
  import FormStep3 from './FormStep3.svelte';
  import ReCaptcha from './ReCaptcha.svelte';
  import confetti from 'canvas-confetti';
  import { env } from '$env/dynamic/public';

  let { data } = $props();

  // Form state management
  let currentStep = $state(1);
  let totalSteps = $state(3);
  let isSubmitting = $state(false);
  let recaptchaToken = $state(null);
  let recaptchaComponent = $state(null);
  let formStartTime = $state(Date.now()); // For time-based validation
  
  // Form expiration management
  const FORM_EXPIRATION_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds
  const WARNING_THRESHOLDS = {
    firstWarning: 5 * 60 * 1000, // 5 minutes remaining
    finalWarning: 2 * 60 * 1000   // 2 minutes remaining
  };
  
  let timeRemaining = $state(FORM_EXPIRATION_TIME);
  let isExpired = $state(false);
  let warningLevel = $state('none'); // 'none', 'first', 'final', 'expired'
  let expirationInterval = $state(null);

  // Success message handler
  const showSuccessMessage = async (msg) => {
    // Show success toast
    const Swal = await import('sweetalert2');
    Swal.default.fire({
      icon: 'success',
      title: 'Message Sent!',
      text: msg,
      background: '#1f2937',
      color: '#f3f4f6',
      confirmButtonColor: '#14b8a6'
    });

    // Trigger confetti
    if (browser) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      // Reset form state
      currentStep = 1;
      recaptchaToken = null;
      recaptchaComponent?.reset();
    }
  };

  // Form expiration checking
  const checkFormExpiration = () => {
    const elapsed = Date.now() - formStartTime;
    const remaining = FORM_EXPIRATION_TIME - elapsed;
    
    timeRemaining = Math.max(0, remaining);
    
    if (remaining <= 0) {
      // Form has expired
      isExpired = true;
      warningLevel = 'expired';
      if (expirationInterval) {
        clearInterval(expirationInterval);
        expirationInterval = null;
      }
    } else if (remaining <= WARNING_THRESHOLDS.finalWarning) {
      // Final warning (2 minutes)
      warningLevel = 'final';
    } else if (remaining <= WARNING_THRESHOLDS.firstWarning) {
      // First warning (5 minutes)
      warningLevel = 'first';
    } else {
      warningLevel = 'none';
    }
  };

  // Format time remaining for display
  const formatTimeRemaining = (milliseconds) => {
    if (milliseconds <= 0) return '0:00';
    
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Refresh form (reload page)
  const refreshForm = () => {
    if (browser) {
      window.location.reload();
    }
  };

  // Sync autofill values back to Svelte state
  const syncAutofillValues = () => {
    if (!browser) return;
    
    // Get form inputs and sync their values to formValues
    const nameInput = document.querySelector('input[name="name"]');
    const emailInput = document.querySelector('input[name="email"]');
    
    if (nameInput && nameInput.value !== formValues.name) {
      formValues.name = nameInput.value;
    }
    
    if (emailInput && emailInput.value !== formValues.email) {
      formValues.email = emailInput.value;
    }
  };

  // Lifecycle management
  onMount(() => {
    if (browser) {
      // Start the expiration checker
      checkFormExpiration(); // Initial check
      expirationInterval = setInterval(checkFormExpiration, 30000); // Check every 30 seconds
      
      // Add autofill detection
      setTimeout(syncAutofillValues, 100); // Initial sync after mount
      setTimeout(syncAutofillValues, 500); // Delayed sync for slow autofill
      
      // Listen for autofill events
      document.addEventListener('change', syncAutofillValues, true);
      document.addEventListener('input', syncAutofillValues, true);
      document.addEventListener('animationstart', (e) => {
        // Detect Chrome autofill animation
        if (e.animationName === 'onAutoFillStart') {
          setTimeout(syncAutofillValues, 50);
        }
      }, true);
    }
  });

  onDestroy(() => {
    if (expirationInterval) {
      clearInterval(expirationInterval);
      expirationInterval = null;
    }
    
    // Clean up autofill event listeners
    if (browser) {
      document.removeEventListener('change', syncAutofillValues, true);
      document.removeEventListener('input', syncAutofillValues, true);
    }
  });
  
  // Form submission handler (now uses superforms)
  const handleFormSubmit = async (event) => {
    event.preventDefault();
    
    // Get form data and ensure form_start_time is included
    const formData = new FormData(event.target);
    
    // Manually set form_start_time if not present
    if (!formData.get('form_start_time') || formData.get('form_start_time') === '') {
      formData.set('form_start_time', String(formStartTime));
    }
    
    // Check if form has expired
    if (isExpired) {
      const Swal = await import('sweetalert2');
      Swal.default.fire({
        icon: 'error',
        title: 'Form Expired',
        text: 'This form has expired for security reasons. Please refresh the page and try again.',
        background: '#1f2937',
        color: '#f3f4f6',
        confirmButtonColor: '#14b8a6',
        confirmButtonText: 'Refresh Page'
      }).then(() => {
        refreshForm();
      });
      return;
    }
    
    // Validate final step before submission
    const finalStep = formValues.inquiryType === 'service' ? 2 : 3;
    if (!validateStep(finalStep)) {
      // Show error toast
      const Swal = await import('sweetalert2');
      Swal.default.fire({
        icon: 'error',
        title: 'Please fix the errors below',
        text: 'Check the highlighted fields and try again.',
        background: '#1f2937',
        color: '#f3f4f6',
        confirmButtonColor: '#14b8a6'
      });
      return;
    }

    isSubmitting = true;

    try {
      // Use the FormData we already created and fixed above
      // (formData is already defined above with form_start_time set)
      
      // Add ReCaptcha token if available
      if (recaptchaToken) {
        formData.set('recaptchaToken', recaptchaToken);
      }

      const response = await fetch('?/contact', {
        method: 'POST',
        body: formData
      });

      const result = deserialize(await response.text());

      if (result.type === 'success') {
        // Show success toast
        const Swal = await import('sweetalert2');
        Swal.default.fire({
          icon: 'success',
          title: 'Message Sent Successfully!',
          text: 'Thanks for reaching out. I\'ll respond within 24-48 hours.',
          background: '#1f2937',
          color: '#f3f4f6',
          confirmButtonColor: '#14b8a6',
          timer: 5000,
          timerProgressBar: true
        });

        // Trigger confetti animation
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#14b8a6', '#0891b2', '#10b981']
        });

        // Reset form to step 1
        currentStep = 1;
        // Reset ReCaptcha
        recaptchaToken = null;
        recaptchaComponent?.reset();

        // Reset form values
        formValues = {
          name: '',
          email: '',
          inquiryType: '',
          serviceNeeded: '',
          budgetRange: '',
          timeline: '',
          projectDetails: '',
          generalMessage: '',
          honeypot: '',
          recaptchaToken: ''
        };

        // Clear any errors
        formErrors = {};
      } else if (result.type === 'failure') {
        const Swal = await import('sweetalert2');
        Swal.default.fire({
          icon: 'error',
          title: 'Message Failed to Send',
          text: result.data?.error || 'Sorry, there was an error. Please try again later.',
          background: '#1f2937',
          color: '#f3f4f6',
          confirmButtonColor: '#14b8a6'
        });

        // Reset ReCaptcha on failure
        recaptchaComponent?.reset();
        recaptchaToken = null;
      } else {
        throw new Error('Unexpected response');
      }
    } catch (error) {
      console.error('Form submission error:', error);

      // Show error toast
      const Swal = await import('sweetalert2');
      Swal.default.fire({
        icon: 'error',
        title: 'Message Failed to Send',
        text: 'Sorry, there was an error sending your message. Please try again later.',
        background: '#1f2937',
        color: '#f3f4f6',
        confirmButtonColor: '#14b8a6'
      });

      // Reset ReCaptcha on error
      recaptchaComponent?.reset();
      recaptchaToken = null;
    } finally {
      isSubmitting = false;
    }
  };

  // Form values state
  let formValues = $state({
    name: '',
    email: '',
    inquiryType: '',
    serviceNeeded: '',
    budgetRange: '',
    timeline: '',
    projectDetails: '',
    generalMessage: '',
    honeypot: '',
    recaptchaToken: ''
  });

  // Form errors state
  let formErrors = $state({});

  // Validation function using Valibot schemas
  const validateField = (field) => {
    try {
      const value = formValues[field];
      
      if (field === 'name' || field === 'email' || field === 'inquiryType') {
        // Use step1Schema to validate individual fields
        const fieldSchema = step1Schema.entries[field];
        v.parse(fieldSchema, value);
        return null;
      } else if (['serviceNeeded', 'budgetRange', 'timeline', 'projectDetails'].includes(field)) {
        // Use step2Schema to validate individual fields
        const fieldSchema = step2Schema.entries[field];
        v.parse(fieldSchema, value);
        return null;
      } else if (field === 'generalMessage') {
        // Use step3Schema to validate individual field
        const fieldSchema = step3Schema.entries[field];
        v.parse(fieldSchema, value);
        return null;
      }
      
      return null;
    } catch (error) {
      // Return the first validation error message
      if (error.issues && error.issues[0]) {
        return error.issues[0].message;
      }
      return error.message || 'Invalid value';
    }
  };

  // Helper function to check if field is valid (returns boolean)
  const isFieldValid = (field) => validateField(field) === null;

  // Validate step using Valibot schemas
  const validateStep = (step) => {
    try {
      let stepData = {};
      let schema;
      
      if (step === 1) {
        stepData = {
          name: formValues.name,
          email: formValues.email,
          inquiryType: formValues.inquiryType
        };
        schema = step1Schema;
      } else if (step === 2) {
        stepData = {
          serviceNeeded: formValues.serviceNeeded,
          budgetRange: formValues.budgetRange,
          timeline: formValues.timeline,
          projectDetails: formValues.projectDetails
        };
        schema = step2Schema;
      } else if (step === 3) {
        stepData = {
          generalMessage: formValues.generalMessage
        };
        schema = step3Schema;
      }
      
      // Parse the data with the appropriate schema
      v.parse(schema, stepData);
      
      // Clear errors if validation passes
      formErrors = {};
      return true;
    } catch (error) {
      // Set field-specific errors from Valibot validation
      const stepErrors = {};
      
      if (error.issues) {
        error.issues.forEach(issue => {
          if (issue.path) {
            const fieldPath = issue.path[0]?.key || issue.path[0];
            if (fieldPath) {
              stepErrors[fieldPath] = issue.message;
            }
          }
        });
      }
      
      formErrors = stepErrors;
      return false;
    }
  };

  // Navigation functions
  const goToNextStep = () => {
    if (currentStep === 1) {
      if (validateStep(1)) {
        // Clear errors and proceed
        formErrors = {};
        // Conditional routing based on inquiry type
        if (formValues.inquiryType === 'general') {
          currentStep = 3;
        } else {
          currentStep = 2;
        }
      }
    } else if (currentStep === 2) {
      if (validateStep(2)) {
        // Clear errors - form is ready for submission
        formErrors = {};
        // For service requests, step 2 goes directly to submission
        return;
      }
    }
  };

  const goToPreviousStep = () => {
    if (currentStep === 3 && formValues.inquiryType === 'general') {
      currentStep = 1;
    } else if (currentStep === 2) {
      currentStep = 1;
    }
  };

  // ReCaptcha handlers
  const handleRecaptchaVerify = (token) => {
    recaptchaToken = token;
  };

  // Real-time field validation on blur
  const handleFieldBlur = (fieldName) => {
    const error = validateField(fieldName);
    if (error) {
      formErrors = { ...formErrors, [fieldName]: error };
    } else {
      // Remove error if field is now valid
      const newErrors = { ...formErrors };
      delete newErrors[fieldName];
      formErrors = newErrors;
    }
  };

  // Clear field error on input
  const handleFieldInput = (fieldName) => {
    if (formErrors[fieldName]) {
      const newErrors = { ...formErrors };
      delete newErrors[fieldName];
      formErrors = newErrors;
    }
  };

  // Check if we need ReCaptcha for this step
  const needsRecaptcha = (step, inquiryType) => {
    return (step === 2 && inquiryType === 'service') || 
           (step === 3 && inquiryType === 'general');
  };

  // Reactive step validation using $derived
  const canProceed = $derived(() => {
    if (currentStep === 1) {
      return formValues.name && formValues.email && formValues.inquiryType;
    } else if (currentStep === 2) {
      const hasRequiredFields = formValues.serviceNeeded && formValues.budgetRange && formValues.timeline && formValues.projectDetails;
      const hasRecaptcha = !needsRecaptcha(currentStep, formValues.inquiryType) || recaptchaToken;
      return hasRequiredFields && hasRecaptcha;
    } else if (currentStep === 3) {
      const hasMessage = formValues.generalMessage;
      const hasRecaptcha = !needsRecaptcha(currentStep, formValues.inquiryType) || recaptchaToken;
      return hasMessage && hasRecaptcha;
    }
    return false;
  });

  // Update total steps based on inquiry type using $effect
  $effect(() => {
    if (formValues.inquiryType) {
      totalSteps = formValues.inquiryType === 'service' ? 2 : 3;
    }
  });
</script>

<div class="multi-step-form">
  <!-- Progress Indicator -->
  <FormProgressIndicator 
    {currentStep} 
    {totalSteps} 
    inquiryType={formValues.inquiryType}
  />

  <!-- Form Expiration Warning -->
  {#if warningLevel !== 'none'}
    <div class="expiration-warning" class:warning-first={warningLevel === 'first'} class:warning-final={warningLevel === 'final'} class:warning-expired={warningLevel === 'expired'}>
      {#if warningLevel === 'expired'}
        <div class="warning-content">
          <iconify-icon icon="mdi:clock-alert" class="warning-icon"></iconify-icon>
          <div class="warning-text">
            <strong>Form Expired</strong>
            <p>This form has expired for security reasons. Please refresh to continue.</p>
          </div>
          <button type="button" onclick={refreshForm} class="refresh-btn">
            <iconify-icon icon="mdi:refresh" class="btn-icon"></iconify-icon>
            Refresh Form
          </button>
        </div>
      {:else if warningLevel === 'final'}
        <div class="warning-content">
          <iconify-icon icon="mdi:timer-alert" class="warning-icon"></iconify-icon>
          <div class="warning-text">
            <strong>Form Expiring Soon!</strong>
            <p>Form expires in {formatTimeRemaining(timeRemaining)}. Save your progress or refresh to extend.</p>
          </div>
          <button type="button" onclick={refreshForm} class="refresh-btn">
            <iconify-icon icon="mdi:refresh" class="btn-icon"></iconify-icon>
            Refresh
          </button>
        </div>
      {:else if warningLevel === 'first'}
        <div class="warning-content">
          <iconify-icon icon="mdi:timer" class="warning-icon"></iconify-icon>
          <div class="warning-text">
            <strong>Form expires in {formatTimeRemaining(timeRemaining)}</strong>
            <p>Complete your submission or refresh the form to extend the session.</p>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Form Steps -->
  <form method="POST" action="?/contact" onsubmit={handleFormSubmit} class="form-container" class:form-expired={isExpired}>
    <!-- Hidden fields for form state persistence -->
    <input type="hidden" name="inquiryType" value={formValues.inquiryType} />
    <input type="hidden" name="name" value={formValues.name} />
    <input type="hidden" name="email" value={formValues.email} />
    
    <!-- Service request fields -->
    {#if formValues.inquiryType === 'service'}
      <input type="hidden" name="serviceNeeded" value={formValues.serviceNeeded} />
      <input type="hidden" name="budgetRange" value={formValues.budgetRange} />
      <input type="hidden" name="timeline" value={formValues.timeline} />
      <input type="hidden" name="projectDetails" value={formValues.projectDetails} />
    {/if}
    
    <!-- General message field -->
    {#if formValues.inquiryType === 'general'}
      <input type="hidden" name="generalMessage" value={formValues.generalMessage} />
    {/if}
    
    {#if currentStep === 1}
      <FormStep1 
        bind:formValues 
        {formErrors} 
        onFieldBlur={handleFieldBlur}
        onFieldInput={handleFieldInput}
      />
    {:else if currentStep === 2 && formValues.inquiryType === 'service'}
      <FormStep2 
        bind:formValues 
        {formErrors} 
        onFieldBlur={handleFieldBlur}
        onFieldInput={handleFieldInput}
      />
      <!-- ReCaptcha for service requests -->
      {#if needsRecaptcha(currentStep, formValues.inquiryType)}
        <ReCaptcha 
          bind:this={recaptchaComponent}
          siteKey={env.PUBLIC_RECAPTCHA_SITE_KEY}
          onVerify={handleRecaptchaVerify}
          theme="dark"
        />
      {/if}
    {:else if currentStep === 3 && formValues.inquiryType === 'general'}
      <FormStep3 
        bind:formValues 
        {formErrors} 
        onFieldBlur={handleFieldBlur}
        onFieldInput={handleFieldInput}
      />
      <!-- ReCaptcha for general messages -->
      {#if needsRecaptcha(currentStep, formValues.inquiryType)}
        <ReCaptcha 
          bind:this={recaptchaComponent}
          siteKey={env.PUBLIC_RECAPTCHA_SITE_KEY}
          onVerify={handleRecaptchaVerify}
          theme="dark"
        />
      {/if}
    {/if}

    <!-- Anti-spam honeypot (multiple techniques) -->
    <div class="honeypot-container">
      <label for="website_url" class="honeypot-label">Please leave this field blank</label>
      <input 
        type="text" 
        id="website_url"
        name="honeypot" 
        bind:value={formValues.honeypot}
        class="honeypot-field"
        autocomplete="off"
        tabindex="-1"
        aria-hidden="true"
        placeholder=""
      />
    </div>
    
    <!-- Time-based validation -->
    <input type="hidden" name="form_start_time" value={String(formStartTime)} />

    <!-- Navigation Buttons -->
    <div class="form-navigation">
      <!-- Back Button -->
      {#if currentStep > 1}
        <button
          type="button"
          class="btn btn-secondary"
          onclick={goToPreviousStep}
          disabled={isSubmitting}
        >
          <iconify-icon icon="mdi:arrow-left" class="btn-icon"></iconify-icon>
          Back
        </button>
      {:else}
        <div></div>
      {/if}

      <!-- Next/Submit Button -->
      <div class="btn-group">
        {#if (currentStep === 1) || (currentStep === 2 && formValues.inquiryType === 'service' && currentStep < totalSteps)}
          <button
            type="button"
            class="btn btn-primary"
            onclick={goToNextStep}
            disabled={!canProceed || isSubmitting}
          >
            Next
            <iconify-icon icon="mdi:arrow-right" class="btn-icon"></iconify-icon>
          </button>
        {:else}
          <button
            type="submit"
            class="btn btn-primary"
            disabled={!canProceed || isSubmitting}
          >
            {#if isSubmitting}
              <iconify-icon icon="mdi:loading" class="btn-icon animate-spin"></iconify-icon>
              Sending...
            {:else}
              <iconify-icon icon="mdi:send" class="btn-icon"></iconify-icon>
              Send Message
            {/if}
          </button>
        {/if}
      </div>
    </div>
  </form>
</div>

<style>
  .multi-step-form {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
  }

  .form-container {
    background: rgba(17, 24, 39, 0.8);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(75, 85, 99, 0.2);
    border-radius: 1rem;
    padding: 2rem;
    margin-top: 2rem;
  }

  .form-navigation {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(75, 85, 99, 0.2);
  }

  .btn-group {
    display: flex;
    gap: 0.75rem;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 0.5rem;
    border: none;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    text-decoration: none;
    white-space: nowrap;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .btn-primary {
    background: linear-gradient(135deg, #14b8a6, #0891b2);
    color: white;
    box-shadow: 0 4px 6px -1px rgba(20, 184, 166, 0.3);
  }

  .btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #0f766e, #0e7490);
    box-shadow: 0 6px 8px -1px rgba(20, 184, 166, 0.4);
    transform: translateY(-1px);
  }

  .btn-secondary {
    background: rgba(75, 85, 99, 0.3);
    color: #d1d5db;
    border: 1px solid rgba(75, 85, 99, 0.5);
  }

  .btn-secondary:hover:not(:disabled) {
    background: rgba(75, 85, 99, 0.5);
    color: #f3f4f6;
    transform: translateY(-1px);
  }

  .btn-icon {
    font-size: 1rem;
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Mobile responsiveness */
  @media (max-width: 640px) {
    .multi-step-form {
      padding: 1rem;
    }

    .form-container {
      padding: 1.5rem;
    }

    .form-navigation {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .btn {
      padding: 0.875rem 1.25rem;
      justify-content: center;
    }

    .btn-group {
      width: 100%;
      justify-content: center;
    }
  }

  /* Honeypot protection styles */
  .honeypot-container {
    position: absolute;
    left: -9999px;
    top: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  .honeypot-label {
    position: absolute;
    left: -9999px;
    top: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  .honeypot-field {
    position: absolute;
    left: -9999px;
    top: -9999px;
    width: 1px;
    height: 1px;
    border: 0;
    background: transparent;
    color: transparent;
    font-size: 0;
    line-height: 0;
    outline: none;
    box-shadow: none;
  }

  /* Form expiration warning styles */
  .expiration-warning {
    margin-bottom: 1.5rem;
    border-radius: 0.75rem;
    border: 1px solid;
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .warning-first {
    background: rgba(245, 158, 11, 0.1);
    border-color: rgba(245, 158, 11, 0.3);
    color: #f59e0b;
  }

  .warning-final {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }

  .warning-expired {
    background: rgba(220, 38, 38, 0.15);
    border-color: rgba(220, 38, 38, 0.4);
    color: #dc2626;
  }

  .warning-content {
    display: flex;
    align-items: center;
    padding: 1rem;
    gap: 1rem;
  }

  .warning-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .warning-text {
    flex: 1;
  }

  .warning-text strong {
    display: block;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .warning-text p {
    margin: 0;
    font-size: 0.875rem;
    opacity: 0.9;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 0.5rem;
    color: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .refresh-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  .refresh-btn .btn-icon {
    font-size: 1rem;
  }

  /* Form disabled state when expired */
  .form-expired {
    pointer-events: none;
    opacity: 0.6;
    position: relative;
  }

  .form-expired::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 0.75rem;
    z-index: 10;
  }

  /* Responsive adjustments for warnings */
  @media (max-width: 768px) {
    .warning-content {
      flex-direction: column;
      text-align: center;
      gap: 0.75rem;
    }

    .warning-icon {
      font-size: 2rem;
    }

    .refresh-btn {
      align-self: stretch;
      justify-content: center;
    }
  }
</style>