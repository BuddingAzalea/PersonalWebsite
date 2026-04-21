#version 300 es
precision mediump float;

const float size = 16.0f;
const float windStrengthGrass = 4.0f;
const float windStrengthFlower = 2.0f;
in vec2 vertexPosition;
in vec2 textureCoordsV;

in vec2 position;
in float instanceV;
in float flowerTimerV;

out vec2 textureCoordF;
out float instanceF;
out float flowerTimerF;
out float test;

uniform vec2 canvasSize;

uniform float timeValue;

void noiseFunction(in float x, in float y, in float t, out float val) {
    val = sin(0.005f * (x * 0.13f + y) + t) - 0.5f * cos(0.02f * (x + 0.5f * y) + 2.6f * t - 1.32f) + 0.25f * cos(0.034f * y + t) * sin(0.05f - t + 0.64f) + 2.*sin(x + y);
}

void main() {
    float noisevalues = 0.f;
    float isFlower = float(instanceV < 2.0);

    float windStrength = mix(windStrengthGrass, windStrengthFlower, isFlower);
    noiseFunction(position.x, position.y, timeValue, noisevalues);
    vec2 windtransform = vec2(windStrength, 0.0f) * noisevalues * textureCoordsV.y;
    // vec2 windtransform = vec2(windStrength, 0.0f) * textureCoordsV.y;
    vec2 targetVertexPosition = vertexPosition * size + position + windtransform;
    vec2 clipPosition = (targetVertexPosition / canvasSize) * 2.0f - 1.0f;

    gl_Position = vec4(clipPosition, 0.0f, 1.0f);

    textureCoordF = textureCoordsV;
    instanceF = instanceV;
    flowerTimerF = flowerTimerV;
    test = float(instanceF < 2.0);
}
