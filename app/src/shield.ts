import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { decayScalar } from "./math";
import { PlayerTankMetadata } from "./metadata";
import { Sources } from "./sources";

const MAX_VISIBLITY = 0.2;

export class Shield {
    private readonly _mesh: Mesh;
    private _targetVisibility = 0;

    public constructor(sources: Sources, parent: TransformNode) {
        this._mesh = sources.createShield(parent);
        this._mesh.scaling.setAll((parent.metadata as PlayerTankMetadata).shieldSize);
        this._mesh.visibility = MAX_VISIBLITY;
        this.enabled = true;
    }

    public setParent(parent: TransformNode): void {
        this._mesh.parent = parent;
        this._mesh.scaling.setAll((parent.metadata as PlayerTankMetadata).shieldSize);
    }

    public get size(): number {
        return this._mesh.scaling.x;
    }

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
        if (this._mesh.isEnabled()) {
            this._mesh.visibility = decayScalar(this._mesh.visibility, this._targetVisibility, deltaTime, 5);
            if (this._targetVisibility === 0 && this._mesh.visibility < 0.001) {
                this._mesh.setEnabled(false);
            }
        }
    }
}