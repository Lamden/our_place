<script>
    import { onMount, afterUpdate } from 'svelte'
    import CanvasContols from './CanvasContols.svelte'

    import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

    export let id;
    export let pixels;
    export let pixelSize = 1;

    let canvasElm;
    let drawing = false;

    onMount(() => {
        handleResize();
        drawPlace(15)
    })
    afterUpdate(() => drawPlace(1))

    const getColor = (x, y) => {
        let xPos = x * 3
        let yMod = (y * 3) * 4
        let startingPos = xPos + yMod
        return pixels.substring(startingPos, startingPos + 3)
    }

    const drawPlace = (scale) => {
        console.log(pixels.substring(1000, 1009))
        if (!pixels || !canvasElm) return
        let ctx = canvasElm.getContext('2d')
        ctx.clearRect(0, 0, canvasElm.width, canvasElm.height);
        ctx.scale(scale, scale)

        console.log('drawing')
        for (let index = 0; index <= 299999; index = index + 3){
            ctx.fillStyle = `#${pixels.substring(index, index + 3)}`;
            let y = Math.floor(index / 2997)
            let x = Math.floor((index - (y*2997) ) /3)
            if (index >= 0 && index <= 30) {
                console.log({index, x,y,color: pixels.substring(index, index + 3)})
            }
            if (index >= 998 && index <= 1009) {
                console.log({index, x,y,color: pixels.substring(index, index + 3)})
            }
            ctx.fillRect(x, y, pixelSize, pixelSize);
        }
        console.log('done drawing')
    }
    const zoomIn = () => {
        if (!drawing) drawPlace(1.8)
    }
    const zoomOut = () => {
        if (!drawing) drawPlace(0.5)
    }
    const handleClick = (e) => {
        let ctx = canvasElm.getContext('2d')
        let currTransform = ctx.getTransform()
        console.log(currTransform)
        console.log(e)
        let xPos = Math.floor(e.x / currTransform.a)
        let yPos = Math.floor(e.y / currTransform.a)
        console.log({xPos,yPos})
        if (xPos <= 999 && yPos <= 999) dispatch("pixel_click", {xPos,yPos})

    }

    function handleResize () {
        canvasElm.setAttribute('width', window.innerWidth);
        canvasElm.setAttribute('height', window.innerHeight);
	}
</script>

<style>
    canvas{
        position: absolute;
        top: 0px;
        left: 0px;
    }
</style>
<CanvasContols
        on:zoomIn={zoomIn}
        on:zoomOut={zoomOut}/>
<canvas
        id={id}
        bind:this={canvasElm}
        width="100%"
        height="100%"
        on:click={handleClick}
/>
<svelte:window on:resize|passive={handleResize} />
