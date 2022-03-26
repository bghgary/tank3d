import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Entity } from "../entity";
import { decayScalar } from "../math";
import { BarrelMetadata } from "../metadata";
import { Bullets } from "../projectiles/bullets";
import { Drones } from "../projectiles/drones";
import { MissileConstructor, Missiles } from "../projectiles/missiles";
import { Projectile } from "../projectiles/projectiles";
import { Traps } from "../projectiles/traps";
import { WeaponProperties } from "./weapon";

export class Barrel {
    private readonly _node: TransformNode;
    private readonly _scale: (node: TransformNode) => void;

    public constructor(node: TransformNode) {
        this._node = node;
        this._scale = (node) => node.scaling.z = 1 - 0.1 / (node.metadata as BarrelMetadata).length;
    }

    public shootBullet(bullets: Bullets, owner: Entity, createNode: (parent: TransformNode) => TransformNode, bulletProperties: Readonly<WeaponProperties>, duration: number): Projectile {
        this._scale(this._node);
        return bullets.add(owner, this._node, createNode, bulletProperties, duration);
    }

    public shootDrone(drones: Drones, owner: Entity, createNode: (parent: TransformNode) => TransformNode): Projectile {
        this._scale(this._node);
        return drones.add(owner, this._node, createNode);
    }

    public shootMissile(missiles: Missiles, constructor: MissileConstructor, owner: Entity, createNode: (parent: TransformNode) => TransformNode, duration: number): Projectile {
        this._scale(this._node);
        return missiles.add(constructor, owner, this._node, createNode, duration);
    }

    public shootTrap(traps: Traps, owner: Entity, createNode: (parent: TransformNode) => TransformNode, trapProperties: Readonly<WeaponProperties>, duration: number): Projectile {
        this._scale(this._node);
        return traps.add(owner, this._node, createNode, trapProperties, duration);
    }

    public update(deltaTime: number) {
        this._node.scaling.z = decayScalar(this._node.scaling.z, 1, deltaTime, 4);
    }
}
