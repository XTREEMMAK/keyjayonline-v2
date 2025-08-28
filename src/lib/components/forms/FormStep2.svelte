<script>
  import { fieldConfigs } from '$lib/schemas/contactForm.js';
  
  let { formValues, formErrors, onFieldBlur, onFieldInput } = $props();
  
  let projectDetailsTextarea = $state();
  
  // Auto-resize textarea function
  const autoResizeTextarea = (textarea) => {
    if (!textarea) return;
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate new height based on content
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 100), 400); // Min 100px, Max 400px
    
    // Apply new height with smooth transition
    textarea.style.height = newHeight + 'px';
  };
  
  // Handle textarea input with auto-resize
  const handleTextareaInput = (field) => {
    if (field === 'projectDetails') {
      autoResizeTextarea(projectDetailsTextarea);
    }
    onFieldInput?.(field);
  };

  // Service options
  const serviceOptions = [
    { value: 'music-production', label: 'Music Production' },
    { value: 'voice-over', label: 'Voice-Over' },
    { value: 'gaming-content', label: 'Gaming Content' },
    { value: 'technical-consulting', label: 'Technical Consulting' },
    { value: 'creative-direction', label: 'Creative Direction' },
    { value: 'other', label: 'Other' }
  ];

  // Budget range options
  const budgetOptions = [
    { value: 'under-500', label: 'Under $500' },
    { value: '500-1000', label: '$500 - $1,000' },
    { value: '1000-2500', label: '$1,000 - $2,500' },
    { value: '2500-5000', label: '$2,500 - $5,000' },
    { value: '5000-10000', label: '$5,000 - $10,000' },
    { value: '10000-plus', label: '$10,000+' },
    { value: 'lets-discuss', label: "Let's discuss" }
  ];

  // Timeline options
  const timelineOptions = [
    { value: 'asap', label: 'ASAP' },
    { value: 'within-1-week', label: 'Within 1 week' },
    { value: 'within-2-weeks', label: 'Within 2 weeks' },
    { value: 'within-1-month', label: 'Within 1 month' },
    { value: 'within-3-months', label: 'Within 3 months' },
    { value: 'no-rush', label: 'No rush' },
    { value: 'flexible', label: 'Flexible' }
  ];
</script>

<div class="form-step">
  <div class="step-content">
    <!-- Service Needed Field -->
    <div class="form-group">
      <label for="serviceNeeded" class="form-label">
        {fieldConfigs.serviceNeeded.label}
        <span class="text-red-400">*</span>
      </label>
      <select
        id="serviceNeeded"
        name="serviceNeeded"
        class="form-select"
        class:error={formErrors.serviceNeeded}
        bind:value={formValues.serviceNeeded}
        onchange={() => onFieldBlur?.('serviceNeeded')}
        required
      >
        <option value="">Select a service...</option>
        {#each serviceOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      {#if formErrors.serviceNeeded}
        <p class="error-message">{formErrors.serviceNeeded}</p>
      {/if}
      <p class="help-text">{fieldConfigs.serviceNeeded.helpText}</p>
    </div>

    <!-- Budget Range Field -->
    <div class="form-group">
      <label for="budgetRange" class="form-label">
        {fieldConfigs.budgetRange.label}
        <span class="text-red-400">*</span>
      </label>
      <select
        id="budgetRange"
        name="budgetRange"
        class="form-select"
        class:error={formErrors.budgetRange}
        bind:value={formValues.budgetRange}
        onchange={() => onFieldBlur?.('budgetRange')}
        required
      >
        <option value="">Select budget range...</option>
        {#each budgetOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      {#if formErrors.budgetRange}
        <p class="error-message">{formErrors.budgetRange}</p>
      {/if}
      <p class="help-text">{fieldConfigs.budgetRange.helpText}</p>
    </div>

    <!-- Timeline Field -->
    <div class="form-group">
      <label for="timeline" class="form-label">
        {fieldConfigs.timeline.label}
        <span class="text-red-400">*</span>
      </label>
      <select
        id="timeline"
        name="timeline"
        class="form-select"
        class:error={formErrors.timeline}
        bind:value={formValues.timeline}
        onchange={() => onFieldBlur?.('timeline')}
        required
      >
        <option value="">Select timeline...</option>
        {#each timelineOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      {#if formErrors.timeline}
        <p class="error-message">{formErrors.timeline}</p>
      {/if}
      <p class="help-text">{fieldConfigs.timeline.helpText}</p>
    </div>

    <!-- Project Details Field -->
    <div class="form-group">
      <label for="projectDetails" class="form-label">
        {fieldConfigs.projectDetails.label}
        <span class="text-red-400">*</span>
      </label>
      <textarea
        bind:this={projectDetailsTextarea}
        id="projectDetails"
        name="projectDetails"
        class="form-textarea auto-resize"
        class:error={formErrors.projectDetails}
        placeholder={fieldConfigs.projectDetails.placeholder}
        bind:value={formValues.projectDetails}
        onblur={() => onFieldBlur?.('projectDetails')}
        oninput={() => handleTextareaInput('projectDetails')}
        onfocus={() => autoResizeTextarea(projectDetailsTextarea)}
        rows="4"
        required
      ></textarea>
      {#if formErrors.projectDetails}
        <p class="error-message">{formErrors.projectDetails}</p>
      {/if}
      <p class="help-text">{fieldConfigs.projectDetails.helpText}</p>
    </div>
  </div>
</div>

<style>
  .form-step {
    min-height: 500px;
    display: flex;
    flex-direction: column;
  }

  .step-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #f3f4f6;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .form-select,
  .form-textarea {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid rgba(75, 85, 99, 0.3);
    border-radius: 0.5rem;
    background-color: rgba(31, 41, 55, 0.5);
    color: #f3f4f6;
    font-size: 0.875rem;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(10px);
  }

  .form-textarea {
    resize: vertical;
    min-height: 100px;
    font-family: inherit;
    line-height: 1.5;
    transition: height 0.2s ease;
  }
  
  .form-textarea.auto-resize {
    resize: none; /* Disable manual resize for auto-resize textareas */
    overflow-y: hidden; /* Hide scrollbar since we auto-resize */
  }

  .form-select:focus,
  .form-textarea:focus {
    outline: none;
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
    background-color: rgba(31, 41, 55, 0.7);
  }

  .form-textarea::placeholder {
    color: #9ca3af;
  }

  .form-select.error,
  .form-textarea.error {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }

  .error-message {
    font-size: 0.75rem;
    color: #fca5a5;
    margin: 0;
  }

  .help-text {
    font-size: 0.75rem;
    color: #9ca3af;
    margin: 0;
    line-height: 1.4;
  }

  /* Mobile responsiveness */
  @media (max-width: 640px) {
    .step-content {
      gap: 1.25rem;
    }

    .form-select,
    .form-textarea {
      padding: 0.625rem 0.875rem;
    }

    .form-textarea {
      min-height: 80px;
    }
  }
</style>