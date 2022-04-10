import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { BulletTank } from "./bulletTank";


export class AssassinTank extends BulletTank {
    public override cameraRadiusMultiplier = 1.4;

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.assassin, parent);
    }
}
