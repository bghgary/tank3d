import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { DirectorTank } from "./directorTank";

export class OverseerTank extends DirectorTank {
    protected override readonly _maxDroneCount: number = 6;

    public static override Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.overseer, parent);
    }
}
