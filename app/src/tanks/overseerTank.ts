import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { DirectorTank } from "./directorTank";

export class OverseerTank extends DirectorTank {
    protected override readonly _maxDroneCount: number = 6;

    public static override CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.overseer, parent);
    }
}
