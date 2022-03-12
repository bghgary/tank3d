import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Drones } from "./projectiles/drones";
import { Entity } from "./entity";
import { decayScalar } from "./math";
import { BarrelMetadata, ProjectileMetadata } from "./metadata";
import { Projectile } from "./projectiles/projectiles";
import { Bullets } from "./projectiles/bullets";
import { Traps } from "./projectiles/traps";

export class Barrel {
    private readonly _node: TransformNode;
    private readonly _metadata: Readonly<BarrelMetadata>;

    public constructor(node: TransformNode, metadata: Readonly<BarrelMetadata>) {
        this._node = node.getChildren((node) => node.name === metadata.nodeName, false)[0] as TransformNode;
        this._metadata = metadata;
    }

    public shootBullet(bullets: Bullets, owner: Entity, bulletMetadata: Readonly<ProjectileMetadata>, createNode: (parent: TransformNode) => TransformNode): Projectile {
        this._node.scaling.z = 0.9;
        return bullets.add(owner, this._node, this._metadata, bulletMetadata, createNode);
    }

    public shootDrone(drones: Drones, owner: Entity, createNode: (parent: TransformNode) => TransformNode): Projectile {
        this._node.scaling.z = 0.9;
        return drones.add(owner, this._node, this._metadata, createNode);
    }

    public shootTrap(traps: Traps, owner: Entity, trapMetadata: Readonly<ProjectileMetadata>, createNode: (parent: TransformNode) => TransformNode): Projectile {
        this._node.scaling.z = 0.9;
        return traps.add(owner, this._node, this._metadata, trapMetadata, createNode);
    }

    public update(deltaTime: number) {
        this._node.scaling.z = decayScalar(this._node.scaling.z, 1, deltaTime, 4);
    }
}
