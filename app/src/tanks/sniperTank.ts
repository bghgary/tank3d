import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

export class SniperTank extends BulletTank {
    public constructor(world: World, parent: TransformNode, previousTank?: PlayerTank) {
        super(world, SniperTank.CreateMesh(world.sources, parent), previousTank);
    }

    public override readonly cameraRadiusMultiplier = 1.2;

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.sniper, parent);
    }
}
