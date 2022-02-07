import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { World } from "../world";
import { DroneTank } from "./droneTank";
import { Tank } from "./tank";

export class DirectorTank extends DroneTank {
    public constructor(world: World, parent: TransformNode, previousTank?: Tank) {
        super("Director", DirectorTank.CreateNode(world.sources, parent), {
            projectileSpeed: 0.5,
            reloadTime: 3,
        }, world, previousTank);
    }

    public static CreateNode(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.createDirectorTank(parent);
    }
}
