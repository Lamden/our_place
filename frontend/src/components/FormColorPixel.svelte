<script>
    import { getContext, onMount } from 'svelte'
	import { showModal } from '../js/stores.js'
	import { createSnack } from '../js/utils.js'

    const { sendTransaction } = getContext('app_functions')

    const changeColor = () => {
    	const xPos = $showModal.modalData.event.xPos
		const yPos = $showModal.modalData.event.yPos

		const transaction = {
			methodName: 'colorPixel',
			networkType: 'testnet',
			stampLimit: 100000,
			kwargs: {
				x: parseInt(xPos),
				y: parseInt(yPos),
				color: 'A00'
			}
		}

		sendTransaction(transaction)

		createSnack(
			`Coloring Pixel!`,
			"You will get a 'Transaction Comfirm' popup from the Wallet if you have not set a pre-approval.",
			"info"
		)

        showModal.set({modalData:{}, show: false})
    }
</script>

<style>
	.flex-row{
		align-items: center;
		justify-content: space-evenly;
		height: 100%;
	}
	.button_text{
		margin-top: 2rem;
		color: white;
	}
	.outlined:hover{
		color: #ff5bb0;
	}
</style>

<div class="flex-row">
	{#if $showModal.modalData.event}
		<form id="changeColor" class="flex-col" on:submit|preventDefault={changeColor}>
			<label for="x">X Position</label>
			<input id="x" type="text" bind:value={$showModal.modalData.event.xPos}/>
			<label for="y">Y Position</label>
			<input id="y" type="text" bind:value={$showModal.modalData.event.yPos}/>
			<input
				type="submit"
				class="button_text outlined"
				value={`Change ${$showModal.modalData.event.xPos},${$showModal.modalData.event.yPos} Color`}
				form="changeColor"
			/>
		</form>
	{/if}
</div>
