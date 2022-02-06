import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Bullets } from "../bullets";
import { Sources } from "../sources";
import { World } from "../world";
import { BarrelTank } from "./barrelTank";
import { Tank } from "./tank";

export class SniperTank extends BarrelTank {
    public constructor(world: World, bullets: Bullets, previousTank?: Tank) {
        super("Sniper Tank", SniperTank.CreateNode(world.sources), {
            bulletSpeed: 2,
            reloadTime: 2,
        }, world, bullets, previousTank);
    }

    public static CreateNode(sources: Sources): TransformNode {
        return sources.createSniperTank(undefined, "player");
    }
}
