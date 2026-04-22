#version 300 es
precision mediump float;
precision mediump sampler2DArray;

in vec2 textureCoordF;

uniform sampler2D textureSample;

out vec4 displayColor;

void main() {
    // displayColor = vec4(textureCoord, instanceF, 1.0f);
    vec4 textureColor = texture(textureSample, textureCoordF);

    displayColor = textureColor;
}