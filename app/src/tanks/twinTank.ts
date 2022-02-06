import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Bullets } from "../bullets";
import { Sources } from "../sources";
import { World } from "../world";
import { BarrelTank } from "./barrelTank";
import { Tank } from "./tank";

export class TwinTank extends BarrelTank {
    private _barrelIndex = 0;

    public constructor(world: World, bullets: Bullets, previousTank?: Tank) {
        super("Twin Tank", TwinTank.CreateNode(world.sources), {
            reloadTime: 0.5,
        }, world, bullets, previousTank);
    }

    public static CreateNode(sources: Sources): TransformNode {
        return sources.createTwinTank(undefined, "player");
    }

    public override shoot(): void {
        if (this._reloadTime === 0) {
            this._shootFrom(this._barrels[this._barrelIndex]!, this._getBulletProperties());
            this._barrelIndex = (this._barrelIndex + 1) % this._barrels.length;
            this._reloadTime = this._properties.reloadTime;
        }

        Tank.prototype.shoot.call(this);
    }
}
