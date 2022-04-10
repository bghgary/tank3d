import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "../sources";
import { BulletTank } from "./bulletTank";

export class SearcherTank extends BulletTank {
    private _secondaryActive = false;

    public override cameraRadiusMultiplier = 1.2;

    public override secondary(active: boolean): void {
        if (active) {
            if (!this._secondaryActive) {
                this._world.pointerPosition.subtractToRef(this._node.position, this.cameraTargetOffset).normalize().scaleInPlace(7);
                this._secondaryActive = true;
            }
        } else {
            this.cameraTargetOffset.setAll(0);
            this._secondaryActive = false;
        }
    }

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.searcher, parent);
    }
}
