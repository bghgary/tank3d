import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { SniperTank } from "./sniperTank";

export class GatlingGunTank extends SniperTank {
    public static override Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.gatlingGun, parent);
    }
}
