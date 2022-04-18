import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { SniperTank } from "./sniperTank";

export class GatlingGunTank extends SniperTank {
    public static override CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.gatlingGun, parent);
    }
}
