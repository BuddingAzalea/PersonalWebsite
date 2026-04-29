const GRASS_AMOUNT = 7000;
const FLOWER_FRACTION = 0.1;
const FRAME_RATE_SCALE = 2;
const EYE_CENTER = [112, 39];
const EYE_RANGE = [10, 8];
const EYE_SPEED = 10.0;


const squareVertices = new Float32Array([
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

var grassdata = new Int16Array(GRASS_AMOUNT*4);
// var mouse;
var mouse_x = 224;
var mouse_y = 126;
var rect;

var spriteProperties;
var grassProperties;


/*INITIALIZATIONS*/
function setUpCanvas(){
    
    canvas = document.getElementById("main");
    if (!canvas) {
        console.log("failed to get canvas");
        return;
    } 

    rect = canvas.getBoundingClientRect();
    canvas.width = 448;
    canvas.height = Math.floor(canvas.width * (9/16));
    
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

/*HELPER FUNTIONS */

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

async function programInit(vertex_url, fragment_url, bufferInitFunc) {
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
        ...bufferInitFunc(program)
    };

    return programInfo;
}

const loadImage = (link) => new Promise(resolve => {
    const image = new Image();
    image.src = link;
    image.addEventListener('load', () => resolve(image));
});

async function loadTexture(link) {
    const image = await loadImage(link);

    const texture = gl.createTexture();
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, 
        image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // gl.activeTexture(gl.TEXTURE0 + textureIndex);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return [texture, [ image.width, image.height]];
}

async function loadGrassTexture(grassUnifLocation, program) {
    const image = await loadImage("./assets/grass.png");
    
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage3D( gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, 
        16, 32, 7, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // gl.bindTextureUnit(0, gl.TEXTURE_2D_ARRAY);
    gl.useProgram(program);
    gl.uniform1i(grassUnifLocation, 0);
    // gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
    
    return texture;
}


function spriteBufferInit(program) {
    gl.useProgram(program);
    const attribLocations = {
        vertexPosition: gl.getAttribLocation(program, "vertexPosition"),
        textureCoords : gl.getAttribLocation(program, 'textureCoordsV')
    }

    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.error("Failed to allocate Buffer");
        return null;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, squareVertices, gl.STATIC_DRAW);
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

    const uniformLocations = {
        canvasSize: gl.getUniformLocation(program, "canvasSize"),
        sampler   : gl.getUniformLocation(program, "uSampler"),
        position  : gl.getUniformLocation(program, "position"),
        alpha     : gl.getUniformLocation(program, "alphaScale"),
        size      : gl.getUniformLocation(program, "size")
    }

    return {attribLocations, uniformLocations};
}

function grassBufferInit(program) {
    gl.useProgram(program);
    const attribLocations = {
        vertexPosition: gl.getAttribLocation(program, "vertexPosition"),
        textureCoords : gl.getAttribLocation(program, 'textureCoordsV'),
        position      : gl.getAttribLocation(program, "position"),
        instanceID    : gl.getAttribLocation(program, "instanceV"),
        flowerTimer   : gl.getAttribLocation(program, "flowerTimerV"),
    }

    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.error("Failed to allocate Buffer");
        return null;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, squareVertices, gl.STATIC_DRAW);
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
    gl.enableVertexAttribArray(attribLocations.flowerTimer);
    
    gl.vertexAttribPointer(
        attribLocations.position,
        2, gl.SHORT, false, 
        8, 0 
    );
    gl.vertexAttribPointer(
        attribLocations.instanceID,
        1, gl.SHORT, false, 
        8, 4 
    );

    gl.vertexAttribPointer(
        attribLocations.flowerTimer,
        1, gl.SHORT, false, 
        8, 6 
    );

    gl.vertexAttribDivisor(attribLocations.position, 1);
    gl.vertexAttribDivisor(attribLocations.instanceID, 1);
    gl.vertexAttribDivisor(attribLocations.flowerTimer, 1);
    

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    const uniformLocations = {
        time:        gl.getUniformLocation(program, "timeValue"),
        canvasSize:  gl.getUniformLocation(program, "canvasSize"),
        sampler:     gl.getUniformLocation(program, "textureSample"),
        colorB:      gl.getUniformLocation(program, "bottomColorDead"),
        colorT:      gl.getUniformLocation(program, "topColorDead"),
        colorBL:     gl.getUniformLocation(program, "bottomColorLiving"),
        colorTL:     gl.getUniformLocation(program, "topColorLiving"),
        colorBF:     gl.getUniformLocation(program, "flowerColorBright"),
        colorTF:     gl.getUniformLocation(program, "flowerColorDark")
    }
    loadGrassTexture(uniformLocations.sampler, program);

    return {attribLocations, uniformLocations, dataBuffer};
}

function getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

function generateGrassPoints() {
    var y_position = new Int16Array(GRASS_AMOUNT);
    for (let i = 0; i < GRASS_AMOUNT-1; i++) {
        y_position[i] =  Math.floor(getRandomInRange(-32, gl.canvas.height));
    }
    y_position[-1] = 114
    y_position.sort().reverse();

    let centerFlower = y_position.findIndex((element)=> element == 114);
    console.log(centerFlower);

    for (let i = 0; i < GRASS_AMOUNT; i++) {
        grassdata[i*4] = Math.floor(getRandomInRange(-15, gl.canvas.width));
        grassdata[i*4+ 1] = y_position[i];
        if (Math.random() < FLOWER_FRACTION) {
            grassdata[i*4+ 2] = Math.floor(getRandomInRange(1,  3));
        } else {
            grassdata[i*4+ 2] = Math.floor(getRandomInRange(3,  7));
        }
        grassdata[i*4+ 3] = 0;   
    }  

    grassdata[centerFlower*4] = 210;
    grassdata[centerFlower*4+ 2] = 0;
    grassdata[centerFlower*4+ 3] = 1000; 
}

class spriteObj {
    texture
    size
    alpha
    constructor(position) {
        this.position = position;
    }

    async loadTextures(texture_link) {
        [this.texture, this.size] = await loadTexture(texture_link);
    }

    drawObject(textureIndex, alpha_value = 1.0) {
        gl.uniform1i(spriteProperties.uniformLocations.sampler, textureIndex);
        gl.activeTexture(gl.TEXTURE0 + textureIndex);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        
        gl.uniform2f(spriteProperties.uniformLocations.position, ...this.position);
        gl.uniform2f(spriteProperties.uniformLocations.size, this.size[0], this.size[1]);
        this.alpha = alpha_value;
        gl.uniform1f(spriteProperties.uniformLocations.alpha, alpha_value);
        gl.drawArrays(gl.TRIANGLES, 0 , 6);
    }
}

/*OPEN*/
async function openSetput() {
    const eye = new spriteObj(EYE_CENTER);
    const head = new spriteObj([0,0]);
    let targetEyePosition = EYE_CENTER

    eye.position = EYE_CENTER;

    await eye.loadTextures("./assets/eye2.png");
    await head.loadTextures("./assets/eye.png");

    let lastFrameTime = performance.now()/1000;
    let currentFrameTime = 0;
    let dt = 0
    let drawFrameIndex = 1;

    gl.useProgram(grassProperties.program)
    gl.uniform3fv(grassProperties.uniformLocations.colorB, [0/255, 0/255, 0/255]);
    gl.uniform3fv(grassProperties.uniformLocations.colorT, [7/255, 10/255, 7/255]);
    gl.uniform3fv(grassProperties.uniformLocations.colorBL, [1/255, 6/255, 3/255]);
    gl.uniform3fv(grassProperties.uniformLocations.colorTL, [49/255, 87/255, 59/255]);
    gl.uniform3fv(grassProperties.uniformLocations.colorBF, [63/255, 65/255, 196/255]);
    gl.uniform3fv(grassProperties.uniformLocations.colorTF, [114/255, 84/255, 171/255]);

    function drawFrame() { 
        currentFrameTime = performance.now()/1000;
        dt = currentFrameTime - lastFrameTime;
        lastFrameTime = currentFrameTime;

        if (drawFrameIndex == FRAME_RATE_SCALE) {
            gl.clearColor(0/255, 0/255, 0/255, 0.00);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            gl.useProgram(grassProperties.program);
            gl.uniform1f(grassProperties.uniformLocations.time, performance.now()/1000);

            gl.bindBuffer(gl.ARRAY_BUFFER, grassProperties.dataBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, grassdata);
            gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, GRASS_AMOUNT);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);

            gl.useProgram(spriteProperties.program);
            
            eye.drawObject(1);
            head.drawObject(1);


            drawFrameIndex = 0;
        } else {
            let mouseCenterOffset = [mouse_x- gl.canvas.width*0.5 +11, mouse_y- gl.canvas.height*0.5 - 8];// - rect.width*0.5- rect.height*0.5
            targetEyePosition = [
                Math.min(Math.max(Math.floor(EYE_CENTER[0] + mouseCenterOffset[0]),EYE_CENTER[0]- EYE_RANGE[0]) ,EYE_CENTER[0]+ EYE_RANGE[0]),
                Math.min(Math.max(Math.floor(EYE_CENTER[1] + mouseCenterOffset[1]),EYE_CENTER[1]- EYE_RANGE[1]) ,EYE_CENTER[1]+ EYE_RANGE[1])
            ];
            eye.position = [
                Math.floor((targetEyePosition[0]-eye.position[0])*dt*EYE_SPEED + eye.position[0]),
                Math.floor((targetEyePosition[1]-eye.position[1])*dt*EYE_SPEED + eye.position[1])
            ]
        }
        drawFrameIndex++;
        requestAnimationFrame(drawFrame);
    }   
    requestAnimationFrame(drawFrame);
}



async function main() {
    setUpCanvas();
    await setUpGL();
    generateGrassPoints();
    
    canvas.addEventListener("mousemove", (e) => {
        rect = canvas.getBoundingClientRect()
        mouse_x = (e.offsetX/rect.width)*gl.canvas.width;
        mouse_y = gl.canvas.height - (e.offsetY/rect.height)*gl.canvas.height;
    });

    canvas.addEventListener("mousedown", (e) => {
        console.log("test");
    });
    
    spriteProperties = await programInit("../shaders/objs_vertex.glsl", "../shaders/objs_fragment.glsl", spriteBufferInit);
    grassProperties = await programInit("../shaders/grass_vertex.glsl", "../shaders/grass_fragment.glsl", grassBufferInit);
    
    gl.useProgram(grassProperties.program)
    gl.uniform2f(grassProperties.uniformLocations.canvasSize, gl.canvas.width, gl.canvas.height);

    
    gl.useProgram(spriteProperties.program);
    gl.uniform2f(spriteProperties.uniformLocations.canvasSize, gl.canvas.width, gl.canvas.height);
    
    openSetput();

}


try {
    main();
} catch (e) {
    console.log('Uncaught Javascript Expection', $(e));
}
