function Init() {
    addEvent(window, 'resize', OnResizeWindow)

    const canvas = document.querySelector('canvas');
    const gl = canvas.getContext("webgl");

    if (!gl) {
        console.log("using experimental webgl")
        gl = canvas.getContext('experimental-webgl')
    }

    if (!gl) {
        alert('Womp Womp get webgl')
    }

    // canvas.width = window.innerWidth;
    // canvas.height = window.innerHeight;

    // console.log("")
    gl.clearColor(1.0,0.3, 0.2, 1.0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}






// var Step1 = function () {
//     console.log('Test')
// }

// Step1()