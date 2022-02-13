import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { World } from "../world";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

export class PounderTank extends BulletTank {
    public constructor(world: World, parent: TransformNode, previousTank?: PlayerTank) {
        super("Pounder", PounderTank.CreateNode(world.sources, parent), {
            projectileDamage: 2,
            projectileHealth: 2,
            reloadTime: 2,
        }, world, previousTank);
    }

    public static CreateNode(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.createPounderTank(parent);
    }
}
