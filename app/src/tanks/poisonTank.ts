import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

export class PoisonTank extends BulletTank {
    protected override readonly _bulletSource = this._world.sources.bullet.tankPoison;

    public constructor(world: World, parent: TransformNode, previousTank?: PlayerTank) {
        super(world, PoisonTank.CreateMesh(world.sources, parent), previousTank);
        this._bulletProperties.damage.poison = 1;
    }

    public override cameraRadiusMultiplier = 1.2;

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.poison, parent);
    }
}
