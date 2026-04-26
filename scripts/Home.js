const EYE_CENTER = [112, 39];
const EYE_RANGE = [10, 6];


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
// var mouse;
var mouse_x = 0;
var mouse_y = 0;
var rect;

var spriteProperties;


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
        size      : gl.getUniformLocation(program, "size")
    }

    return {attribLocations, uniformLocations};
}

class spriteObj {
    texture
    size

    constructor(position) {
        this.position = position;
    }

    async loadTextures(texture_link) {
        [this.texture, this.size] = await loadTexture(texture_link);
    }

    drawObject(textureIndex) {
        gl.uniform1i(spriteProperties.uniformLocations.sampler, textureIndex);
        gl.activeTexture(gl.TEXTURE0 + textureIndex);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        
        gl.uniform2f(spriteProperties.uniformLocations.position, ...this.position);
        gl.uniform2f(spriteProperties.uniformLocations.size, this.size[0], this.size[1]);
        gl.drawArrays(gl.TRIANGLES, 0 , 6);
    }
}

/*OPEN*/
async function openSetput() {
    const flower = new spriteObj([200, 100]);
    const eye = new spriteObj(EYE_CENTER);
    const head = new spriteObj([0,0]);

    await flower.loadTextures("./assets/grass.png");
    await eye.loadTextures("./assets/eye2.png");
    await head.loadTextures("./assets/eye.png");

    let drawFrameIndex = 0;
    function drawFrame() { 
        if (drawFrameIndex == 1) {
            drawFrameIndex = -1;
            flower.drawObject(1);
            eye.drawObject(1);
            head.drawObject(1);
            
            
        } else {
            let mouseCenterOffset = [mouse_x- gl.canvas.width*0.5 +11, mouse_y- gl.canvas.height*0.5 - 8];// - rect.width*0.5- rect.height*0.5
            eye.position = [
                Math.min(Math.max(Math.floor(EYE_CENTER[0] + mouseCenterOffset[0]),EYE_CENTER[0]- EYE_RANGE[0]) ,EYE_CENTER[0]+ EYE_RANGE[0]),
                Math.min(Math.max(Math.floor(EYE_CENTER[1] + mouseCenterOffset[1]),EYE_CENTER[1]- EYE_RANGE[1]) ,EYE_CENTER[1]+ EYE_RANGE[1])
            ];
            
            
            console.log(mouseCenterOffset);
        }
        drawFrameIndex++;
        requestAnimationFrame(drawFrame);
    }   
    
    requestAnimationFrame(drawFrame);
}



async function main() {
    setUpCanvas();
    await setUpGL();
    
    canvas.addEventListener("mousemove", (e) => {
        rect = canvas.getBoundingClientRect()
        console.log
        mouse_x = (e.offsetX/rect.width)*gl.canvas.width;
        mouse_y = gl.canvas.height - (e.offsetY/rect.height)*gl.canvas.height;
    });
    
    spriteProperties = await programInit("../shaders/objs_vertex.glsl", "../shaders/objs_fragment.glsl", spriteBufferInit)
    gl.useProgram(spriteProperties.program);
    gl.uniform2f(spriteProperties.uniformLocations.canvasSize, gl.canvas.width, gl.canvas.height);
    
    
    openSetput();

}


try {
    main();
} catch (e) {
    console.log('Uncaught Javascript Expection', $(e));
}
