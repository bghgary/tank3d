import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Bullets } from "../bullets";
import { Sources } from "../sources";
import { World } from "../world";
import { BarrelTank } from "./barrelTank";
import { Tank } from "./tank";

export class PounderTank extends BarrelTank {
    public constructor(world: World, bullets: Bullets, previousTank?: Tank) {
        super("Pounder Tank", PounderTank.CreateNode(world.sources), {
            bulletDamage: 2,
            bulletHealth: 2,
            reloadTime: 2,
        }, world, bullets, previousTank);
    }

    public static CreateNode(sources: Sources): TransformNode {
        return sources.createPounderTank(undefined, "player");
    }
}
