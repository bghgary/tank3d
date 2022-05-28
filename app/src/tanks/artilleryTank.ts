import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { BulletTank } from "./bulletTank";

export class ArtilleryTank extends BulletTank {
    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.artillery, parent);
    }
}
