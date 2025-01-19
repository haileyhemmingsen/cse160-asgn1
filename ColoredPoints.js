// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    uniform float u_Size;
    void main() {
        gl_Position = a_Position;
        //gl_PointSize = 20.0;
        gl_PointSize = u_Size;
    }`

// Fragment shader program
var FSHADER_SOURCE = `
    precision mediump float;
    uniform vec4 u_FragColor;
    void main() {
        gl_FragColor = u_FragColor;
    }`

//Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;

//get the canvas and gl context
function setupWebGL() {
    // Retrieve <canvas> element
    canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    // gl = getWebGLContext(canvas);
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});

    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
}

//compile the shader programs, attach the javascript variables to the GLSL variables
function connectVariablesToGLSL() {
    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    // // Get the storage location of a_Position
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }

    // Get the storage location of u_FragColor
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }

    // Get the storage location of u_Size
    u_Size = gl.getUniformLocation(gl.program, 'u_Size');
    if (!u_Size) {
        console.log('Failed to get the storage location of u_Size');
        return;
    }
}

//Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

//Globals related to UI elems
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;
let g_selectedType = POINT;
let g_selectedSegment = 10;

const picCoords = [-.1, 0, .1, 0, 0, .2,
    .2,-.2,.1, 0, 0, -.2,
    -.2,-.2,-0.1, 0, 0, -0.2,
    .3,0,.2,-.2,0.1, 0,
    -.3,0,-.2,-.2,-0.1, 0,
    0,0.2,.1,.2,.1,0,
    0,0.2,-.1,.2,-.1,0,
    0,-.2,-.2,-.5,-.4,-.2,
    0,-.2,.2,-.5,.4,-.2,
    0,-.2,-.2,-.5,.2,-.5,
    .4,-.5,.2,-.5,.4,-.2,
    -.4,-.5,-.2,-.5,-.4,-.2,
    .4,-.5,-.4,-.5,0,-.6,
    .3,0,.2,-.2,.4,-.2,
    .3,0,.4,0,.4,-.2,
    -.3,0,-.2,-.2,-.4,-.2,
    -.3,0,-.4,0,-.4,-.2,
    0.3,0.2,.4,.2,.4,0,
    -0.3,0.2,-.4,.2,-.4,0,
    .4,0,.3,.2,.3,0,
    -.4,0,-.3,.2,-.3,0,
    0,0.2,-.4,.5,.4,.5,
    0,0.2,.4,.5,.4,.2,
    0,0.2,-.4,.5,-.4,.2,
    -.4,.5,-.1,.5,-.25,.7,
    .4,.5,.1,.5,.25,.7,
    .4,.5,.4,-.5,.5,0,
    -.4,.5,-.4,-.5,-.5,0,
];

//Set up actions for HTML UI elements
function addActionsForHtmlUI() {
    //Button events (shape type)
    document.getElementById('green').onclick = function() {g_selectedColor = [0.0, 1.0, 0.0, 1.0];};
    document.getElementById('red').onclick = function() {g_selectedColor = [1.0, 0.0, 0.0, 1.0];};
    document.getElementById('clearButton').onclick = function() {g_shapesList = []; renderAllShapes();};
    document.getElementById('eraserButton').onclick = function() {g_selectedColor = [canvasColor[0], canvasColor[1], canvasColor[2], 1.0];};

    document.getElementById('pointButton').onclick = function() {g_selectedType = POINT; };
    document.getElementById('triangleButton').onclick = function() {g_selectedType = TRIANGLE; };
    document.getElementById('circleButton').onclick = function() {g_selectedType = CIRCLE; };
    document.getElementById('imgButton').onclick = function() {drawImg(picCoords); };
    document.getElementById('undoButton').onclick = function() {g_shapesList.pop(); renderAllShapes(); };

    document.getElementById('saveColor').onclick = function() {saveColor(); };
    document.getElementById('palette1').onclick = function() {setColor();};

    document.getElementById('canvasColor1').onclick = function() {canvasColor = [1.0, 1.0, 1.0]; updateCanvasColor();};
    document.getElementById('canvasColor2').onclick = function() {canvasColor = [0.128, 0.128, 0.128]; updateCanvasColor();};
    document.getElementById('canvasColor3').onclick = function() {canvasColor = [0.0, 0.0, 0.0]; updateCanvasColor();};
    document.getElementById('canvasColor4').onclick = function() {canvasColor = [0.34, 0.56, 0.89]; updateCanvasColor();};
    

    //Slider events (shape type)
    document.getElementById('redSlider').addEventListener('mouseup', function () {g_selectedColor[0] = this.value/100;});
    document.getElementById('greenSlider').addEventListener('mouseup', function () {g_selectedColor[1] = this.value/100;});
    document.getElementById('blueSlider').addEventListener('mouseup', function () {g_selectedColor[2] = this.value/100;});

    document.getElementById('sizeSlider').addEventListener('mouseup', function () {g_selectedSize = this.value;});
    document.getElementById('circleSlider').addEventListener('mouseup', function () {g_selectedSegment = this.value;});
}

let savedColor;
function saveColor() {
    //Update the palette button
    const paletteButton = document.getElementById('palette1');
    paletteButton.style.backgroundColor = `rgb(${g_selectedColor[0] * 255}, ${g_selectedColor[1] * 255}, ${g_selectedColor[2] * 255})`;
    paletteButton.style.color = `rgb(${g_selectedColor[0] * 255}, ${g_selectedColor[1] * 255}, ${g_selectedColor[2] * 255})`;

    //Save selected color
    savedColor = [...g_selectedColor];
}

function setColor() {
    //Update sliders to the saved color
    const [r, g, b] = savedColor;
    document.getElementById('redSlider').value = r * 100;
    document.getElementById('greenSlider').value = g * 100;
    document.getElementById('blueSlider').value = b * 100;

    //Update the current selected color
    g_selectedColor = [...savedColor];
}

function drawImg(vertices) {
    var n = vertices.length/2;

    // Create a buffer object
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }
    
    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Write data into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
    }
    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    
    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);
    
    gl.drawArrays(gl.TRIANGLES, 0, n);
}

let canvasColor = [0.0, 0.0, 0.0];
function updateCanvasColor() {
    gl.clearColor(canvasColor[0], canvasColor[1], canvasColor[2], 1.0); 
    gl.clear(gl.COLOR_BUFFER_BIT);
}

function main() {
    setupWebGL();
    connectVariablesToGLSL();

    addActionsForHtmlUI();

    // Register function (event handler) to be called on a mouse press
    canvas.onmousedown = click;
    canvas.onmousemove = function(ev) {if(ev.buttons == 1) { click(ev) }};

    // Specify the color for clearing <canvas>
    gl.clearColor(canvasColor[0], canvasColor[1], canvasColor[2], 1.0);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);
}


var g_shapesList = [];

// var g_points = [];  // The array for the position of a mouse press
// var g_colors = [];  // The array to store the color of a point
// var g_sizes = [];
function click(ev) {
    //extract event click and return it in WebGL coords
    let [x, y] = convertCoordinatesEventToGL(ev);

    let point;
    if (g_selectedType == POINT) {
        point = new Point();
    } else if (g_selectedType == TRIANGLE) {
        point = new Triangle();
    } else {
        point = new Circle();
        point.segments = g_selectedSegment;
    }

    point.position = [x, y];
    point.color = g_selectedColor.slice();
    point.size = g_selectedSize;

    g_shapesList.push(point);
    

    // Store the coordinates to g_points array
    // g_points.push([x, y]);
    
    // g_colors.push(g_selectedColor.slice());

    // g_sizes.push(g_selectedSize);

    
    // Store the coordinates to g_points array
    // if (x >= 0.0 && y >= 0.0) {      // First quadrant
    //     g_colors.push([1.0, 0.0, 0.0, 1.0]);  // Red
    // } else if (x < 0.0 && y < 0.0) { // Third quadrant
    //     g_colors.push([0.0, 1.0, 0.0, 1.0]);  // Green
    // } else {                         // Others
    //     g_colors.push([1.0, 1.0, 1.0, 1.0]);  // White
    // }

    //draw every shape that should be on canvas
    renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
    var x = ev.clientX; // x coordinate of a mouse pointer
    var y = ev.clientY; // y coordinate of a mouse pointer
    var rect = ev.target.getBoundingClientRect();

    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

    return ([x, y]);
}

//based on some data structure that is holding all the information about what to draw, 
// actually draw all the shapes.
function renderAllShapes() {
    var startTime = performance.now();

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);

    // var len = g_points.length;
    var len = g_shapesList.length;

    for(var i = 0; i < len; i++) {
        g_shapesList[i].render();
    }

    var duration = performance.now() - startTime;
    sendTextToHTML("numDot: " + len + " ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration)/10, "numDot");
}

function sendTextToHTML(text, htmlID) {
    var htmlElem = document.getElementById(htmlID);
    if (!htmlElem) {
        console.log('Failed to get ' + htmlID + ' from HTML');
        return;
    }
    htmlElem.innerHTML = text;
}
