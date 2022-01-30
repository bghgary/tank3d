import { TransformNode } from "@babylonjs/core";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Sources } from "./sources";

const MAX_VISIBLITY = 0.2;
const DECAY_RATE = 5;

export class Shield {
    private _mesh: Mesh;
    private _targetVisibility = 0;

    public constructor(sources: Sources, parent: TransformNode, size: number, enabled: boolean) {
        this._mesh = sources.createShield(parent);
        this._mesh.scaling.setAll(size);
        this._mesh.visibility = enabled ? MAX_VISIBLITY : 0;
        this.enabled = enabled;
    }

    public get size() { return this._mesh.scaling.x; }

    public get enabled(): boolean {
        return this._mesh.isEnabled();
    }

    public set enabled(value: boolean) {
        if (value) {
            this._mesh.setEnabled(true);
            this._targetVisibility = MAX_VISIBLITY;
        } else {
            this._targetVisibility = 0;
        }
    }

    public update(deltaTime: number): void {
        const decayFactor = Math.exp(-deltaTime * DECAY_RATE);
        this._mesh.visibility = this._targetVisibility - (this._targetVisibility - this._mesh.visibility) * decayFactor;
        if (this._targetVisibility === 0 && this._mesh.visibility < 0.001) {
            this._mesh.setEnabled(false);
        }
    }
}