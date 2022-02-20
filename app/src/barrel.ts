import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Bullet, Bullets } from "./bullets";
import { Drone, Drones } from "./drones";
import { Entity } from "./entity";
import { BarrelMetadata, ProjectileMetadata } from "./metadata";

export class Barrel {
    private readonly _mesh: AbstractMesh;
    private readonly _metadata: Readonly<BarrelMetadata>;

    public constructor(mesh: AbstractMesh, metadata: Readonly<BarrelMetadata>) {
        this._mesh = mesh;
        this._metadata = metadata;
    }

    public shootBullet(bullets: Bullets, owner: Entity, bulletMetadata: Readonly<ProjectileMetadata>, createNode: (parent: TransformNode) => TransformNode): Bullet {
        this._mesh.scaling.z = 0.9;
        return bullets.add(owner, this._metadata, bulletMetadata, createNode);
    }

    public shootDrone(drones: Drones, owner: Entity, createNode: (parent: TransformNode) => TransformNode): Drone {
        this._mesh.scaling.z = 0.9;
        return drones.add(owner, this._metadata, createNode);
    }

    public update(deltaTime: number) {
        const decayFactor = Math.exp(-deltaTime * 4);
        this._mesh.scaling.z = 1 - (1 - this._mesh.scaling.z) * decayFactor;
    }
}
