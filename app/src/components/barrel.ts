import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Entity } from "../entity";
import { decayScalar } from "../math";
import { BarrelMetadata } from "../metadata";
import { BulletConstructor } from "../projectiles/bullets";
import { Drones } from "../projectiles/drones";
import { Projectile } from "../projectiles/projectiles";
import { World } from "../worlds/world";
import { WeaponProperties } from "./weapon";

export class Barrel {
    private readonly _world: World;
    private readonly _node: TransformNode;
    private readonly _scale: (node: TransformNode) => void;

    public constructor(world: World, node: TransformNode) {
        this._world = world;
        this._node = node;
        this._scale = (node) => node.scaling.z = 1 - 0.1 / (node.metadata as BarrelMetadata).length;
    }

    public shootBullet(constructor: BulletConstructor, owner: Entity, source: Mesh, properties: Readonly<WeaponProperties>, duration: number): Projectile {
        this._scale(this._node);
        return this._world.bullets.add(constructor, this._node, owner, source, properties, duration);
    }

    public shootTrap(owner: Entity, source: Mesh, properties: Readonly<WeaponProperties>, duration: number): Projectile {
        this._scale(this._node);
        return this._world.traps.add(this._node, owner, source, properties, duration);
    }

    public shootDrone(drones: Drones, owner: Entity, source: Mesh): Projectile {
        this._scale(this._node);
        return drones.add(owner, this._node, source);
    }

    public update(deltaTime: number) {
        this._node.scaling.z = decayScalar(this._node.scaling.z, 1, deltaTime, 4);
    }
}
