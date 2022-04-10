import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { DeepImmutable, Nullable } from "@babylonjs/core/types";
import { Collider, TargetCollider } from "../collisions";
import { applyCollisionForce, applyMovement } from "../common";
import { BarHealth, Health } from "../components/health";
import { Shadow } from "../components/shadow";
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

    public get count(): number {
        return this._projectiles.size;
    }

    public add(constructor: DroneConstructor<T>, owner: Entity, barrelNode: TransformNode, source: Mesh, duration: number): T {
        const node = this._world.sources.create(source, this._root);
        const drone = new constructor(this._world, barrelNode, owner, node, this._properties, duration);
        this._projectiles.add(drone);
        return drone;
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

    public update(deltaTime: number): void {
        for (const projectile of this._projectiles) {
            projectile.update(deltaTime, this.target, () => {
                this._projectiles.delete(projectile);
            });
        }
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

    public update(deltaTime: number): void {
        for (const projectile of this._projectiles) {
            projectile.update(deltaTime, () => {
                this._projectiles.delete(projectile);
            });
        }
    }

    private *_getTargetColliders(): Iterator<Collider> {
        for (const projectile of this._projectiles) {
            yield projectile.targetCollider;
        }
    }
}

export abstract class Drone extends Projectile {
    protected readonly _shadow: Shadow;
    private _time: number;

    public constructor(world: World, barrelNode: TransformNode, owner: Entity, node: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        super(barrelNode, owner, node, properties);
        this._shadow = new Shadow(world.sources, this._node);
        this._time = duration;
    }

    public type = EntityType.Drone;

    protected _update(deltaTime: number, target: Nullable<DeepImmutable<DroneTarget>>, onDestroy: () => void): void {
        applyMovement(deltaTime, this._node.position, this.velocity);

        if (target) {
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

        this._shadow.update();

        if ((this._time -= deltaTime) <= 0) {
            onDestroy();
            this._node.dispose();
        }
    }

    protected abstract _takeDamage(other: Entity): void;

    public onCollide(other: Entity): number {
        if (this.owner.type === other.type || (other.owner && this.owner.type === other.owner.type)) {
            if (other.type == EntityType.Bullet) {
                return 1;
            }

            applyCollisionForce(this, other);
            return 0;
        }

        applyCollisionForce(this, other);
        this._takeDamage(other);
        return other.damage.time;
    }
}

export class SingleTargetDrone extends Drone {
    private readonly _health: BarHealth;

    public constructor(world: World, barrelNode: TransformNode, owner: Entity, node: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        super(world, barrelNode, owner, node, properties, duration);
        this._health = new BarHealth(world.sources, this._node, this._properties.health);
    }

    public update(deltaTime: number, target: DroneTarget, onDestroy: () => void): void {
        super._update(deltaTime, target, onDestroy);

        if (!this._node.isDisposed()) {
            this._health.update(deltaTime, () => {
                onDestroy();
                this._node.dispose();
            });
        }
    }

    protected _takeDamage(other: Entity): void {
        this._health.takeDamage(other);
    }
}

export class AutoTargetDrone extends Drone {
    private readonly _health: Health;
    private readonly _targetVelocity: DeepImmutable<Vector3> = new Vector3();
    private readonly _target: DroneTarget = { position: new Vector3(), radius: 0 };
    private _targetDistanceSquared = Number.MAX_VALUE;

    public constructor(world: World, barrelNode: TransformNode, owner: Entity, node: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        super(world, barrelNode, owner, node, properties, duration);

        this._health = new Health(properties.health);
        this._targetVelocity.copyFrom(this.velocity).scaleInPlace(properties.speed / this.velocity.length());

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

    public readonly targetCollider: TargetCollider;

    public update(deltaTime: number, onDestroy: () => void): void {
        const target = this._targetDistanceSquared === Number.MAX_VALUE ? null : this._target;
        super._update(deltaTime, target, onDestroy);

        if (!this._node.isDisposed()) {
            if (!this._health.update(deltaTime)) {
                onDestroy();
                this._node.dispose();
            }
        }

        if (!target) {
            decayVector3ToRef(this.velocity, this._targetVelocity, deltaTime, 2, this.velocity);
        }

        this._targetDistanceSquared = Number.MAX_VALUE;
    }

    protected _takeDamage(other: Entity): void {
        this._health.takeDamage(other);
    }
}
