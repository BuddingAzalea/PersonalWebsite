#version 300 es
precision mediump float;

const float size = 16.0f;
const float windStrength = 1.0f;
in vec2 vertexPosition;
in vec2 textureCoordsV;
in vec2 position;
in float instanceV;

out float instanceF;
out vec2 textureCoordF;

uniform vec2 canvasSize;

uniform float timeValue;

void noiseFunction(in float x, in float y, in float t, out float val) {
    val = sin(0.005*(x*0.13+y)+t) - 0.5*cos(0.02*(x+0.5*y)+2.6*t-1.32) + 0.25*cos(0.034*y+t)*sin(0.05-t+0.64) + sin(x+y);
}

void main() {
    float noisevalues = 0.;
    noiseFunction(position.x, position.y, timeValue, noisevalues);
    vec2 windtransform = vec2(windStrength, 0.0f) * noisevalues * textureCoordsV.y;
    vec2 targetVertexPosition = vertexPosition * size + position +windtransform;
    vec2 clipPosition = (targetVertexPosition / canvasSize) * 2.0f - 1.0f;
    gl_Position = vec4(clipPosition, clipPosition.y, 1.0f);
    textureCoordF = textureCoordsV;
    instanceF = instanceV;
}


