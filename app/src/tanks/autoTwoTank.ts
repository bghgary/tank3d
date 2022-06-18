import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { Nullable } from "@babylonjs/core/types";
import { TargetCollider } from "../collisions";
import { findNode } from "../common";
import { Entity, EntityType, IsWeapon } from "../entity";
import { angleBetween, decayScalar, TmpVector3 } from "../math";
import { PlayerTankMetadata } from "../metadata";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

const TARGET_RADIUS = 10;
const TARGET_MAX_ANGLE = 0.6 * Math.PI;

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
    private readonly _restAngle: number;
    private _targetDistance = Number.MAX_VALUE;
    private _targetAngle = 0;
    private _targetRadius = 0;
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

        if (this._targetDistance === Number.MAX_VALUE) {
            this._node.rotation.y = decayScalar(this._node.rotation.y, this._restAngle, deltaTime, 2);
        } else {
            const angle = decayScalar(this._node.rotation.y, this._targetAngle, deltaTime, 20);
            this._node.rotation.y = angle;

            const maxAngle = Math.atan(this._targetRadius / this._targetDistance);
            if (Math.abs(angle - this._targetAngle) < maxAngle) {
                this._targetAcquired = true;
            }

            this._targetDistance = Number.MAX_VALUE;
        }
    }

    public onCollide(target: Entity): void {
        const deltaPosition = TmpVector3[0].copyFrom(target.position).subtractInPlace(this._node.absolutePosition);
        const targetDistance = deltaPosition.length();
        const targetDirection = TmpVector3[1].copyFrom(deltaPosition).normalizeFromLength(targetDistance);
        const targetAngle = angleBetween(targetDirection, (this._node.parent as TransformNode).forward);
        if (Math.abs(targetAngle) < TARGET_MAX_ANGLE) {
            const distance = (target.type === EntityType.Shape ? TARGET_RADIUS : 0) + targetDistance;
            if (distance < this._targetDistance) {
                this._targetDistance = distance;
                this._targetAngle = targetAngle;
                this._targetRadius = target.size * 0.5;
            }
        }
    }
}
