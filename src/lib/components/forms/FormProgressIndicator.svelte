<script>
  let {
    currentStep,
    totalSteps,
    inquiryType = 'service'
  } = $props();

  // Calculate step labels based on inquiry type
  const getStepLabels = (type) => {
    const baseLabels = ['Contact Info'];
    
    if (type === 'service') {
      return [...baseLabels, 'Service Details', 'Submit'];
    } else {
      return [...baseLabels, 'Your Message', 'Submit'];
    }
  };

  const stepLabels = $derived(getStepLabels(inquiryType));
  const progressPercentage = $derived((currentStep / totalSteps) * 100);
</script>

<div class="form-progress-container mb-8">
  <!-- Progress Bar -->
  <div class="progress-bar-container mb-6">
    <div class="progress-bar-track">
      <div 
        class="progress-bar-fill"
        style="width: {progressPercentage}%"
      ></div>
    </div>
  </div>

  <!-- Step Indicators -->
  <div class="step-indicators">
    {#each stepLabels as label, index}
      {@const stepNumber = index + 1}
      {@const isActive = stepNumber === currentStep}
      {@const isCompleted = stepNumber < currentStep}
      {@const isUpcoming = stepNumber > currentStep}

      <div class="step-indicator">
        <!-- Step Circle -->
        <div 
          class="step-circle"
          class:active={isActive}
          class:completed={isCompleted}
          class:upcoming={isUpcoming}
        >
          {#if isCompleted}
            <iconify-icon icon="mdi:check" class="step-icon"></iconify-icon>
          {:else}
            <span class="step-number">{stepNumber}</span>
          {/if}
        </div>

        <!-- Step Label -->
        <div 
          class="step-label"
          class:active={isActive}
          class:completed={isCompleted}
          class:upcoming={isUpcoming}
        >
          {label}
        </div>

        <!-- Connector Line -->
        {#if index < stepLabels.length - 1}
          <div 
            class="step-connector"
            class:completed={stepNumber < currentStep}
          ></div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Step Description -->
  <div class="step-description mt-4">
    {#if currentStep === 1}
      <p class="text-gray-400 text-sm text-center">
        Let's start with your basic contact information
      </p>
    {:else if currentStep === 2 && inquiryType === 'service'}
      <p class="text-gray-400 text-sm text-center">
        Tell us about your service requirements and timeline
      </p>
    {:else if currentStep === 2 && inquiryType === 'general'}
      <p class="text-gray-400 text-sm text-center">
        Share your message, question, or feedback with us
      </p>
    {:else if currentStep === 3}
      <p class="text-gray-400 text-sm text-center">
        Review and submit your inquiry
      </p>
    {/if}
  </div>
</div>

<style>
  .form-progress-container {
    max-width: 600px;
    margin: 0 auto;
  }

  .progress-bar-container {
    position: relative;
    padding: 0 20px;
  }

  .progress-bar-track {
    height: 4px;
    background-color: rgba(107, 114, 128, 0.3);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #14b8a6, #0891b2);
    border-radius: 2px;
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .step-indicators {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
  }

  .step-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    flex: 1;
  }

  .step-circle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 10;
  }

  .step-circle.upcoming {
    background-color: rgba(107, 114, 128, 0.2);
    border: 2px solid rgba(107, 114, 128, 0.4);
    color: #9ca3af;
  }

  .step-circle.active {
    background: linear-gradient(135deg, #14b8a6, #0891b2);
    border: 2px solid transparent;
    color: white;
    box-shadow: 0 0 20px rgba(20, 184, 166, 0.4);
    transform: scale(1.1);
  }

  .step-circle.completed {
    background: linear-gradient(135deg, #10b981, #059669);
    border: 2px solid transparent;
    color: white;
  }

  .step-icon {
    font-size: 1.2rem;
  }

  .step-number {
    font-size: 0.875rem;
    font-weight: 600;
  }

  .step-label {
    margin-top: 8px;
    font-size: 0.75rem;
    font-weight: 500;
    text-align: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
  }

  .step-label.upcoming {
    color: #9ca3af;
  }

  .step-label.active {
    color: #14b8a6;
    font-weight: 600;
  }

  .step-label.completed {
    color: #10b981;
  }

  .step-connector {
    position: absolute;
    top: 20px;
    left: 50%;
    right: -50%;
    height: 2px;
    background-color: rgba(107, 114, 128, 0.3);
    z-index: 1;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .step-connector.completed {
    background: linear-gradient(90deg, #10b981, #14b8a6);
  }

  .step-description {
    min-height: 20px;
  }

  /* Mobile responsiveness */
  @media (max-width: 640px) {
    .step-circle {
      width: 32px;
      height: 32px;
      font-size: 0.75rem;
    }

    .step-label {
      font-size: 0.65rem;
      margin-top: 6px;
    }

    .step-connector {
      top: 16px;
    }

    .form-progress-container {
      padding: 0 8px;
    }

    .progress-bar-container {
      padding: 0 12px;
    }
  }

  /* Extra small screens */
  @media (max-width: 480px) {
    .step-label {
      display: none;
    }

    .step-description {
      margin-top: 16px;
    }
  }
</style>