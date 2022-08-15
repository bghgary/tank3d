import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Entity } from "../entity";
import { Collider } from "./collider";

export class TargetCollider extends Collider {
    protected override get _absoluteRadius(): number {
        return this._radius;
    }

    public constructor(node: TransformNode, radius: number, onCollide: (other: Entity) => void) {
        super(node, radius, null, (other) => {
            onCollide(other);
            return 0;
        });
    }
}
