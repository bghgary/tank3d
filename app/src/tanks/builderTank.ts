import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { PlayerTank } from "./playerTank";
import { TrapTank } from "./trapTank";

export class BuilderTank extends TrapTank {
    public constructor(world: World, parent: TransformNode, previousTank?: PlayerTank) {
        super(world, BuilderTank.CreateMesh(world.sources, parent), world.sources.trap.tankQuad, previousTank);
    }

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.builder, parent);
    }
}
