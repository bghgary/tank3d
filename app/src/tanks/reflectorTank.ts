import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable, Nullable } from "@babylonjs/core/types";
import { TargetCollider } from "../colliders/targetCollider";
import { Collisions } from "../collisions";
import { applyCollisionForce, getThreatValue } from "../common";
import { WeaponProperties } from "../components/weapon";
import { Entity } from "../entity";
import { TmpVector3 } from "../math";
import { Bullet } from "../projectiles/bullets";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { SniperTank } from "./sniperTank";

const TARGET_RADIUS = 10;

export class ReflectorTank extends SniperTank {
    protected override readonly _bulletConstructor = ReflectorBullet;
    protected override readonly _bulletSource = this._world.sources.bullet.tank;

    public static override Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.reflector, parent);
    }
}

class ReflectorBullet extends Bullet {
    private readonly _collisions: Collisions;
    private _targetCollider: Nullable<TargetCollider> = null;
    private _targetThreatValue = 0;
    private readonly _targetDirection = new Vector3();

    public constructor(world: World, owner: Entity, node: TransformNode, barrelNode: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        super(world, owner, node, barrelNode, properties, duration);

        this._collisions = world.collisions;
    }

    public override update(deltaTime: number, onDestroy: () => void): void {
        if (this._targetCollider) {
            if (this._targetThreatValue > 0) {
                this.velocity.copyFrom(this._targetDirection).scaleInPlace(this._targetVelocity.length());
                this._targetVelocity.copyFrom(this.velocity);

                this._targetThreatValue = 0;
            }

            this._collisions.unregister(this._targetCollider);
            this._targetCollider = null;
        }

        super.update(deltaTime, () => {
            if (this._targetCollider) {
                this._collisions.unregister(this._targetCollider);
                this._targetCollider = null;
            }

            onDestroy();
        });
    }

    protected override _onCollide(other: Entity): number {
        if (this.owner.type === other.type || (other.owner && this.owner.type === other.owner.type)) {
            return 1;
        }

        if (!this._targetCollider) {
            this._targetCollider = new TargetCollider(this._node, TARGET_RADIUS, (target) => {
                if (target !== other && target !== this.owner && target.owner !== this.owner) {
                    const deltaPosition = TmpVector3[0].copyFrom(target.position).subtractInPlace(this._node.position);
                    const targetDistance = deltaPosition.length();
                    const threatValue = getThreatValue(target, targetDistance);
                    if (threatValue > this._targetThreatValue) {
                        this._targetThreatValue = threatValue;
                        this._targetDirection.copyFrom(deltaPosition).normalizeFromLength(targetDistance);
                    }
                }
            });

            this._collisions.register(this._targetCollider);
        }

        if (other.damage.value > 0) {
            // No flash for bullet.
            this._health.takeDamage(other);
        }

        applyCollisionForce(this, other);
        return other.damage.time;
    }
}