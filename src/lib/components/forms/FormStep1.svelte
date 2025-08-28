<script>
  import { fieldConfigs } from '$lib/schemas/contactForm.js';
  
  let { formValues, formErrors, onFieldBlur, onFieldInput } = $props();

  // Inquiry type options
  const inquiryTypeOptions = [
    { value: 'general', label: 'General Message' },
    { value: 'service', label: 'Service Request' }
  ];
</script>

<div class="form-step">
  <div class="step-content">
    <!-- Name Field -->
    <div class="form-group">
      <label for="name" class="form-label">
        {fieldConfigs.name.label}
        <span class="text-red-400">*</span>
      </label>
      <input
        id="name"
        name="name"
        type="text"
        class="form-input"
        class:error={formErrors.name}
        placeholder={fieldConfigs.name.placeholder}
        bind:value={formValues.name}
        onblur={() => onFieldBlur?.('name')}
        oninput={() => onFieldInput?.('name')}
        required
      />
      {#if formErrors.name}
        <p class="error-message">{formErrors.name}</p>
      {/if}
      <p class="help-text">{fieldConfigs.name.helpText}</p>
    </div>

    <!-- Email Field -->
    <div class="form-group">
      <label for="email" class="form-label">
        {fieldConfigs.email.label}
        <span class="text-red-400">*</span>
      </label>
      <input
        id="email"
        name="email"
        type="email"
        class="form-input"
        class:error={formErrors.email}
        placeholder={fieldConfigs.email.placeholder}
        bind:value={formValues.email}
        onblur={() => onFieldBlur?.('email')}
        oninput={() => onFieldInput?.('email')}
        required
      />
      {#if formErrors.email}
        <p class="error-message">{formErrors.email}</p>
      {/if}
      <p class="help-text">{fieldConfigs.email.helpText}</p>
    </div>

    <!-- Inquiry Type Field -->
    <div class="form-group">
      <label for="inquiryType" class="form-label">
        {fieldConfigs.inquiryType.label}
        <span class="text-red-400">*</span>
      </label>
      <select
        id="inquiryType"
        name="inquiryType"
        class="form-select"
        class:error={formErrors.inquiryType}
        bind:value={formValues.inquiryType}
        onchange={() => onFieldBlur?.('inquiryType')}
        required
      >
        <option value="">Select inquiry type...</option>
        {#each inquiryTypeOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      {#if formErrors.inquiryType}
        <p class="error-message">{formErrors.inquiryType}</p>
      {/if}
      <p class="help-text">{fieldConfigs.inquiryType.helpText}</p>
    </div>
  </div>
</div>

<style>
  .form-step {
    min-height: 400px;
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

  .form-input,
  .form-select {
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

  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
    background-color: rgba(31, 41, 55, 0.7);
  }

  .form-input::placeholder {
    color: #9ca3af;
  }

  .form-input.error,
  .form-select.error {
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

    .form-input,
    .form-select {
      padding: 0.625rem 0.875rem;
    }
  }
</style>