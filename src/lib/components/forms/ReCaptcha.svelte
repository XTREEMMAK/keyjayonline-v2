<script>
  import { onMount } from 'svelte';
  
  let { onVerify, siteKey, theme = 'dark' } = $props();
  
  let recaptchaContainer = $state(null);
  let widgetId;
  let isLoaded = $state(false);

  // ReCaptcha callback functions
  const verifyCallback = (token) => {
    onVerify?.(token);
  };

  const expiredCallback = () => {
    onVerify?.(null);
  };

  const errorCallback = () => {
    console.error('ReCaptcha error occurred');
    onVerify?.(null);
  };

  // Load ReCaptcha script and render widget
  onMount(() => {
    // Skip if no site key provided
    if (!siteKey) {
      console.warn('ReCaptcha site key not provided');
      return;
    }

    // Check if script already loaded
    if (window.grecaptcha) {
      renderRecaptcha();
      return;
    }

    // Load ReCaptcha script
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
    script.async = true;
    script.defer = true;

    // Global callback for when ReCaptcha loads
    window.onRecaptchaLoad = () => {
      isLoaded = true;
      renderRecaptcha();
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (widgetId !== undefined && window.grecaptcha) {
        try {
          window.grecaptcha.reset(widgetId);
        } catch (error) {
          console.warn('Error resetting ReCaptcha:', error);
        }
      }
    };
  });

  const renderRecaptcha = () => {
    if (!recaptchaContainer || !window.grecaptcha || !siteKey) return;

    try {
      widgetId = window.grecaptcha.render(recaptchaContainer, {
        sitekey: siteKey,
        theme: theme,
        callback: verifyCallback,
        'expired-callback': expiredCallback,
        'error-callback': errorCallback
      });
    } catch (error) {
      console.error('Error rendering ReCaptcha:', error);
    }
  };

  // Public methods
  const reset = () => {
    if (widgetId !== undefined && window.grecaptcha) {
      try {
        window.grecaptcha.reset(widgetId);
      } catch (error) {
        console.warn('Error resetting ReCaptcha:', error);
      }
    }
  };

  const execute = () => {
    if (widgetId !== undefined && window.grecaptcha) {
      try {
        window.grecaptcha.execute(widgetId);
      } catch (error) {
        console.warn('Error executing ReCaptcha:', error);
      }
    }
  };

  // Export methods for parent component
  export { reset, execute };
</script>

{#if siteKey}
  <div class="recaptcha-wrapper">
    <div bind:this={recaptchaContainer} class="recaptcha-container"></div>
    {#if !isLoaded}
      <div class="recaptcha-loading">
        <iconify-icon icon="mdi:loading" class="loading-icon"></iconify-icon>
        <span>Loading ReCaptcha...</span>
      </div>
    {/if}
  </div>
{:else}
  <div class="recaptcha-disabled">
    <p class="text-sm text-gray-400">
      ReCaptcha is not configured for this environment
    </p>
  </div>
{/if}

<style>
  .recaptcha-wrapper {
    position: relative;
    display: flex;
    justify-content: center;
    margin: 1rem 0;
  }

  .recaptcha-container {
    min-height: 78px; /* Standard ReCaptcha height */
  }

  .recaptcha-loading {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background-color: rgba(31, 41, 55, 0.8);
    border-radius: 0.25rem;
    color: #9ca3af;
    font-size: 0.875rem;
  }

  .loading-icon {
    animation: spin 1s linear infinite;
    font-size: 1rem;
  }

  .recaptcha-disabled {
    display: flex;
    justify-content: center;
    padding: 1rem;
    margin: 1rem 0;
    background-color: rgba(75, 85, 99, 0.1);
    border: 1px dashed rgba(75, 85, 99, 0.3);
    border-radius: 0.5rem;
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
    .recaptcha-wrapper {
      margin: 0.75rem 0;
    }
  }
</style>