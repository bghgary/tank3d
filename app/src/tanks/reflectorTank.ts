import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable, Nullable } from "@babylonjs/core/types";
import { ProximityCollider } from "../colliders/colliders";
import { Collisions } from "../collisions";
import { getThreatValue } from "../common";
import { WeaponProperties } from "../components/weapon";
import { Entity } from "../entity";
import { TmpVector3 } from "../math";
import { Bullet } from "../projectiles/bullets";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { SniperTank } from "./sniperTank";

const TARGET_RADIUS = 10;
const MAX_BOUNCE_COUNT = 3;

export class ReflectorTank extends SniperTank {
    protected override readonly _bulletConstructor = ReflectorBullet;
    protected override readonly _bulletSource = this._world.sources.bullet.tank;

    public static override Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.reflector, parent);
    }
}

class ReflectorBullet extends Bullet {
    private readonly _collisions: Collisions;
    private _proximityCollider: Nullable<ProximityCollider> = null;
    private _targetColliderReady = 0;
    private _targetThreatValue = 0;
    private _bounces = MAX_BOUNCE_COUNT;
    private readonly _targetDirection = new Vector3();

    public constructor(world: World, owner: Entity, node: TransformNode, barrelNode: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        super(world, owner, node, barrelNode, properties, duration);

        this._collisions = world.collisions;
    }

    public override update(deltaTime: number, onDestroy: () => void): void {
        if (this._proximityCollider && --this._targetColliderReady === 0) {
            if (this._targetThreatValue > 0) {
                this.velocity.copyFrom(this._targetDirection).scaleInPlace(this._targetVelocity.length());
                this._targetVelocity.copyFrom(this.velocity);
                --this._bounces;
            }

            this._collisions.unregisterProximity(this._proximityCollider);
            this._proximityCollider = null;
            this._targetThreatValue = 0;
        }

        super.update(deltaTime, onDestroy);
    }

    public override postCollide(other: Entity): number {
        if (this._bounces > 0 && !this._proximityCollider) {
            this._proximityCollider = new ProximityCollider(this._node, TARGET_RADIUS,
                (entity) => entity !== other && entity !== this.owner && entity.owner !== this.owner,
                (entity) => {
                    const deltaPosition = TmpVector3[0].copyFrom(entity.position).subtractInPlace(this._node.position);
                    const targetDistance = deltaPosition.length();
                    const threatValue = getThreatValue(entity, targetDistance);
                    if (threatValue > this._targetThreatValue) {
                        this._targetThreatValue = threatValue;
                        this._targetDirection.copyFrom(deltaPosition).normalizeFromLength(targetDistance);
                    }
                });

            this._collisions.registerProximity(this._proximityCollider);

            // Wait until collisions have executed.
            this._targetColliderReady = 2;
        }

        return super.postCollide(other);
    }
}