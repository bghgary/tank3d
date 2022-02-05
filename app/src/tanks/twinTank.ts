import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Bullets } from "../bullets";
import { Sources } from "../sources";
import { World } from "../world";
import { Tank } from "../tank";

export class TwinTank extends Tank {
    public constructor(world: World, bullets: Bullets, previousTank?: Tank) {
        super("Twin Tank", TwinTank.CreateNode(world.sources), {}, world, bullets, previousTank);
    }

    public static CreateNode(sources: Sources): TransformNode {
        return sources.createTwinTank(undefined, "player");
    }
}
