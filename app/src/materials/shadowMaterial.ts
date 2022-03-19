import { Effect } from "@babylonjs/core/Materials/effect";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Scene } from "@babylonjs/core/scene";

Effect.ShadersStore["shadowVertexShader"] = `precision highp float;
#ifdef INSTANCES
    attribute vec4 world0;
    attribute vec4 world1;
    attribute vec4 world2;
    attribute vec4 world3;
#else
    uniform mat4 world;
#endif

attribute vec3 position;
uniform mat4 viewProjection;
varying vec3 vPosition;

void main() {
#ifdef INSTANCES
    mat4 finalWorld = mat4(world0, world1, world2, world3);
#else
    mat4 finalWorld = world;
#endif

    vPosition = position;
    gl_Position = viewProjection * finalWorld * vec4(position, 1.);
}`;

Effect.ShadersStore["shadowPixelShader"] = `precision highp float;
varying vec3 vPosition;

void main(void) {
    float value = exp(pow(length(vPosition) * 2.0, 4.0) * -10.0) * 0.25;
    gl_FragColor = vec4(0.0, 0.0, 0.0, value);
}`;

export function createShadowMaterial(scene: Scene): ShaderMaterial {
    const material = new ShaderMaterial("shadow", scene, "shadow", { uniforms: ["viewProjection", "world"] });
    material.disableDepthWrite = true;
    material.needAlphaBlending = () => true;
    return material;
}
