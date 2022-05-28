import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { BulletTank } from "./bulletTank";

export class SniperTank extends BulletTank {
    public override readonly cameraRadiusMultiplier: number = this.cameraRadiusMultiplier * 1.2;

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.sniper, parent);
    }
}
