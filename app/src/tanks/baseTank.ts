import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Bullets } from "../bullets";
import { Sources } from "../sources";
import { World } from "../world";
import { BarrelTank } from "./barrelTank";

export class BaseTank extends BarrelTank {
    public constructor(world: World, bullets: Bullets) {
        super("Tank", BaseTank.CreateNode(world.sources), {}, world, bullets);
    }

    public static CreateNode(sources: Sources): TransformNode {
        return sources.createBaseTank(undefined, "player");
    }
}
