import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { World } from "../world";
import { BulletTank } from "./bulletTank";
import { Tank } from "./tank";

export class TwinTank extends BulletTank {
    private _barrelIndex = 0;

    public constructor(world: World, parent: TransformNode, previousTank?: Tank) {
        super("Twin", TwinTank.CreateNode(world.sources, parent), {
            reloadTime: 0.6,
        }, world, previousTank);
    }

    public static CreateNode(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.createTwinTank(parent);
    }

    public override shoot(): void {
        if (this._reloadTime === 0) {
            this._shootFrom(this._barrels[this._barrelIndex]!);
            this._barrelIndex = (this._barrelIndex + 1) % this._barrels.length;
            this._reloadTime = this._properties.reloadTime;
        }

        Tank.prototype.shoot.call(this);
    }
}
