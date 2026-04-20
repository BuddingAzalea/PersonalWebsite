#version 300 es
precision mediump float;

const float size = 16.0f;

in vec2 vertexPosition;
in vec2 textureCoordsV;
in vec2 position;
in float instanceV;

out float instanceF;
out vec2 textureCoordF;

uniform vec2 canvasSize;

uniform float timeValue;

void main() {
    vec2 targetVertexPosition = vertexPosition * size + position;
    vec2 clipPosition = (targetVertexPosition / canvasSize) * 2.0f - 1.0f;
    gl_Position = vec4(clipPosition, clipPosition.y, 1.0f);
    textureCoordF = textureCoordsV;
    instanceF = instanceV;
}