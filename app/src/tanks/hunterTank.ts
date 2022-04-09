import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

export class HunterTank extends BulletTank {
    private _barrelIndex = 0;

    public constructor(world: World, parent: TransformNode, previousTank?: PlayerTank) {
        super(world, HunterTank.CreateMesh(world.sources, parent), previousTank);
    }

    public override cameraRadiusMultiplier = 1.25;

    public override shoot(): void {
        if (this._reloadTime === 0) {
            this._shootFrom(this._barrels[this._barrelIndex]!);
            this._barrelIndex = (this._barrelIndex + 1) % this._barrels.length;
            this._reloadTime = this._properties.reloadTime * (this._barrelIndex === 0 ? 0.8 : 0.2);
        }

        PlayerTank.prototype.shoot.call(this);
    }

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.hunter, parent);
    }
}
