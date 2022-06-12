import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { SniperTank } from "./sniperTank";

export class SearcherTank extends SniperTank {
    private _secondaryActive = false;

    public override secondary(active: boolean): void {
        if (active) {
            if (!this._secondaryActive) {
                this._world.pointerPosition.subtractToRef(this._node.position, this.cameraTargetOffset);
                this.cameraTargetOffset.normalize().scaleInPlace(7);
                this._secondaryActive = true;
            }
        } else {
            this.cameraTargetOffset.setAll(0);
            this._secondaryActive = false;
        }
    }

    public static override Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.searcher, parent);
    }
}
