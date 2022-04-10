import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { TrapTank } from "./trapTank";

export class TrapperTank extends TrapTank {
    protected override readonly _trapSource = this._world.sources.trap.tankTriangle;

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.trapper, parent);
    }
}
