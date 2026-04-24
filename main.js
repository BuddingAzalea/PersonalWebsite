/*Config Constants*/
const GRASS_AMOUNT = 6000;
const FLOWER_FRACTION = 0.1;
const FRAME_RATE_SCALE = 2;
const MOUSE_UPDATE_RATE = 10;
const MOUSE_RANGE = 40;
const SIDE_BUFFER = 10;
const MOUSE_RANGE_SQUARED = MOUSE_RANGE * MOUSE_RANGE
const LIVING_DECAY = 5;
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


//pos x, pos y, meshID, timer   
var grassdata = new Float32Array(GRASS_AMOUNT*4);
const grassVertices = new Float32Array([
    0, 2,   0, 0.99,  
    0, 0,   0, 0, 
    1, 0,   1, 0,
    0, 2,   0, 0.99,  
    1, 0,   1, 0, 
    1, 2,   1, 0.99,
]);


class basicObj {
    
    texture = null;

    constructor(position, size, uniformLocations) {
        this.position = position;
        this.size = size;
        this.uniformLocations = uniformLocations
    }

    async loadTextures(texture_link) {
        this.texture = await loadObjTexture(texture_link, this.size);
    }

    drawObject(textureIndex) {

        gl.uniform1i(this.uniformLocations.sampler, textureIndex);
        gl.activeTexture(gl.TEXTURE0 + textureIndex);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        
        gl.uniform2f(this.uniformLocations.position, ...this.position);
        gl.uniform2f(this.uniformLocations.size, this.size[0], this.size[1]*0.5);
        gl.drawArrays(gl.TRIANGLES, 0 , 6);
    }
}



/*Global Variables*/
/** @type {HTMLCanvasElement|null})*/
var canvas;
/** @type {WebGL2RenderingContext|null})*/
var gl;
//{ name:  program, vertex, fragment, attribs}
var objs;
// var computes;
var mouse_x = 0;
var mouse_y = 0;
var rect;


/*INITIALIZATIONS*/
function setUpCanvas(){
    
    canvas = document.getElementById("canvas");
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

async function setUpObjects() {
    //program
    //atribs
    //uniforms
    objs = {
        grass : {
            ...(await programInit(
                "./shaders/grass_vertex.glsl", 
                "./shaders/grass_fragment.glsl", 
                grassDataGetter
            ))
        },
        basicObj : {
            ...(await programInit(
                "./shaders/objs_vertex.glsl", 
                "./shaders/objs_fragment.glsl",
                objDataGetter
            ))
        }
    }
}


function generateGrassPoints() {
    var y_position = new Float32Array(GRASS_AMOUNT);
    for (let i = 0; i < GRASS_AMOUNT; i++) {
        y_position[i] =  Math.floor(getRandomInRange(-32, gl.canvas.height));
    }
    y_position.sort().reverse()

    for (let i = 0; i < GRASS_AMOUNT; i++) {
        grassdata[i*4] = Math.floor(getRandomInRange(-15, gl.canvas.width));
        grassdata[i*4+ 1] = y_position[i];
        if (Math.random() < FLOWER_FRACTION) {
            grassdata[i*4+ 2] = Math.floor(getRandomInRange(0,  2));
        } else {
            grassdata[i*4+ 2] = Math.floor(getRandomInRange(2,  6));
        }
        grassdata[i*4+ 3] = 0.0;   
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
    gl.enableVertexAttribArray(attribLocations.flowerTimer);
    
    gl.vertexAttribPointer(
        attribLocations.position,
        2, gl.FLOAT, false, 
        16, 0 
    );
    gl.vertexAttribPointer(
        attribLocations.instanceID,
        1, gl.FLOAT, false, 
        16, 8 
    );

    gl.vertexAttribPointer(
        attribLocations.flowerTimer,
        1, gl.FLOAT, false, 
        16, 12 
    );

    gl.vertexAttribDivisor(attribLocations.position, 1);
    gl.vertexAttribDivisor(attribLocations.instanceID, 1);
    gl.vertexAttribDivisor(attribLocations.flowerTimer, 1);
    

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    const uniformLocations = {
        time:       gl.getUniformLocation(program, "timeValue"),
        canvasSize: gl.getUniformLocation(program, "canvasSize"),
        sampler:    gl.getUniformLocation(program, "textureSample"),
        colorB:     gl.getUniformLocation(program, "bottomColorDead"),
        colorT:     gl.getUniformLocation(program, "topColorDead"),
        colorBL:     gl.getUniformLocation(program, "bottomColorLiving"),
        colorTL:     gl.getUniformLocation(program, "topColorLiving"),
        colorBF:     gl.getUniformLocation(program, "flowerColorBright"),
        colorTF:     gl.getUniformLocation(program, "flowerColorDark")
    }
    
    loadGrassTexture(uniformLocations.sampler);

    return {attribLocations, uniformLocations, dataBuffer};
}


function objDataGetter(program) {
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

    const uniformLocations = {
        canvasSize: gl.getUniformLocation(program, "canvasSize"),
        sampler   : gl.getUniformLocation(program, "uSampler"),
        position  : gl.getUniformLocation(program, "position"),
        size      : gl.getUniformLocation(program, "size")
    }

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
        16, 32, 6, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // gl.bindTextureUnit(0, gl.TEXTURE_2D_ARRAY);
    gl.uniform1i(grassUnifLocation, 0);
    // gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
    
    return texture;
}

async function loadObjTexture(link, size) {
    const image = await loadImage(link);

    const texture = gl.createTexture();
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, 
        ...size, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // gl.activeTexture(gl.TEXTURE0 + textureIndex);
    gl.bindTexture(gl.TEXTURE_2D, null);

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

// /* EVENT HANDELING */ 
// function AddEvent(object, type, callback) {
//     if (object == null || typeof(object) == 'undifined') return;
//     if (object.addEventListener) {
//         object.addEventListener(type, callback, false);
//     } else if (object.attachEvent) {
//         object.attachEvent("on" + type, callback);
//     } else {
//         object["on"+type] = callback;
//     }
// }

// function RemoveEvent(object, type, callback) {
//     if (object == null || typeof(object) == 'undifined') return;
//     if (object.removeEventListener) {
//         object.removeEventListener(type, callback, false);
//     } else if (object.detachEvent) {
//         object.detachEvent("on" + type, callback);
//     } else {
//         object["on"+type] = callback;
//     }
// }


// /* CLASSES */
// class Grass {
//     constructor (position, bloom_timer) {
//         this.position = position;
//         this.bloom_timer;
//     }
// }


async function main() {
    //Set up
    setUpCanvas();
    await setUpGL();
    generateGrassPoints();   
    await setUpObjects(); 



    canvas.addEventListener("mousemove", (e) => {
        rect = canvas.getBoundingClientRect()
        mouse_x = (e.offsetX/rect.width)*gl.canvas.width  -8;
        mouse_y = gl.canvas.height - (e.offsetY/rect.height)*gl.canvas.height - 10;
    });

    
    let lastFrameTime = performance.now()/1000;

    gl.useProgram(objs.grass.program)
    gl.uniform2f(objs.grass.uniformLocations.canvasSize, gl.canvas.width, gl.canvas.height);
    gl.uniform3fv(objs.grass.uniformLocations.colorB, [1/255, 6/255, 3/255]);
    gl.uniform3fv(objs.grass.uniformLocations.colorT, [23/255, 26/255, 23/255]);
    gl.uniform3fv(objs.grass.uniformLocations.colorBL, [1/255, 6/255, 3/255]);
    gl.uniform3fv(objs.grass.uniformLocations.colorTL, [49/255, 87/255, 59/255]);
    gl.uniform3fv(objs.grass.uniformLocations.colorBF, [63/255, 65/255, 196/255]);
    gl.uniform3fv(objs.grass.uniformLocations.colorTF, [114/255, 84/255, 171/255]);

    gl.useProgram(objs.basicObj.program);
    gl.uniform2f(objs.basicObj.uniformLocations.canvasSize, gl.canvas.width, gl.canvas.height);
    
    
    
    let sheep = new basicObj(
        [200,50],
        [10, 40],
        objs.basicObj.uniformLocations
    );
    
    let staticObjs = [
        new basicObj([100,20],[10, 40],objs.basicObj.uniformLocations),
        new basicObj([100,130],[10, 40],objs.basicObj.uniformLocations),
        new basicObj([250,90],[10, 40],objs.basicObj.uniformLocations),
        new basicObj([300,200],[10, 40],objs.basicObj.uniformLocations),
    ];
    
    await sheep.loadTextures("./assets/sheep.png");
    for (let i=0; i < staticObjs.length; i++) {
        await staticObjs[i].loadTextures("./assets/sheep.png");
    }

    // gl.uniform3fv(objs.grass.uniformLocations.colorT, [1.0, 1.0, 1.0]);
    let draw_frame_index = 0;
    let mouse_frame_index = 0;
    let staticBreaks = new Int16Array(staticObjs.length +1);
    staticBreaks[staticObjs.length] = GRASS_AMOUNT;  
    
    staticObjs.sort((a,b) => b.position[1] - a.position[1])


    let static_index = 0;
    let current_height = staticObjs[static_index].position[1];
    console.log(current_height);

    for (let i=0; i < GRASS_AMOUNT-1; i++) {
        let add_break = false;
        if (grassdata[i*4+1] < current_height) { 
            staticBreaks[static_index+1] = i;
            add_break = true;
        } else if ((grassdata[i*4+1] >= current_height) && (grassdata[i*4+5] < current_height)) {
            staticBreaks[static_index+1] = i+1;
            add_break = true;
        } else if (i == GRASS_AMOUNT-2) {
            staticBreaks[static_index+1] = GRASS_AMOUNT;
            add_break = true;
        }
        if (add_break) {
            i--;
            static_index +=1;
            if (static_index == staticObjs.length) {
                break;
            }
            current_height = staticObjs[static_index].position[1];
        }
    }
    let breaks = [...staticBreaks];
    let allObjects = [...staticObjs];
    console.log(breaks);



    function drawFrame() {
        let currentFrameTime = performance.now()/1000;
        dt = currentFrameTime - lastFrameTime;
        lastFrameTime = currentFrameTime;

        for (let i=mouse_frame_index; i < GRASS_AMOUNT; i+=MOUSE_UPDATE_RATE) {
            var dist = (mouse_x-grassdata[i*4])*(mouse_x-grassdata[i*4]) + (mouse_y-grassdata[i*4+1])*(mouse_y-grassdata[i*4+1])
            grassdata[i*4+3] = Math.max((dist < MOUSE_RANGE_SQUARED), grassdata[i*4+3]);//- LIVING_DECAY*dt
        }
        mouse_frame_index = (mouse_frame_index + 1) % MOUSE_UPDATE_RATE;

        if (draw_frame_index == FRAME_RATE_SCALE) {
            draw_frame_index = 0;
            gl.clearColor(0/255, 0/255, 0/255, 0.00);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            gl.useProgram(objs.grass.program);
            gl.uniform1f(objs.grass.uniformLocations.time, performance.now()/1000);


            for (let k = 0; k < allObjects.length; k++) {
                gl.useProgram(objs.grass.program);

                gl.bindBuffer(gl.ARRAY_BUFFER, objs.grass.dataBuffer);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, grassdata.slice(breaks[k]*4, breaks[k+1]*4));
                gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, breaks[k+1]-breaks[k]);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);


                gl.useProgram(objs.basicObj.program);
                allObjects[k].drawObject(1);
            }

            gl.useProgram(objs.grass.program);
            gl.bindBuffer(gl.ARRAY_BUFFER, objs.grass.dataBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, grassdata.slice(breaks[breaks.length -1]*4, GRASS_AMOUNT*4));
            gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, GRASS_AMOUNT-breaks[breaks.length -1]);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);

            // gl.bindBuffer(gl.ARRAY_BUFFER, objs.grass.dataBuffer);
            // gl.bufferSubData(gl.ARRAY_BUFFER, 0, grassdata.slice(breaks[k]*4, breaks[k+1]*4));
            // gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, breaks[k+1]-breaks[k]);
            // gl.bindBuffer(gl.ARRAY_BUFFER, null);
            

            // gl.bindBuffer(gl.ARRAY_BUFFER, objs.grass.dataBuffer);
            // gl.bufferSubData(gl.ARRAY_BUFFER, 0, grassdata.slice(20*4, 30*4));
            // gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, 10);
            // gl.bindBuffer(gl.ARRAY_BUFFER, null);
            
            // gl.bindBuffer(gl.ARRAY_BUFFER, objs.grass.dataBuffer);
            // gl.bufferSubData(gl.ARRAY_BUFFER, 0, grassdata);
            // gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, GRASS_AMOUNT);
            // gl.bindBuffer(gl.ARRAY_BUFFER, null);

            // gl.useProgram(objs.basicObj.program);
            // sheep.drawObject(1);
        } else {
            // breaks = [0,...staticBreaks];
            // allObjects = [sheep,...staticObjs];
            let sheep_index = 0;
            for (let k = 0; k < staticObjs.length; k++) {
                // console.log(staticObjs[k].position[1]);
                if (staticObjs[k].position[1] > sheep.position[1]) {
                    sheep_index = k+1;
                }
            }
            allObjects = [...staticObjs.slice(0,sheep_index), sheep, ...staticObjs.slice(sheep_index)];
            sheepBreakPoint = staticBreaks[sheep_index];
            for (let i=staticBreaks[sheep_index]; i < GRASS_AMOUNT-1; i++) {
                if (grassdata[i*4+1] < sheep.position[1]) { 
                    sheepBreakPoint = i;
                    break;
                } else if  (grassdata[i*4+5] < sheep.position[1]) {
                    sheepBreakPoint = i+1;
                    break;
                } else if (i == GRASS_AMOUNT-2) {
                    sheepBreakPoint = GRASS_AMOUNT;
                    break;
                }
            }
            breaks = [...staticBreaks.slice(0,sheep_index+1), sheepBreakPoint, ...staticBreaks.slice(sheep_index+1)];
            console.log(breaks);
            console.log(allObjects);
            //test
            
        }
        requestAnimationFrame(drawFrame);
        draw_frame_index++;
    }   
    
    requestAnimationFrame(drawFrame);
}

try {
    main();
} catch (e) {
    console.log('Uncaught Javascript Expection', $(e));
}