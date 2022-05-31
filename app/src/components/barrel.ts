import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { Entity } from "../entity";
import { decayScalar } from "../math";
import { BarrelMetadata } from "../metadata";
import { Bullet, BulletConstructor } from "../projectiles/bullets";
import { Drone, DroneConstructor, Drones } from "../projectiles/drones";
import { Projectile } from "../projectiles/projectiles";
import { Trap } from "../projectiles/traps";
import { World } from "../worlds/world";
import { WeaponProperties } from "./weapon";

export class Barrel {
    private readonly _world: World;
    private readonly _node: TransformNode;
    private readonly _originalScale: number;
    private readonly _shootScale: number;

    public constructor(world: World, node: TransformNode) {
        this._world = world;
        this._node = node;

        this._originalScale = this._node.scaling.z;
        const length = (node.metadata as BarrelMetadata).length;
        this._shootScale = (length - 0.1) / length * this._originalScale;
    }

    public addBullet(constructor: BulletConstructor, owner: Entity, source: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number): Bullet {
        return this._world.bullets.add(constructor, owner, source, properties, this._node, duration);
    }

    public addTrap(owner: Entity, source: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number): Trap {
        return this._world.traps.add(Trap, owner, source, properties, this._node, duration);
    }

    public addDrone<T extends Drone>(drones: Drones<T>, constructor: DroneConstructor<T>, owner: Entity, source: TransformNode, duration = Number.POSITIVE_INFINITY): Drone {
        return drones.add(constructor, owner, source, this._node, duration);
    }

    public shootBullet(constructor: BulletConstructor, owner: Entity, source: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number): Bullet {
        return this._shoot(this.addBullet(constructor, owner, source, properties, duration));
    }

    public shootTrap(owner: Entity, source: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number): Trap {
        return this._shoot(this.addTrap(owner, source, properties, duration));
    }

    public shootDrone<T extends Drone>(drones: Drones<T>, constructor: DroneConstructor<T>, owner: Entity, source: TransformNode, duration = Number.POSITIVE_INFINITY): Drone {
        return this._shoot(this.addDrone(drones, constructor, owner, source, duration));
    }

    public update(deltaTime: number) {
        this._node.scaling.z = decayScalar(this._node.scaling.z, this._originalScale, deltaTime, 4);
    }

    private _shoot<T extends Projectile>(projectile: T): T {
        this._node.scaling.z = this._shootScale;
        projectile.shoot(this._node);
        return projectile;
    }
}
