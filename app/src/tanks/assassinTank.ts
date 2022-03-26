import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

export class AssassinTank extends BulletTank {
    public constructor(world: World, parent: TransformNode, previousTank?: PlayerTank) {
        super(world, AssassinTank.CreateMesh(world.sources, parent), previousTank);
    }

    public override CameraRadiusMultiplier = 1.4;

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.assassin, parent);
    }
}
