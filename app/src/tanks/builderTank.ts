import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { PlayerTank } from "./playerTank";
import { TrapTank } from "./trapTank";

export class BuilderTank extends TrapTank {
    protected override readonly _trapSource = this._world.sources.trap.tankQuad;

    public constructor(world: World, parent: TransformNode, previousTank?: PlayerTank) {
        super(world, BuilderTank.CreateMesh(world.sources, parent), previousTank);
        this._trapSource = world.sources.trap.tankQuad;
    }

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.builder, parent);
    }
}
