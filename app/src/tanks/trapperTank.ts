import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { PlayerTank } from "./playerTank";
import { TrapTank } from "./trapTank";

export class TrapperTank extends TrapTank {
    public constructor(world: World, parent: TransformNode, previousTank?: PlayerTank) {
        super(world, TrapperTank.CreateNode(world.sources, parent), previousTank);
    }

    public static CreateNode(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.trapper, parent);
    }
}
