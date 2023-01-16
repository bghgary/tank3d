import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { getUpgradeNames } from "../ui/upgrades";
import { LancerTank } from "./lancerTank";

export class SpearTank extends LancerTank {
    public override readonly upgradeNames = getUpgradeNames("Spear", "Length");

    public static override Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.spear, parent);
    }
}
