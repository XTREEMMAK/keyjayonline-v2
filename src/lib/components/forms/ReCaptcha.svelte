<script>
  import { onMount } from 'svelte';

  let { siteKey } = $props();
  let ready = $state(false);

  onMount(() => {
    if (!siteKey) return;

    // Check if Enterprise script already loaded
    if (window.grecaptcha?.enterprise) {
      window.grecaptcha.enterprise.ready(() => { ready = true; });
      return;
    }

    // Load reCAPTCHA Enterprise script (score-based, invisible)
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`;
    script.async = true;

    script.onload = () => {
      window.grecaptcha.enterprise.ready(() => { ready = true; });
    };

    script.onerror = () => {
      console.error('Failed to load reCAPTCHA Enterprise script');
    };

    document.head.appendChild(script);
  });

  /**
   * Execute reCAPTCHA Enterprise and return a token.
   * Call this on form submit — invisible, no user interaction.
   * @param {string} action - The action name (must match server-side expectedAction)
   * @returns {Promise<string|null>} The reCAPTCHA token, or null on error
   */
  async function execute(action = 'contact_submit') {
    if (!ready || !window.grecaptcha?.enterprise) return null;
    try {
      return await window.grecaptcha.enterprise.execute(siteKey, { action });
    } catch (error) {
      console.error('reCAPTCHA Enterprise execute error:', error);
      return null;
    }
  }

  export { execute };
</script>

<!-- No visible UI — score-based reCAPTCHA Enterprise is invisible -->
