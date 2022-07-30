import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { DeepImmutable, Nullable } from "@babylonjs/core/types";
import { Collisions, TargetCollider } from "../collisions";
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
    private _targetCollisionToken: Nullable<IDisposable> = null;
    private _targetThreatValue = 0;
    private readonly _targetDirection = new Vector3();

    public constructor(world: World, owner: Entity, node: TransformNode, barrelNode: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        super(world, owner, node, barrelNode, properties, duration);

        this._collisions = world.collisions;
    }

    public override update(deltaTime: number, onDestroy: () => void): void {
        if (this._targetCollisionToken) {
            if (this._targetThreatValue > 0) {
                this.velocity.copyFrom(this._targetDirection).scaleInPlace(this._targetVelocity.length());
                this._targetVelocity.copyFrom(this.velocity);

                this._targetThreatValue = 0;
            }

            this._targetCollisionToken.dispose();
            this._targetCollisionToken = null;
        }

        super.update(deltaTime, () => {
            if (this._targetCollisionToken) {
                this._targetCollisionToken.dispose();
                this._targetCollisionToken = null;
            }

            onDestroy();
        });
    }

    public override onCollide(other: Entity): number {
        if (this.owner.type === other.type || (other.owner && this.owner.type === other.owner.type)) {
            return 1;
        }

        if (!this._targetCollisionToken) {
            this._targetCollisionToken = this._collisions.register([
                new TargetCollider(this._node.position, TARGET_RADIUS, (target) => {
                    if (target !== other && target !== this.owner && target.owner !== this.owner) {
                        const deltaPosition = TmpVector3[0].copyFrom(target.position).subtractInPlace(this._node.position);
                        const targetDistance = deltaPosition.length();
                        const threatValue = getThreatValue(target, targetDistance);
                        if (threatValue > this._targetThreatValue) {
                            this._targetThreatValue = threatValue;
                            this._targetDirection.copyFrom(deltaPosition).normalizeFromLength(targetDistance);
                        }
                    }
                })
            ]);
        }

        if (other.damage.value > 0) {
            // No flash for bullet.
            this._health.takeDamage(other);
        }

        applyCollisionForce(this, other);
        return other.damage.time;
    }
}