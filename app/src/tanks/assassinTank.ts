import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { SniperTank } from "./sniperTank";

export class AssassinTank extends SniperTank {
    public override readonly cameraRadiusMultiplier: number = this.cameraRadiusMultiplier * 1.2;

    public static override Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.assassin, parent);
    }
}
