let program;
let texture = null;
const canvas = document.querySelector('canvas');
const gl = canvas.getContext("webgl", {
    preserveDrawBuffer: false,
    antialias: false,
    alpha: true,
});



function setupWebGL() {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("fail to compile shader: ", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

async function loadShaders() {
    try {
        const [vertexResponse, fragmentResponse] = await Promise.all([
            fetch("./shaders/vertex.glsl"),
            fetch("./shaders/fragment.glsl")
        ]);

        const vertexSource = await vertexResponse.text();
        const fragmentSource = await fragmentResponse.text();

        return {vertexSource, fragmentSource};
    } catch (error) {
        console.log("fail to load shader: ", error);
        throw error;
    }    
}

async function initWebGl() {
    setupWebGL();

    const {vertexSource, fragmentSource} = await loadShaders();
    const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);

    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    gl.useProgram(program);

    const vertices = new Float32Array([
        -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0,
    ]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const iChannel0Location = gl.getUniformLocation(program, "iChannel0");
    gl.uniform1i(iChannel0Location, 0);
}

function updateTexture() {
    const tempCanvas
}







// if (!gl) {
//     console.log("using experimental webgl");
//     gl = canvas.getContext('experimental-webgl');
// }

// if (!gl) {
//     alert('Womp Womp get webgl');
// }

// gl.clearColor(1.0,0.8, 0.2, 1.0)
// gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

