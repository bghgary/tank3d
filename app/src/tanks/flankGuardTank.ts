import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Bullets } from "../bullets";
import { Sources } from "../sources";
import { World } from "../world";
import { BarrelTank } from "./barrelTank";
import { Tank } from "./tank";

export class FlankGuardTank extends BarrelTank {
    public constructor(world: World, bullets: Bullets, previousTank?: Tank) {
        super("Flank Guard Tank", FlankGuardTank.CreateNode(world.sources), {}, world, bullets, previousTank);
    }

    public static CreateNode(sources: Sources): TransformNode {
        return sources.createFlankGuardTank(undefined, "player");
    }
}
