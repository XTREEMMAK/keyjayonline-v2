<script>
  import { fieldConfigs } from '$lib/schemas/contactForm.js';
  
  let { formValues, formErrors, onFieldBlur, onFieldInput } = $props();
  
  let generalMessageTextarea = $state();
  
  // Auto-resize textarea function
  const autoResizeTextarea = (textarea) => {
    if (!textarea) return;
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate new height based on content  
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 150), 500); // Min 150px, Max 500px (larger for general message)
    
    // Apply new height with smooth transition
    textarea.style.height = newHeight + 'px';
  };
  
  // Handle textarea input with auto-resize
  const handleTextareaInput = (field) => {
    if (field === 'generalMessage') {
      autoResizeTextarea(generalMessageTextarea);
    }
    onFieldInput?.(field);
  };
</script>

<div class="form-step">
  <div class="step-content">
    <!-- General Message Field -->
    <div class="form-group">
      <label for="generalMessage" class="form-label">
        {fieldConfigs.generalMessage.label}
        <span class="text-red-400">*</span>
      </label>
      <textarea
        bind:this={generalMessageTextarea}
        id="generalMessage"
        name="generalMessage"
        class="form-textarea large auto-resize"
        class:error={formErrors.generalMessage}
        placeholder={fieldConfigs.generalMessage.placeholder}
        bind:value={formValues.generalMessage}
        onblur={() => onFieldBlur?.('generalMessage')}
        oninput={() => handleTextareaInput('generalMessage')}
        onfocus={() => autoResizeTextarea(generalMessageTextarea)}
        rows="6"
        required
      ></textarea>
      {#if formErrors.generalMessage}
        <p class="error-message">{formErrors.generalMessage}</p>
      {/if}
      <p class="help-text">{fieldConfigs.generalMessage.helpText}</p>
    </div>

    <!-- Character counter -->
    <div class="character-counter">
      <span class="counter-text">
        {(formValues.generalMessage?.length || 0)} / 2000 characters
      </span>
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
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }

  .form-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #f3f4f6;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

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
    resize: vertical;
    min-height: 150px;
    font-family: inherit;
    line-height: 1.5;
  }

  .form-textarea.auto-resize {
    resize: none;
    overflow-y: hidden;
    transition: height 0.2s ease;
  }

  .form-textarea.large {
    min-height: 200px;
    flex: 1;
  }

  .form-textarea:focus {
    outline: none;
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
    background-color: rgba(31, 41, 55, 0.7);
  }

  .form-textarea::placeholder {
    color: #9ca3af;
  }

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

  .character-counter {
    display: flex;
    justify-content: flex-end;
    margin-top: -0.5rem;
  }

  .counter-text {
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
  }

  /* Mobile responsiveness */
  @media (max-width: 640px) {
    .form-textarea {
      padding: 0.625rem 0.875rem;
      min-height: 120px;
    }

    .form-textarea.large {
      min-height: 160px;
    }
  }
</style>