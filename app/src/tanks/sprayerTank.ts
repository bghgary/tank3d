import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Entity } from "../entity";
import { Sources } from "../sources";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

export class SprayerTank extends BulletTank {
    private _smallReloadTime = 0;

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.sprayer, parent);
    }

    public override update(deltaTime: number, onDestroy: (entity: Entity) => void): void {
        this._smallReloadTime = Math.max(this._smallReloadTime - deltaTime, 0);
        super.update(deltaTime, onDestroy);
    }

    public override shoot(): void {
        if (this._reloadTime === 0) {
            this._shootFrom(this._barrels[0]!);
            this._reloadTime = this._properties.reloadTime;
        }

        if (this._smallReloadTime === 0) {
            this._shootFrom(this._barrels[1]!);
            this._smallReloadTime = this._properties.reloadTime * 1.8;
        }

        PlayerTank.prototype.shoot.call(this);
    }
}
