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
uniform vec3 flowerColorBright;
uniform vec3 flowerColorDark;

out vec4 displayColor;

void main() {
    // displayColor = vec4(textureCoord, instanceF, 1.0f);
    float isFlower = float(instanceF < 4.0f);
    vec4 textureColor = texture(textureSample, vec3(textureCoordF, instanceF));

    //Grass
    vec3 grassColorDead = mix(bottomColorDead, topColorDead, textureCoordF.y * 2.f);
    vec3 grassColorLiving = mix(bottomColorLiving, topColorLiving, textureCoordF.y * 2.f);
    // vec3 grassColor = mix(vec3(1.0f, 1.0f, 1.0f), vec3(1.0f, 0.0f, 0.0f), flowerTimerF);
    vec3 grassColor = mix(grassColorDead, grassColorLiving, flowerTimerF);

    //Flower
    // vec

    vec3 stemColorDead = mix(bottomColorDead, topColorDead, textureCoordF.y * 1.5f);
    vec3 stemColorLiving = mix(bottomColorLiving, topColorLiving, textureCoordF.y * 2.f);
    // vec3 grassColor = mix(vec3(1.0f, 1.0f, 1.0f), vec3(1.0f, 0.0f, 0.0f), flowerTimerF);
    vec3 stemColor = mix(stemColorDead, stemColorLiving, flowerTimerF);

    float flowerAlpha = mix(0.0f, textureColor.a * float(0.0f < textureColor.b), (flowerTimerF >= textureColor.b)) * flowerTimerF;
    float stemAlpha = textureColor.a * float(0.0f < textureColor.r);

    vec3 flowerColor = mix(flowerColorDark, flowerColorBright, textureColor.b);
    vec3 combinedColor = mix(stemColor, flowerColor, float(0.0f < textureColor.b));
    float combinedAlpha = mix(stemAlpha, flowerAlpha, float(0.0f < textureColor.b));

    //Mixing Foliage
    vec3 colors = mix(grassColor, combinedColor, isFlower);
    // vec3 colors=vec3(test, 0.0, 0.0);
    float alpha = mix(textureColor.a, combinedAlpha, isFlower);

    displayColor = vec4(colors, alpha);
}