const {Canvg, presets} = canvg;

export async function testFN(svgUrl) {
    const result = await new Promise(async (resolve, reject) => {
        const domUrl = window.URL || window.webkitURL || window;
        if (!domUrl) {
            throw new Error('This is not supported in this browser.');
        }
        const {svgText, width, height} = await loadSvgElement(svgUrl);
        const svg = new Blob(
            [svgText],
            { type: "image/svg+xml;charset=utf-8"}
        );
        // const url = domUrl.createObjectURL(svg);

        // const svgText = (new XMLSerializer()).serializeToString(innerSvg);

        const canvas = document.createElement('canvas');
        canvas.width = width * 8;
        canvas.height = height * 8;
        const context = canvas.getContext('2d');

        const image = new Image();
        image.onload = function () {
            context.drawImage(this, 0, 0);
            // domUrl.revokeObjectURL(url);
            console.log(canvas);
            resolve(canvas.toDataURL());
        };

        image.src = "data:image/svg+xml;utf8," + encodeURIComponent(svgText);
        // image.src = url;
    });

    return result;

}


export async function offscreenRender(svg, width, height) {
	const c = new OffscreenCanvas(
		width || DEFAULT_WIDTH,
		height || DEFAULT_HEIGHT
	);
	const ctx = c.getContext('2d');
	const v = await Canvg.from(ctx, svg, presets.offscreen());

	await v.render();

	const blob = await c.convertToBlob();
    return URL.createObjectURL(blob);

	// canvasOutput.innerHTML = `<img src="${URL.createObjectURL(blob)}">`;

	// renderSource(svg);
}

export async function loadSvg(svgUrl) {
    const {element, width, height} = await loadSvgElement(svgUrl);

    // const canvas = new OffscreenCanvas(width * 8, height * 8);
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 2000;
    const ctx = canvas.getContext('2d');
    const v = await Canvg.from(ctx, svgUrl);

    await v.render();

    const blob = await canvas.toDataURL('image/png', 1);
    // const url =  await new Promise((resolve, _) => {
    //     const reader = new FileReader();
    //     reader.onloadend = () => resolve(reader.result);
    //     reader.readAsDataURL(blob);
    // });
    // const pngUrl = URL.createObjectURL(blob);

    return blob;
}

export async function loadSvgElement(svgUrl) {
    const svgContent = await (await fetch(svgUrl)).text();
    const element = document.createElement('svg');
    element.innerHTML = svgContent;
    // console.log(element, svgContent);
    const actualSvg = element.children.item(0);
    actualSvg.style.display = 'hidden';
    document.body.appendChild(actualSvg);
    const viewBox = actualSvg.viewBox.baseVal;
    return {
        element: actualSvg,
        svgText: svgContent,
        width: viewBox.width,
        height: viewBox.height
    };
}

export async function performanceTestAsync(testFunction, ...params) {
    console.log(`------------- Testing ${testFunction.name} ------------`);
    const time = performance.now();
    const results = await testFunction(...params);
    const elapsed = performance.now() - time;
    console.log(`------------- ${testFunction.name}: ${elapsed}ms ------------`);
    return results;
}

export function performanceTest(testFunction, ...params) {
    console.log(`------------- Testing ${testFunction.name} ------------`);
    const time = performance.now();
    const results = testFunction(...params);
    const elapsed = performance.now() - time;
    console.log(`------------- ${testFunction.name}: ${elapsed}ms ------------`);
    return results;
}