import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

export class DoubleTwinTank extends BulletTank {
    private _barrelIndex = 0;

    public override shoot(): void {
        if (this._reloadTime === 0) {
            this._shootFrom(this._barrels[this._barrelIndex]!);
            this._shootFrom(this._barrels[this._barrelIndex + 2]!);
            this._barrelIndex = (this._barrelIndex + 1) % 2;
            this._reloadTime = this._properties.reloadTime * 0.5;
        }

        PlayerTank.prototype.shoot.call(this);
    }

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.doubleTwin, parent);
    }
}
