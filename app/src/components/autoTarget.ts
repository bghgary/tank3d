import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { getThreatValue } from "../common";
import { Entity } from "../entity";
import { angleBetween, decayScalar, TmpVector3 } from "../math";

const TARGET_MAX_ANGLE = 0.6 * Math.PI;

export class AutoTarget {
    private readonly _node: TransformNode;
    private readonly _restAngle: number;
    private _targetThreatValue = 0;
    private _targetAngle = 0;
    private _targetRadius = 0;
    private _targetDistance = 0;
    private _targetAcquired = false;

    public constructor(node: TransformNode) {
        this._node = node;
        this._restAngle = this._node.rotation.y;
    }

    public get targetAcquired(): boolean {
        return this._targetAcquired;
    }

    public update(deltaTime: number): void {
        this._targetAcquired = false;

        if (this._targetThreatValue === 0) {
            this._node.rotation.y = decayScalar(this._node.rotation.y, this._restAngle, deltaTime, 2);
        } else {
            const angle = decayScalar(this._node.rotation.y, this._targetAngle, deltaTime, 20);
            this._node.rotation.y = angle;

            const maxAngle = Math.atan(this._targetRadius / this._targetDistance);
            if (Math.abs(angle - this._targetAngle) < maxAngle) {
                this._targetAcquired = true;
            }

            this._targetThreatValue = 0;
        }
    }

    public onCollide(target: Entity): void {
        const deltaPosition = TmpVector3[0].copyFrom(target.position).subtractInPlace(this._node.absolutePosition);
        const targetDistance = deltaPosition.length();
        const targetDirection = TmpVector3[1].copyFrom(deltaPosition).normalizeFromLength(targetDistance);
        const targetAngle = angleBetween(targetDirection, (this._node.parent as TransformNode).forward);
        if (Math.abs(targetAngle) < TARGET_MAX_ANGLE) {
            const threatValue = getThreatValue(target, targetDistance);
            if (threatValue > this._targetThreatValue) {
                this._targetThreatValue = threatValue;
                this._targetAngle = targetAngle;
                this._targetRadius = target.size * 0.5;
                this._targetDistance = targetDistance;
            }
        }
    }
}
