import { Color3 } from "@babylonjs/core/Maths/math.color";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";

const FLASH_DAMAGE_COLOR = new Color3(1, 0, 0);
const FLASH_DAMAGE_DURATION = 1 / 60;
const FLASH_INACTIVE_COLOR = Color3.White();
const FLASH_INACTIVE_SPEED = 8;

export const enum FlashState {
    None,
    Damage,
    Idle
}

interface Color {
    original: Color3;
    instance: Color3;
}

export class Flash {
    private readonly _colors: Array<Color>;

    private _state = FlashState.None;
    private _time = 0;

    public constructor(node: TransformNode) {
        const meshes = node.getChildMeshes(false, node => !!(node as AbstractMesh).instancedBuffers);
        if (node instanceof AbstractMesh && node.instancedBuffers) {
            meshes.push(node);
        }

        this._colors = meshes.map(mesh => {
            const original = mesh.instancedBuffers["color"];
            const instance = mesh.instancedBuffers["color"] = original.clone();
            return { original: original, instance: instance };
        });
    }

    public setState(value: FlashState): void {
        this._state = value;
        this._time = 0;

        if (this._state === FlashState.Damage) {
            for (const color of this._colors) {
                color.instance.copyFrom(FLASH_DAMAGE_COLOR);
            }
        } else {
            for (const color of this._colors) {
                color.instance.copyFrom(color.original);
            }
        }
    }

    public update(deltaTime: number): void {
        if (this._state === FlashState.None) {
            return;
        }

        this._time += deltaTime;

        if (this._state === FlashState.Damage) {
            if (this._time > FLASH_DAMAGE_DURATION) {
                this.setState(FlashState.None);
            }
        } else {
            const t = (Math.sin(this._time * Math.PI * FLASH_INACTIVE_SPEED) * 0.5 + 0.5) * 0.5;
            for (const color of this._colors) {
                Color3.LerpToRef(color.original, FLASH_INACTIVE_COLOR, t, color.instance);
            }
        }
    }
}
