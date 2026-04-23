#version 300 es
precision mediump float;

in vec2 vertexPosition;
in vec2 textureCoordsV;

out vec2 textureCoordF;

uniform vec2 position;
uniform vec2 canvasSize;
uniform vec2 size;
uniform float test;

void main() {
    vec2 targetVertexPosition = vertexPosition * size + position;
    vec2 clipPosition = (targetVertexPosition / canvasSize) * 2.0f - 1.0f;

    gl_Position = vec4(clipPosition, 0.0f, 1.0f);

    textureCoordF = textureCoordsV;
}
