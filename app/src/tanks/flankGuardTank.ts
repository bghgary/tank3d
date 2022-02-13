import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { World } from "../world";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

export class FlankGuardTank extends BulletTank {
    public constructor(world: World, parent: TransformNode, previousTank?: PlayerTank) {
        super("Flank Guard", FlankGuardTank.CreateNode(world.sources, parent), {}, world, previousTank);
    }

    public static CreateNode(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.createFlankGuardTank(parent);
    }
}
