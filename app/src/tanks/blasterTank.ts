import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Barrel } from "../components/barrel";
import { Sources } from "../sources";
import { BulletTank } from "./bulletTank";

const BULLETS_PER_SHOT = 5;

export class BlasterTank extends BulletTank {
    public override _shootFrom(barrel: Barrel): void {
        for (let i = 0; i < BULLETS_PER_SHOT; ++i) {
            super._shootFrom(barrel);
        }
    }

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.blaster, parent);
    }
}
