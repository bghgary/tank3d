import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Bullet, Bullets } from "../bullets";
import { Drone, Drones } from "../drones";
import { Entity } from "../entity";
import { BarrelMetadata, ProjectileMetadata } from "../metadata";
import { World } from "../world";
import { PlayerTank } from "./playerTank";

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

export abstract class BarrelTank extends PlayerTank {
    protected readonly _barrels: Array<Barrel>;

    protected _reloadTime = 0;
    protected _recoil = new Vector3();

    protected constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._barrels = this._metadata.barrels.map((metadata) => {
            const mesh = node.getChildMeshes().find((mesh) => mesh.name === metadata.mesh)!;
            return new Barrel(mesh, metadata);
        });
    }

    public override update(deltaTime: number, onDestroyed: (entity: Entity) => void): void {
        for (const barrel of this._barrels) {
            barrel.update(deltaTime);
        }

        this._reloadTime = Math.max(this._reloadTime - deltaTime, 0);

        this.velocity.subtractInPlace(this._recoil);
        this._recoil.setAll(0);

        super.update(deltaTime, onDestroyed);
    }
}
