import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { SniperTank } from "./sniperTank";

export class AssassinTank extends SniperTank {
    public override readonly cameraRadiusMultiplier: number = this.cameraRadiusMultiplier * 1.2;

    public static override CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.assassin, parent);
    }
}
