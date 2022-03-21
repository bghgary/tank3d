import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Drones } from "../projectiles/drones";
import { Entity } from "../entity";
import { decayScalar } from "../math";
import { Projectile } from "../projectiles/projectiles";
import { Bullets } from "../projectiles/bullets";
import { Traps } from "../projectiles/traps";
import { WeaponProperties } from "./weapon";
import { BarrelMetadata } from "../metadata";

export class Barrel {
    private readonly _node: TransformNode;
    private readonly _scale: (node: TransformNode) => void;

    public constructor(node: TransformNode) {
        this._node = node;
        this._scale = (node) => node.scaling.z = 1 - 0.1 / (node.metadata as BarrelMetadata).length;
    }

    public shootBullet(bullets: Bullets, owner: Entity, createNode: (parent: TransformNode) => TransformNode, bulletProperties: Readonly<WeaponProperties>): Projectile {
        this._scale(this._node);
        return bullets.add(owner, this._node, createNode, bulletProperties);
    }

    public shootDrone(drones: Drones, owner: Entity, createNode: (parent: TransformNode) => TransformNode): Projectile {
        this._scale(this._node);
        return drones.add(owner, this._node, createNode);
    }

    public shootTrap(traps: Traps, owner: Entity, createNode: (parent: TransformNode) => TransformNode, trapProperties: Readonly<WeaponProperties>): Projectile {
        this._scale(this._node);
        return traps.add(owner, this._node, createNode, trapProperties);
    }

    public update(deltaTime: number) {
        this._node.scaling.z = decayScalar(this._node.scaling.z, 1, deltaTime, 4);
    }
}
