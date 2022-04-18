import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { BulletTank } from "./bulletTank";

export class SniperTank extends BulletTank {
    public override readonly cameraRadiusMultiplier: number = this.cameraRadiusMultiplier * 1.2;

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.sniper, parent);
    }
}
