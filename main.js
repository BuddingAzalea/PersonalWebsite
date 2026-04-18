async function loadShaders() {
        
    try {
        const [vertexResponse, fragmentResponse] = await Promise.all([
            fetch("./shaders/vertex.glsl"),
            fetch("./shaders/fragment.glsl"),
        ]);

        const vertexSource = await vertexResponse.text();
        const fragmentSource = await fragmentResponse.text();

        
        return { vertexSource, fragmentSource };
    } catch (error) {
        console.error("Shader Load Error: ", error);
        throw error;
    }
}

function AddEvent(object, type, callback) {
    if (object == null || typeof(object) == 'undifined') return;
    if (object.addEventListener) {
        object.addEventListener(type, callback, false);
    } else if (object.attachEvent) {
        object.attachEvent("on" + type, callback);
    } else {
        object["on"+type] = callback;
    }
}

function RemoveEvent(object, type, callback) {
    if (object == null || typeof(object) == 'undifined') return;
    if (object.removeEventListener) {
        object.removeEventListener(type, callback, false);
    } else if (object.detachEvent) {
        object.detachEvent("on" + type, callback);
    } else {
        object["on"+type] = callback;
    }
}


async function main() {
    AddEvent(window, 'resize', OnResizeWindow);

    /** @type {HTMLCanvasElement|null})*/
    const canvas = document.getElementById("canvas");
    if (!canvas) {
        console.log("failed to get canvas");
        return;
    } 
    const gl = canvas.getContext('webgl2', {
        preserveDrawingBuffer: false,
        antialias: true,
        alpha: true,
    });

    if(!gl) {
        console.log("Browser Does Not Support WebGL 2, please get a better browser boze");
        return;
    }
    

    /* HELPER FUNCTIONS */
    function createShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
    
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Shader Compile Error: ", gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null
        }
        return shader; 
    }

    function OnResizeWindow() {
        if (!canvas) {
            return;
        }
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

    /*##################*/ 

    const { vertexSource, fragmentSource } = await loadShaders();
    
    const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Shader Link Error: ", gl.getProgramInfoLog(program));
        return;
    }

    const vertexPositionAttribLocation = gl.getAttribLocation(program, 'vertexPosition');
    if (vertexPositionAttribLocation < 0) {
        console.error("Shader Parameter Error");
        return;
    }



    //Output merger
    OnResizeWindow();
    



    gl.clearColor(0.,0.,0.,1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const triangleVertices = [
        0.0, 0.5,
        -0.5, -0.5,
        0.5, -0.5
    ];

    const verticesCPUBuffer = new Float32Array(triangleVertices);
    
    const verticesGLBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesGLBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticesCPUBuffer, gl.STATIC_DRAW);

    



}

try {
    main();
} catch (e) {
    console.log('Uncaught Javascript Expection', $(e));
}