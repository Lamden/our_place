<script context="module">
	export async function preload() {
		const res = await this.fetch(`index.json`);
		const data = await res.json()
		return {pixels: data.place, timestamp: data.timestamp}
	}

</script>

<script>
	import { onMount } from 'svelte'
	import FrameCanvas from "../components/FrameCanvas.svelte";
	import FormColorPixel from "../components/FormColorPixel.svelte";
	import { splice } from 'underscore.string'
	import { showModal } from '../js/stores'
	import { createSnack } from '../js/utils'

	export let pixels;
	export let timestamp;

	onMount(() => {
		console.log({pixels})
		updateLastUpdate(timestamp)
		let updater = setInterval(update, 800)
		return(() => clearInterval(updater))
	})

	const update = async () => {
		const res = await fetch(`update.json?timestamp=${localStorage.getItem("lastUpdate")}`);
		const data = await res.json()
		if (data.updates.length > 0) {
			updateLastUpdate(data.timestamp)
			processUpdates(data.updates)
		}
	}

	const processUpdates = (updates) => {
		let newPixels = new String(pixels)
		updates.forEach(update => {
			console.log(update)
			let xPos = Number(update.x) * 3
			let yMod = Number(update.y) * 3000
			let startingPos = xPos + yMod
			console.log({xPos, yMod, startingPos})
			newPixels = splice(pixels, startingPos, 3, update.color)
			console.log(newPixels.substring(startingPos, startingPos + 3))

			createSnack(
				"Pixel Updated",
				`${update.x},${update.y} now #${update.color}`,
				'success'
			)
		})
		pixels = newPixels

	}

	const updateLastUpdate = (timestamp) => {
		localStorage.setItem('lastUpdate', timestamp.toString())
	}

	const handleClick = (e) => {
		showModal.set({modalData:{event: e.detail, modal: FormColorPixel}, show: true})
	}


</script>
<style>

</style>

<svelte:head>
	<title>Our Place</title>
</svelte:head>

<FrameCanvas {pixels} on:pixel_click={handleClick}/>
