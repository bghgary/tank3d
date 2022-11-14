import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { LancerTank } from "./lancerTank";

export class DoubleLancerTank extends LancerTank {
    public static override Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.doubleLancer, parent);
    }
}
