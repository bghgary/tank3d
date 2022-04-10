import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

export class TwinSniperTank extends BulletTank {
    private _barrelIndex = 0;

    public override cameraRadiusMultiplier = 1.2;

    public override shoot(): void {
        if (this._reloadTime === 0) {
            this._shootFrom(this._barrels[this._barrelIndex]!);
            this._barrelIndex = (this._barrelIndex + 1) % this._barrels.length;
            this._reloadTime = this._properties.reloadTime * 0.5;
        }

        PlayerTank.prototype.shoot.call(this);
    }

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.twinSniper, parent);
    }
}