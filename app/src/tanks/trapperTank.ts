import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { TrapTank } from "./trapTank";

export class TrapperTank extends TrapTank {
    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.trapper, parent);
    }
}
