/*Config Constants*/
const SHAPE_SPAWN_RATE = 0.5;
const SHAPE_LIFETIME_MIN = 0.25;
const SHAPE_LIFETIME_MAX = 6.0;
const SHAPE_SPEED_MIN = 10.0;
const SHAPE_SPEED_MAX = 50.0;
const SHAPE_SIZE_MAX = 30.0;
const SHAPE_SIZE_MIN = 10.0;
const MAX_SHAPE_COUNT = 250;




/*Data Array Constants*/
const triangleVertices = new Float32Array([
    0.0, 0.5,
    -0.5, -0.5,
    0.5, -0.5
]);


const squareVertices = new Float32Array([
    -1, 1, -1, -1, 1, -1,
    -1, 1,  1, -1, 1,  1,
])

// const dpr = window.devicePixelRatio;
const colorSetOne = new Uint8Array([
    255, 0,   0,
    0,   255, 0,
    0,   0,   255
]);

const colorSetTwo = new Uint8Array([
    229, 47,  15,
    246, 206, 29,
    233, 154, 26
]);


const colorSetThree = new Uint8Array([
    167, 153, 255,
    88, 62, 122,
    88, 62, 122,
    167, 153, 255,
    88, 62, 122,
    167, 153, 255,
]);

/*Global Variables*/
/** @type {HTMLCanvasElement|null})*/
var canvas;
/** @type {WebGL2RenderingContext|null})*/
var gl;
var program;
var vertexShader;
var fragmentShader;



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


async function setUpGL() {
    /** @type {WebGL2RenderingContext|null})*/
    gl = canvas.getContext('webgl2', {
        preserveDrawingBuffer: false,
        antialias: true,
        alpha: true,
    });

    if(!gl) {
        gl = canvas.getContext('webgl');
        if(!gl) {
            console.log("Browser Does Not Support WebGL 2, please get a better browser boze");
            return;
        } else {
            console.log("WebGL2 may be Disabled. Please change settings to view site");
        }
        
    }

    const { vertexSource, fragmentSource } = await loadShaders();
    
    vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
    fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);
    
    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Shader Link Error: ", gl.getProgramInfoLog(program));
        return;
    }
    gl.useProgram(program);
}

function setUpCanvas(){
    
    canvas = document.getElementById("canvas");
    if (!canvas) {
        console.log("failed to get canvas");
        return;
    } 

    const rect = canvas.getBoundingClientRect();
    canvas.height = rect.height;
    canvas.width = rect.width;
}

function createStaticVertexBuffer(data){
    const buffer = gl.createBuffer();
    if (!buffer) {
        console.error("Failed to allocate Buffer");
        return null;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);


    return buffer;
}

function createTwoBufferVao (positionBuffer, colorBuffer,
    positionAttribLoc, colorAttribLoc
) {
    const vao = gl.createVertexArray();
    if (!vao) {
        console.error("failed to allocate VAO");
        return null
    }
    gl.bindVertexArray(vao);

    gl.enableVertexAttribArray(positionAttribLoc);
    gl.enableVertexAttribArray(colorAttribLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(
        positionAttribLoc,
        2, gl.FLOAT, false, 
        2* Float32Array.BYTES_PER_ELEMENT, 0 
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(
        colorAttribLoc,
        3, gl.UNSIGNED_BYTE, true, 
        0, 0 
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindVertexArray(null);
    return vao;
}


function OnResizeWindow() {
    if (!canvas) {
        return;
    }
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
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


/* CLASSES */
class MovingShape {
    constructor (position,velocity,size,timeRemaining,vao,numVerticies) {
        this.position = position;
        this.velocity = velocity;
        this.size = size;
        this.timeRemaining = timeRemaining;
        this.vao = vao;
        this.numVerticies = numVerticies;
    }

    isAlive() {
       return this.timeRemaining > 0; 
    }
    
    update(dt) {
        this.position[0] += this.velocity[0] * dt;
        this.position[1] += this.velocity[1] * dt;

        this.timeRemaining -= dt;
    }
}


async function main() {
    AddEvent(window, 'resize', OnResizeWindow);

    //Set up
    setUpCanvas()
    await setUpGL();

    //Shader Attribs
    const shapeLocationUnif = gl.getUniformLocation(program, 'shapeLocation');
    const shapeSizeUnif = gl.getUniformLocation(program, 'shapeSize');
    const canvasSizeUnif = gl.getUniformLocation(program, 'canvasSize');
    const vertexColorAttribLocation = gl.getAttribLocation(program, 'vertexColor');
    const vertexPositionAttribLocation = gl.getAttribLocation(program, 'vertexPosition');
    
    //Buffers
    const verticesPosBuffer = createStaticVertexBuffer(triangleVertices);
    const squarePosBuffer = createStaticVertexBuffer(squareVertices);

    const color1Buffer = createStaticVertexBuffer(colorSetOne);
    const color2Buffer = createStaticVertexBuffer(colorSetTwo);
    const color3Buffer = createStaticVertexBuffer(colorSetThree);

    if (!verticesPosBuffer || !verticesPosBuffer || !verticesPosBuffer) {
        return null
    }
    const color1TriVao = createTwoBufferVao(verticesPosBuffer, color1Buffer,
        vertexPositionAttribLocation, vertexColorAttribLocation
    );
    const color2TriVao = createTwoBufferVao(verticesPosBuffer, color2Buffer,
        vertexPositionAttribLocation, vertexColorAttribLocation
    );
    const color3SqrVao = createTwoBufferVao(squarePosBuffer, color3Buffer,
        vertexPositionAttribLocation, vertexColorAttribLocation
    );
    
    geometryList = [
        {vao: color1TriVao, numVerticies : 3},
        {vao: color2TriVao, numVerticies : 3},
        {vao: color3SqrVao, numVerticies : 6},
    ]


    //Objects
    let shapes = [];

    // ,
    // new MovingShape([800, 100], [0, 20], 100, color2TriVao)
    let timeToNextSpawn = SHAPE_SPAWN_RATE;

    let lastFrameTime = performance.now();
    function drawFrame() {
        const thisFrameTime = performance.now();
        const dt = (thisFrameTime - lastFrameTime) / 1000.0;
        lastFrameTime = thisFrameTime;

        timeToNextSpawn -= dt;
        while (timeToNextSpawn < 0 && shapes.length < MAX_SHAPE_COUNT) {
            timeToNextSpawn += SHAPE_SPAWN_RATE;
            
            const pos = [(gl.canvas.width*0.5), (gl.canvas.height*0.5)]

            const veloAngle = getRandomInRange(0, 2 * Math.PI);
            const speed = getRandomInRange(SHAPE_SPEED_MIN, SHAPE_SPEED_MAX);
            const velo = [
                Math.cos(veloAngle) * speed,
                Math.sin(veloAngle) * speed
            ]
            const size = getRandomInRange(SHAPE_SIZE_MIN, SHAPE_SIZE_MAX);
            const lifetime = getRandomInRange(SHAPE_LIFETIME_MIN, SHAPE_LIFETIME_MAX);

            // const vao = (Math.random() < 0.5) ? color2TriVao : color1TriVao;
            const geoIndex = Math.floor(getRandomInRange(0, geometryList.length));
            const geometry = geometryList[geoIndex];

            const shape = new MovingShape(pos, velo, size, lifetime, geometry.vao, geometry.numVerticies);

            shapes.push(shape);
        }

        for (let i = 0; i < shapes.length; i++) {
            shapes[i].update(dt);
        }

        shapes = shapes.filter((shape) => shape.isAlive()).slice(0, MAX_SHAPE_COUNT);

        //clear 
        gl.clearColor(0.,0.,0.,1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        //global uniform
        gl.uniform2f(canvasSizeUnif, gl.canvas.width, gl.canvas.height);
        
        for (let i = 0; i < shapes.length; i++) {
            gl.uniform1f(shapeSizeUnif, shapes[i].size);
            gl.uniform2f(shapeLocationUnif, shapes[i].position[0], shapes[i].position[1]);
            gl.bindVertexArray(shapes[i].vao);
            gl.drawArrays(gl.TRIANGLES, 0, shapes[i].numVerticies);
        }

        requestAnimationFrame(drawFrame);
    }   
    
    OnResizeWindow();
    requestAnimationFrame(drawFrame);
}





try {
    main();
} catch (e) {
    console.log('Uncaught Javascript Expection', $(e));
}