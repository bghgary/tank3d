import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

export class TripletTank extends BulletTank {
    private _barrelToggle = false;

    public override shoot(): void {
        if (this._reloadTime === 0) {
            if (this._barrelToggle) {
                this._shootFrom(this._barrels[0]!);
            } else {
                this._shootFrom(this._barrels[1]!);
                this._shootFrom(this._barrels[2]!);
            }

            this._reloadTime = this._properties.reloadTime / 2;
            this._barrelToggle = !this._barrelToggle;
        }

        PlayerTank.prototype.shoot.call(this);
    }

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.triplet, parent);
    }
}
