import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Bullet, BulletProperties, Bullets } from "../bullets";
import { Drone, Drones } from "../drones";
import { Entity } from "../entity";
import { BarrelMetadata } from "../sources";
import { World } from "../world";
import { PlayerTank, TankProperties } from "./playerTank";

export class Barrel {
    private readonly _mesh: AbstractMesh;
    private readonly _metadata: BarrelMetadata;

    public constructor(mesh: AbstractMesh, metadata: BarrelMetadata) {
        this._mesh = mesh;
        this._metadata = metadata;
    }

    public shootBullet(bullets: Bullets, owner: Entity, createNode: (parent: TransformNode) => TransformNode, properties: Readonly<BulletProperties>): Bullet {
        this._mesh.scaling.z = 0.9;
        return bullets.add(owner, this._metadata, createNode, properties);
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

    protected constructor(displayName: string, node: TransformNode, multiplier: Partial<Readonly<TankProperties>>, world: World, previousTank?: PlayerTank) {
        super(displayName, node, multiplier, world, previousTank);

        this._barrels = this._metadata.barrels.map((metadata) => {
            const mesh = node.getChildMeshes().find((mesh) => mesh.name === metadata.mesh)!;
            return new Barrel(mesh, metadata);
        });
    }

    public override update(deltaTime: number, onDestroyed: (entity: Entity) => void): void {
        super.update(deltaTime, onDestroyed);

        for (const barrel of this._barrels) {
            barrel.update(deltaTime);
        }

        this._reloadTime = Math.max(this._reloadTime - deltaTime, 0);

        this.velocity.subtractInPlace(this._recoil);
        this._recoil.setAll(0);
    }
}
