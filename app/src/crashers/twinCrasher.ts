import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { BulletCrasher } from "./bulletCrasher";

const CHASE_ANGLE = 0.02 * Math.PI;

export class TwinCrasher extends BulletCrasher {
    private _barrelIndex = 0;

    protected override _shoot(direction: Vector3): void {
        if (this._reloadTime === 0) {
            const angle = Math.acos(Vector3.Dot(this._node.forward, direction));
            if (angle < CHASE_ANGLE) {
                this._shootFrom(this._barrels[this._barrelIndex]!);
                this._barrelIndex = (this._barrelIndex + 1) % this._barrels.length;
                this._reloadTime = this._metadata.reload;
            }
        }
    }
}
