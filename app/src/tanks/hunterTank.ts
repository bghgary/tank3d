import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { PlayerTank } from "./playerTank";
import { SniperTank } from "./sniperTank";

export class HunterTank extends SniperTank {
    private _barrelIndex = 0;

    public override readonly cameraRadiusMultiplier: number = this.cameraRadiusMultiplier * 1.05;

    public override shoot(): void {
        if (this._reloadTime === 0) {
            this._shootFrom(this._barrels[this._barrelIndex]!);
            this._barrelIndex = (this._barrelIndex + 1) % this._barrels.length;
            this._reloadTime = this._properties.reloadTime * (this._barrelIndex === 0 ? 0.8 : 0.2);
        }

        PlayerTank.prototype.shoot.call(this);
    }

    public static override Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.hunter, parent);
    }
}
