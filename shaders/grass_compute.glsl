#version 300 es
precision mediump float;
precision mediump sampler2DArray;

in vec2 textureCoordF;
in float instanceF;

uniform sampler2DArray textureSample;
out vec4 displayColor;


void main() {
    // displayColor = vec4(textureCoord, instanceF, 1.0f);
    vec4 textureColor = texture(textureSample, vec3(textureCoordF, instanceF));
    displayColor = vec4(1.0,0.0,0.0, 1.0);
}