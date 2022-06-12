import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { Nullable } from "@babylonjs/core/types";
import { TargetCollider } from "../collisions";
import { findNode } from "../common";
import { Entity, EntityType, IsWeapon } from "../entity";
import { decayQuaternionToRef, decayVector3ToRef, TmpMatrix, TmpVector3 } from "../math";
import { PlayerTankMetadata } from "../metadata";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

const TARGET_RADIUS = 10;
const TARGET_MAX_ANGLE = 0.5 * Math.PI;

export class AutoTwoTank extends BulletTank {
    private readonly _tanks: Array<AutoTargetTank>;
    private _targetCollisionToken: Nullable<IDisposable> = null;
    private _barrelIndex = 0;

    public constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        const metadata = this._node.metadata as PlayerTankMetadata;
        this._tanks = metadata.tanks!.map((name) => new AutoTargetTank(findNode(this._node, name)));
    }

    public override dispose(): void {
        if (this._targetCollisionToken) {
            this._targetCollisionToken.dispose();
            this._targetCollisionToken = null;
        }

        super.dispose();
    }

    public override shoot(): void {
        if (this._reloadTime === 0) {
            if (this._tanks[this._barrelIndex]!.targetAcquired) {
                this._shootFrom(this._barrels[this._barrelIndex]!);
            }
            this._barrelIndex = (this._barrelIndex + 1) % this._barrels.length;
            this._reloadTime = this._properties.reloadTime / this._barrels.length;
        }

        PlayerTank.prototype.shoot.call(this);
    }

    public override update(deltaTime: number, onDestroy: (entity: Entity) => void): void {
        for (const tank of this._tanks) {
            tank.update(deltaTime);
        }

        if (!this._targetCollisionToken) {
            this._targetCollisionToken = this._world.collisions.register([
                new TargetCollider(this._node.position, TARGET_RADIUS * 2, (other) => {
                    if (this.inBounds && !IsWeapon(other.type) && other !== this && other.owner !== this) {
                        for (const tank of this._tanks) {
                            tank.onCollide(other);
                        }
                    }
                })
            ]);
        }

        super.update(deltaTime, onDestroy);
    }


    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.autoTwo, parent);
    }
}

class AutoTargetTank {
    private readonly _node: TransformNode;
    private readonly _restRotation: Quaternion;
    private _targetDistance = Number.MAX_VALUE;
    private _targetDirection = new Vector3();
    private _targetRadius = 0;
    private _targetAcquired = false;

    public constructor(node: TransformNode) {
        this._node = node;
        this._restRotation = this._node.rotationQuaternion!.clone();
    }

    public get targetAcquired(): boolean {
        return this._targetAcquired;
    }

    public update(deltaTime: number): void {
        this._targetAcquired = false;

        if (this._targetDistance === Number.MAX_VALUE) {
            const rotation = this._node.rotationQuaternion!;
            decayQuaternionToRef(rotation, this._restRotation, deltaTime, 2, rotation);
        } else {
            const forward = this._node.forward;
            const direction = TmpVector3[0];
            decayVector3ToRef(forward, this._targetDirection, deltaTime, 20, direction);

            const parent = this._node.parent as TransformNode;
            const invWorldMatrix = TmpMatrix[0];
            parent.getWorldMatrix().invertToRef(invWorldMatrix);
            Vector3.TransformNormalToRef(direction, invWorldMatrix, direction);
            this._node.setDirection(direction.normalize());

            const angle = Math.acos(Vector3.Dot(this._targetDirection, this._node.forward));
            const maxAngle = Math.atan(this._targetRadius / this._targetDistance);
            if (angle < maxAngle) {
                this._targetAcquired = true;
            }

            this._targetDistance = Number.MAX_VALUE;
        }
    }

    public onCollide(target: Entity): void {
        const position = this._node.absolutePosition;
        const parent = this._node.parent as TransformNode;
        const targetDirection = TmpVector3[0];
        target.position.subtractToRef(position, targetDirection);
        targetDirection.normalize();
        const angle = Math.acos(Vector3.Dot(parent.forward, targetDirection));
        if (angle < TARGET_MAX_ANGLE) {
            const distance =
                (target.type === EntityType.Shape ? TARGET_RADIUS : 0) +
                Vector3.Distance(position, target.position);

            if (distance < this._targetDistance) {
                this._targetDistance = distance;
                this._targetDirection.copyFrom(targetDirection);
                this._targetRadius = target.size * 0.5;
            }
        }
    }
}
