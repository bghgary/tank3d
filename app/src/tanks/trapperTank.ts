import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { TrapTank } from "./trapTank";

export class TrapperTank extends TrapTank {
    protected override readonly _trapSource = this._world.sources.trap.tankTri;

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.trapper, parent);
    }
}
