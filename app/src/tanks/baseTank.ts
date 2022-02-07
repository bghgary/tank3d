import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { World } from "../world";
import { BulletTank } from "./bulletTank";
import { Tank } from "./tank";

export class BaseTank extends BulletTank {
    public constructor(world: World, parent: TransformNode, previousTank?: Tank) {
        super("Tank", BaseTank.CreateNode(world.sources, parent), {}, world, previousTank);
    }

    public static CreateNode(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.createBaseTank(parent);
    }
}
