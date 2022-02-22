import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Bullet, Bullets } from "./bullets";
import { Drone, Drones } from "./drones";
import { Entity } from "./entity";
import { BarrelMetadata, ProjectileMetadata } from "./metadata";

export class Barrel {
    private readonly _node: TransformNode;
    private readonly _metadata: Readonly<BarrelMetadata>;

    public constructor(node: TransformNode, metadata: Readonly<BarrelMetadata>) {
        this._node = node.getChildren((node) => node.name === metadata.nodeName, false)[0] as TransformNode;
        this._metadata = metadata;
    }

    public shootBullet(bullets: Bullets, owner: Entity, bulletMetadata: Readonly<ProjectileMetadata>, createNode: (parent: TransformNode) => TransformNode): Bullet {
        this._node.scaling.z = 0.9;
        return bullets.add(owner, this._node, this._metadata, bulletMetadata, createNode);
    }

    public shootDrone(drones: Drones, owner: Entity, createNode: (parent: TransformNode) => TransformNode): Drone {
        this._node.scaling.z = 0.9;
        return drones.add(owner, this._node, this._metadata, createNode);
    }

    public update(deltaTime: number) {
        const decayFactor = Math.exp(-deltaTime * 4);
        this._node.scaling.z = 1 - (1 - this._node.scaling.z) * decayFactor;
    }
}
