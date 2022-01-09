import { Effect } from "@babylonjs/core/Materials/effect";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Scene } from "@babylonjs/core/scene";

Effect.ShadersStore.gridVertexShader = `precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 vPosition;

void main() {
    vPosition = position;
    gl_Position = worldViewProjection * vec4(position, 1.);
}`;

Effect.ShadersStore.gridPixelShader = `precision highp float;
uniform float halfSize;
varying vec3 vPosition;

float isPointOnLine(float position, float differentialLength) {
    float fractionPartOfPosition = position - floor(position + 0.5);
    fractionPartOfPosition /= differentialLength;
    fractionPartOfPosition = clamp(fractionPartOfPosition, -1., 1.);
    float result = 0.5 + 0.5 * cos(fractionPartOfPosition * 3.14159);
    return result;
}

void main() {
    const vec3 mainColor = vec3(0.6, 0.6, 0.6);
    const vec3 lineColor = vec3(0.5, 0.5, 0.5);
    float differentialLengthX = length(vec2(dFdx(vPosition.x), dFdy(vPosition.x))) * 1.41421;
    float differentialLengthZ = length(vec2(dFdx(vPosition.z), dFdy(vPosition.z))) * 1.41421;
    float x = isPointOnLine(vPosition.x, differentialLengthX);
    float z = isPointOnLine(vPosition.z, differentialLengthZ);
    float grid = clamp(x + z, 0., 1.);
    vec3 color = mix(mainColor, lineColor, grid);
    float borderX = 1. - smoothstep(halfSize - differentialLengthX, halfSize + differentialLengthX, abs(vPosition.x));
    float borderZ = 1. - smoothstep(halfSize - differentialLengthZ, halfSize + differentialLengthZ, abs(vPosition.z));
    color *= 0.5 + 0.5 * borderX * borderZ;
    glFragColor = vec4(color.rgb, 1.);
}`;

export function CreateGridMaterial(scene: Scene, size: number): ShaderMaterial {
    const material = new ShaderMaterial("grid", scene, "grid", { uniforms: ["worldViewProjection", "halfSize"] });
    material.setFloat("halfSize", size * 0.5);
    material.disableDepthWrite = true;
    return material;
}
