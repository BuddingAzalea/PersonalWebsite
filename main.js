/*Config Constants*/
const GRASS_AMOUNT = 100;
const RES_SCALE = 4;


// const grassdata = new Float32Array([
//     //location   //instance
//       0, 200,    1,
//      50, 200,    1,
//     100, 200,    0,
//     150, 200,    0,
//     200, 200,    0,
//     250, 200,    0,
//     300, 200,    1,
//     350, 200,    1,
//     400, 200,    0,
//     450, 200,    1,
// ]);
var grassdata = new Float32Array(GRASS_AMOUNT*3);


const grassVertices = new Float32Array([
    0, 1,   0, 0.99,  
    0, 0,   0, 0, 
    1, 0,   1, 0,
    0, 1,   0, 0.99,  
    1, 0,   1, 0, 
    1, 1,   1, 0.99,
]);



/*Global Variables*/
/** @type {HTMLCanvasElement|null})*/
var canvas;
/** @type {WebGL2RenderingContext|null})*/
var gl;

//{ name:  program, vertex, fragment, attribs}
var objs;

/*INITIALIZATIONS*/
function setUpCanvas(){
    
    canvas = document.getElementById("canvas");
    if (!canvas) {
        console.log("failed to get canvas");
        return;
    } 

    const rect = canvas.getBoundingClientRect();
    canvas.height = rect.height/4;
    canvas.width = rect.width/4;
}

async function setUpGL() {
    /** @type {WebGL2RenderingContext|null})*/
    gl = canvas.getContext('webgl2', {
        preserveDrawingBuffer: false,
        antialias: false,
        alpha: true,
    });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    if(!gl) {
        gl = canvas.getContext('webgl');
        if(!gl) {
            console.log("Browser Does Not Support WebGL 2, please get a better browser boze");
            return;
        } else {
            console.log("WebGL2 may be Disabled. Please change settings to view site");
        }
        
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

async function setUpObjects() {
    //program
    //atribs
    //uniforms
    //texture
    //vertexBuffer
    objs = {
        grass : {
            ...(await programInit(
                "./shaders/grass_vertex.glsl", 
                "./shaders/grass_fragment.glsl", 
                grassDataGetter)),
        }
    }
    console.log(objs)
}


function generateGrassPoints() {

    var y_position = new Float32Array(GRASS_AMOUNT);
    for (let i = 0; i < GRASS_AMOUNT; i++) {
        y_position[i] =  Math.floor(getRandomInRange(-15, gl.canvas.width-76));
    }
    y_position.sort().reverse()

    for (let i = 0; i < GRASS_AMOUNT; i++) {
        grassdata[i*3] = Math.floor(getRandomInRange(-5, gl.canvas.width-3));
        grassdata[i*3+ 1] = y_position[i];
        grassdata[i*3+ 2] = Math.floor(getRandomInRange(0, 2.99));
    }
    
}

/*SHADER LOGIC*/
async function loadShaders(vertex_url, fragment_url) {   
    try {
        const [vertexResponse, fragmentResponse] = await Promise.all([
            fetch(vertex_url),
            fetch(fragment_url),
        ]);

        const vertexSource = await vertexResponse.text();
        const fragmentSource = await fragmentResponse.text();

        
        return { vertexSource, fragmentSource };
    } catch (error) {
        console.error("Shader Load Error: ", error);
        throw error;
    }
}

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


/* OBJECT HANDELING */
function grassDataGetter(program) {
    const attribLocations = {
        vertexPosition: gl.getAttribLocation(program, "vertexPosition"),
        textureCoords : gl.getAttribLocation(program, 'textureCoordsV'),
        position      : gl.getAttribLocation(program, "position"),
        instanceID    : gl.getAttribLocation(program, "instanceV")
    }

    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.error("Failed to allocate Buffer");
        return null;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, grassVertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(attribLocations.vertexPosition);
    gl.enableVertexAttribArray(attribLocations.textureCoords);


    gl.vertexAttribPointer(
        attribLocations.vertexPosition,
        2, gl.FLOAT, false, 
        16, 0 
    );
    gl.vertexAttribPointer(
        attribLocations.textureCoords,
        2, gl.FLOAT, false, 
        16, 8 
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, null);



    const dataBuffer = gl.createBuffer();
    if (!dataBuffer) {
        console.error("Failed to allocate Buffer");
        return null;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, dataBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, grassdata, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(attribLocations.position);
    gl.enableVertexAttribArray(attribLocations.instanceID);
    
    gl.vertexAttribPointer(
        attribLocations.position,
        2, gl.FLOAT, false, 
        12, 0 
    );
    gl.vertexAttribPointer(
        attribLocations.instanceID,
        1, gl.FLOAT, false, 
        12, 8 
    );

    gl.vertexAttribDivisor(attribLocations.position, 1);
    gl.vertexAttribDivisor(attribLocations.instanceID, 1);
    

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    const uniformLocations = {
        time:       gl.getUniformLocation(program, "timeValue"),
        canvasSize: gl.getUniformLocation(program, "canvasSize"),
        sampler:    gl.getUniformLocation(program, "textureSample")
    }

    loadGrassTexture(uniformLocations.sampler);

    return {attribLocations, uniformLocations};
}


async function programInit(vertex_url, fragment_url, dataGetter) {
    const { vertexSource, fragmentSource } = await loadShaders(vertex_url, fragment_url);
    const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Shader Link Error: ", gl.getProgramInfoLog(program));;
        return;
    }

    const programInfo = {
        program: program,
        ...dataGetter(program)
    };

    return programInfo;
}

const loadImage = (link) => new Promise(resolve => {
    const image = new Image();
    image.src = link;
    image.addEventListener('load', () => resolve(image));
});


/*BUFFER HANDELING*/
async function loadGrassTexture(grassUnifLocation) {
    const image = await loadImage("./assets/grass.png");
    
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage3D( gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, 
        16, 16, 6, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.uniform1i(grassUnifLocation, 0);
    
    return texture;
}

function setUpBuffer(data, attribLocation, size, type, normalize, stride, offset) {
    const buffer = gl.createBuffer();
    if (!buffer) {
        console.error("Failed to allocate Buffer");
        return null;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(attribLocation);
    gl.vertexAttribPointer(
        attribLocation,
        size, type, normalize, 
        stride, offset 
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return buffer;
}

function getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

/* EVENT HANDELING */ 
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


// /* CLASSES */
// class Grass {
//     constructor (position, bloom_timer) {
//         this.position = position;
//         this.bloom_timer;
//     }
// }


async function main() {
    //Set up
    setUpCanvas()
    await setUpGL();
    generateGrassPoints();  
    await setUpObjects(); 
    grassdata = null;
    
    let lastFrameTime = performance.now();


    gl.useProgram(objs.grass.program)
    gl.uniform2f(objs.grass.uniformLocations.canvasSize, gl.canvas.width, gl.canvas.height);
    


    function drawFrame() {
        //clear 
        gl.clearColor(0.,0.,1.,1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.useProgram(objs.grass.program);
        gl.uniform1f(objs.grass.uniformLocations.time, performance.now()/1000);
        
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, GRASS_AMOUNT);

        requestAnimationFrame(drawFrame);
    }   
    
    requestAnimationFrame(drawFrame);
}

try {
    main();
} catch (e) {
    console.log('Uncaught Javascript Expection', $(e));
}