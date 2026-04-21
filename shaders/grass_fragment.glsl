#version 300 es
precision mediump float;
precision mediump sampler2DArray;

in vec2 textureCoordF;
in float instanceF;
in float flowerTimerF;

uniform sampler2DArray textureSample;
uniform vec3 bottomColorDead;
uniform vec3 topColorDead;
uniform vec3 bottomColorLiving;
uniform vec3 topColorLiving;

out vec4 displayColor;

void main() {
    // displayColor = vec4(textureCoord, instanceF, 1.0f);
    float isFlower = float(instanceF < 2.0f);
    vec4 textureColor = texture(textureSample, vec3(textureCoordF, instanceF));

    //Grass
    vec3 grassColorDead = mix(bottomColorDead, topColorDead, textureCoordF.y * 2.f);
    vec3 grassColorLiving = mix(bottomColorLiving, topColorLiving, textureCoordF.y * 2.f);
    // vec3 grassColor = mix(vec3(1.0f, 1.0f, 1.0f), vec3(1.0f, 0.0f, 0.0f), flowerTimerF);
    vec3 testColor = mix(grassColorDead, grassColorLiving, flowerTimerF);

    //Flower
    // vec
    float flowerAlpha = mix(0.0f, textureColor.a * textureColor.b, (flowerTimerF > textureCoordF.y)) * flowerTimerF;

    //Mixing Foliage
    vec3 colors = mix(testColor, vec3(1.0f, 0.0f, 0.0f), isFlower);
    float alpha = mix(0.0f, flowerAlpha, isFlower);
    displayColor = vec4(colors, alpha);
}