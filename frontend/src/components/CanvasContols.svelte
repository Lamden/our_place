<script>
    import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();


</script>

<style>
    .controls{
        position: fixed;
        bottom: 0;
        left: 0;
        z-index: 100;

    }
    .zoom-button{
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 2em;
        background: #333333;
        border-bottom: 99px;
        width: 50px;
        height: 50px;
    }
</style>

<div class="controls">
<div class="flex-row">
    <button class="zoom-button" on:click={() => dispatch("zoomIn")}>+</button>
    <button class="zoom-button" on:click={() => dispatch("zoomOut")}>-</button>
</div>

</div>