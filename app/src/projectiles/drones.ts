import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { DeepImmutable, Nullable } from "@babylonjs/core/types";
import { Collider, TargetCollider } from "../collisions";
import { applyCollisionForce, applyMovement } from "../common";
import { FlashState } from "../components/flash";
import { BarHealth, Health } from "../components/health";
import { WeaponProperties } from "../components/weapon";
import { Entity, EntityType } from "../entity";
import { decayVector3ToRef, TmpVector3 } from "../math";
import { World } from "../worlds/world";
import { Projectile, ProjectileConstructor, Projectiles } from "./projectiles";

const TARGET_RADIUS = 10;

export type DroneConstructor<T extends Drone> = ProjectileConstructor<T>;

export abstract class Drones<T extends Drone> extends Projectiles<T> {
    protected readonly _properties: DeepImmutable<WeaponProperties>;

    public constructor(world: World, parent: TransformNode, properties: DeepImmutable<WeaponProperties>) {
        super(world, "drones");
        this._root.parent = parent;
        this._properties = properties;
    }

    public add(constructor: DroneConstructor<T>, owner: Entity, source: TransformNode, barrelNode: TransformNode, duration: number): T {
        return super._add(constructor, owner, source, this._properties, barrelNode, duration);
    }
}

export interface DroneTarget {
    position: Vector3;
    radius: number;
}

export class SingleTargetDrones extends Drones<SingleTargetDrone> {
    public constructor(world: World, parent: TransformNode, properties: DeepImmutable<WeaponProperties>) {
        super(world, parent, properties);
    }

    public readonly target: DroneTarget = { position: new Vector3(), radius: 0 };

    public override add(constructor: DroneConstructor<SingleTargetDrone>, owner: Entity, source: Mesh, barrelNode: TransformNode, duration: number): SingleTargetDrone {
        const drone = super.add(constructor, owner, source, barrelNode, duration);
        drone.target = this.target;
        return drone;
    }
}

export class AutoTargetDrones extends Drones<AutoTargetDrone> {
    private readonly _targetCollisionToken: IDisposable;

    public constructor(world: World, parent: TransformNode, properties: DeepImmutable<WeaponProperties>) {
        super(world, parent, properties);

        this._targetCollisionToken = this._world.collisions.register({
            [Symbol.iterator]: this._getTargetColliders.bind(this)
        });
    }

    public override dispose(): void {
        this._targetCollisionToken.dispose();
        super.dispose();
    }

    private *_getTargetColliders(): Iterator<Collider> {
        for (const projectile of this._projectiles) {
            yield projectile.targetCollider;
        }
    }
}

export abstract class Drone extends Projectile {
    protected readonly _health: Health;

    public constructor(world: World, owner: Entity, node: TransformNode, barrelNode: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        super(world, owner, node, barrelNode, properties, duration);
        this._health = this.size > 0.5
            ? new BarHealth(world.sources, this._node, this._properties.health)
            : new Health(this._properties.health);
    }

    public type = EntityType.Drone;

    protected _chase(deltaTime: number, target: DeepImmutable<DroneTarget>): void {
        const direction = TmpVector3[0];
        target.position.subtractToRef(this._node.position, direction);
        const distance = direction.length();
        direction.scaleInPlace(1 / Math.max(distance, 0.01));

        if (target.radius > 0) {
            const position = TmpVector3[1];
            direction.scaleToRef(-target.radius, position).addInPlace(target.position);
            position.addInPlaceFromFloats(-direction.z, direction.y, direction.x);
            position.subtractToRef(this._node.position, direction).normalize();
        }

        const forward = this._node.forward;
        decayVector3ToRef(forward, direction, deltaTime, 10, direction);
        this._node.setDirection(direction.normalize());

        const speed = this._properties.speed * Math.min(distance, 1);
        const targetVelocity = TmpVector3[2].copyFrom(forward).scaleInPlace(speed);
        decayVector3ToRef(this.velocity, targetVelocity, deltaTime, 2, this.velocity);
    }

    public onCollide(other: Entity): number {
        if (this.owner.type === other.type || (other.owner && this.owner.type === other.owner.type)) {
            if (other.type == EntityType.Bullet) {
                return 1;
            }

            applyCollisionForce(this, other);
            return 0;
        }

        if (other.damage.value > 0) {
            this._flash.setState(FlashState.Damage);
            this._health.takeDamage(other);
        }

        applyCollisionForce(this, other);
        return other.damage.time;
    }
}

export class SingleTargetDrone extends Drone {
    public target: Nullable<DroneTarget> = null;

    public override update(deltaTime: number, onDestroy: () => void): void {
        applyMovement(deltaTime, this._node.position, this.velocity);

        if (this.target) {
            this._chase(deltaTime, this.target);
        }

        super.update(deltaTime, onDestroy);
    }
}

export class AutoTargetDrone extends Drone {
    private readonly _targetVelocity: DeepImmutable<Vector3> = new Vector3();
    private readonly _target: DroneTarget = { position: new Vector3(), radius: 0 };
    private _targetDistanceSquared = Number.MAX_VALUE;

    public constructor(world: World, owner: Entity, node: TransformNode, barrelNode: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        super(world, owner, node, barrelNode, properties, duration);

        this.targetCollider = new TargetCollider(this._node.position, TARGET_RADIUS * 2, (other) => {
            if (other.type !== EntityType.Bullet && other !== this.owner && other.owner !== this.owner) {
                const distanceSquared = Vector3.DistanceSquared(this._node.position, other.position);
                if (distanceSquared < this._targetDistanceSquared) {
                    this._target.position.copyFrom(other.position);
                    this._targetDistanceSquared = distanceSquared;
                }
            }
        });
    }

    public override shoot(barrelNode: TransformNode): void {
        super.shoot(barrelNode);
        this._targetVelocity.copyFrom(this._node.forward).scaleInPlace(this._properties.speed);
    }

    public readonly targetCollider: TargetCollider;

    public override update(deltaTime: number, onDestroy: () => void): void {
        applyMovement(deltaTime, this._node.position, this.velocity);

        if (this._targetDistanceSquared === Number.MAX_VALUE) {
            decayVector3ToRef(this.velocity, this._targetVelocity, deltaTime, 2, this.velocity);
        } else {
            this._chase(deltaTime, this._target);
        }

        this._targetDistanceSquared = Number.MAX_VALUE;

        super.update(deltaTime, onDestroy);
    }
}
