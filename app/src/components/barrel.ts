import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Drones } from "../projectiles/drones";
import { Entity } from "../entity";
import { decayScalar } from "../math";
import { Projectile } from "../projectiles/projectiles";
import { Bullets } from "../projectiles/bullets";
import { Traps } from "../projectiles/traps";
import { WeaponProperties } from "./weapon";

export class Barrel {
    private readonly _node: TransformNode;

    public constructor(node: TransformNode) {
        this._node = node;
    }

    public shootBullet(bullets: Bullets, owner: Entity, createNode: (parent: TransformNode) => TransformNode, bulletMetadata: Readonly<WeaponProperties>): Projectile {
        this._node.scaling.z = 0.9;
        return bullets.add(owner, this._node, createNode, bulletMetadata);
    }

    public shootDrone(drones: Drones, owner: Entity, createNode: (parent: TransformNode) => TransformNode): Projectile {
        this._node.scaling.z = 0.9;
        return drones.add(owner, this._node, createNode);
    }

    public shootTrap(traps: Traps, owner: Entity, createNode: (parent: TransformNode) => TransformNode, trapMetadata: Readonly<WeaponProperties>): Projectile {
        this._node.scaling.z = 0.9;
        return traps.add(owner, this._node, createNode, trapMetadata);
    }

    public update(deltaTime: number) {
        this._node.scaling.z = decayScalar(this._node.scaling.z, 1, deltaTime, 4);
    }
}
