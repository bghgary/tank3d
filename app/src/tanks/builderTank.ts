import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { TrapTank } from "./trapTank";

export class BuilderTank extends TrapTank {
    protected override readonly _trapSource = this._world.sources.trap.tankQuad;

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.builder, parent);
    }
}
