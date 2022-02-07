import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { World } from "../world";
import { BulletTank } from "./bulletTank";
import { Tank } from "./tank";

export class SniperTank extends BulletTank {
    public constructor(world: World, parent: TransformNode, previousTank?: Tank) {
        super("Sniper", SniperTank.CreateNode(world.sources, parent), {
            projectileSpeed: 2,
            reloadTime: 2,
        }, world, previousTank);
    }

    public static CreateNode(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.createSniperTank(parent);
    }
}
