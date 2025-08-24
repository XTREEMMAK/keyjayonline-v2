<script>
	import { fade, fly } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	
	let {
		item,
		itemType = 'album',
		minimumPrice = 5,
		onClose = () => {},
		onSuccess = () => {}
	} = $props();
	
	let selectedAmount = $state(minimumPrice);
	let customAmount = $state('');
	let isProcessing = $state(false);
	let error = $state('');
	
	const presetAmounts = [
		minimumPrice,
		Math.max(10, minimumPrice),
		Math.max(25, minimumPrice),
		Math.max(50, minimumPrice)
	];
	
	function selectAmount(amount) {
		selectedAmount = amount;
		customAmount = '';
	}
	
	function handleCustomAmount(e) {
		const value = parseFloat(e.target.value);
		if (!isNaN(value) && value >= minimumPrice) {
			selectedAmount = value;
		}
	}
	
	async function processPayment() {
		if (selectedAmount < minimumPrice) {
			error = `Minimum amount is $${minimumPrice}`;
			return;
		}
		
		isProcessing = true;
		error = '';
		
		try {
			const response = await fetch('/api/create-payment-intent', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					item_type: itemType,
					item_id: item.id,
					amount: selectedAmount * 100,
					minimum_amount: minimumPrice * 100
				})
			});
			
			if (!response.ok) {
				throw new Error('Payment failed');
			}
			
			const data = await response.json();
			
			onSuccess(data);
			onClose();
		} catch (err) {
			error = 'Payment processing failed. Please try again.';
		} finally {
			isProcessing = false;
		}
	}
</script>

<div 
	class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
	onclick={onClose}
	transition:fade={{ duration: 200 }}
>
	<div 
		class="relative w-full max-w-md bg-gray-900 rounded-2xl p-6"
		onclick={(e) => e.stopPropagation()}
		transition:fly={{ y: 50, duration: 300 }}
	>
		<button 
			onclick={onClose}
			class="absolute top-4 right-4 p-2 hover:bg-gray-800 rounded-full transition-colors"
		>
			<Icon icon="mdi:close" width={20} height={20} class="text-gray-400" />
		</button>
		
		<div class="text-center mb-6">
			<Icon icon="mdi:heart" width={48} height={48} class="text-red-500 mx-auto mb-3" />
			<h3 class="text-2xl font-bold text-white mb-2">Support the Artist</h3>
			<p class="text-gray-400">
				Pay what you want for "{item.title}"
			</p>
			<p class="text-gray-500 text-sm mt-1">
				Minimum: ${minimumPrice}
			</p>
		</div>
		
		<div class="space-y-4 mb-6">
			<div class="grid grid-cols-2 gap-3">
				{#each presetAmounts as amount}
					<button 
						onclick={() => selectAmount(amount)}
						class="p-3 rounded-lg border-2 transition-all {
							selectedAmount === amount 
								? 'bg-blue-600/20 border-blue-600 text-blue-400' 
								: 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
						}"
					>
						${amount}
					</button>
				{/each}
			</div>
			
			<div class="relative">
				<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
				<input 
					type="number"
					min={minimumPrice}
					step="1"
					placeholder="Custom amount"
					value={customAmount}
					oninput={handleCustomAmount}
					class="w-full pl-8 pr-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-600 focus:outline-none"
				/>
			</div>
		</div>
		
		{#if error}
			<div class="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm">
				{error}
			</div>
		{/if}
		
		<div class="bg-gray-800/50 rounded-lg p-4 mb-6">
			<div class="flex justify-between items-center">
				<span class="text-gray-400">Your contribution:</span>
				<span class="text-2xl font-bold text-white">${selectedAmount}</span>
			</div>
		</div>
		
		<button 
			onclick={processPayment}
			disabled={isProcessing || selectedAmount < minimumPrice}
			class="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{#if isProcessing}
				<Icon icon="mdi:loading" width={20} height={20} class="inline animate-spin mr-2" />
				Processing...
			{:else}
				Continue to Payment
			{/if}
		</button>
		
		<p class="text-center text-gray-500 text-xs mt-4">
			Secure payment powered by Stripe
		</p>
	</div>
</div>