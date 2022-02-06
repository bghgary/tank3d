import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Bullet, BulletProperties, Bullets } from "../bullets";
import { Entity } from "../entity";
import { BarrelMetadata } from "../sources";
import { World } from "../world";
import { Tank, TankProperties } from "./tank";

export class Barrel {
    private readonly _mesh: AbstractMesh;
    private readonly _metadata: BarrelMetadata;

    public constructor(mesh: AbstractMesh, metadata: BarrelMetadata) {
        this._mesh = mesh;
        this._metadata = metadata;
    }

    public shoot(bullets: Bullets, owner: Entity, createBulletNode: (parent: TransformNode) => TransformNode, bulletProperties: BulletProperties): Bullet {
        this._mesh.scaling.z = 0.9;
        return bullets.add(owner, this._metadata, createBulletNode, bulletProperties);
    }

    public update(deltaTime: number) {
        const decayFactor = Math.exp(-deltaTime * 4);
        this._mesh.scaling.z = 1 - (1 - this._mesh.scaling.z) * decayFactor;
    }
}

export class BarrelTank extends Tank {
    protected readonly _bullets: Bullets;
    protected readonly _createBulletNode: (parent: TransformNode) => TransformNode;
    protected readonly _barrels: Array<Barrel>;

    protected _reloadTime = 0;

    private _recoil = new Vector3();

    protected constructor(displayName: string, node: TransformNode, multiplier: Partial<TankProperties>, world: World, bullets: Bullets, previousTank?: Tank) {
        super(displayName, node, multiplier, world, previousTank);

        this._bullets = bullets;
        this._createBulletNode = (parent) => world.sources.createTankBullet(parent);

        this._barrels = this._metadata.barrels.map((metadata) => {
            const mesh = node.getChildMeshes().find((mesh) => mesh.name === metadata.mesh)!;
            return new Barrel(mesh, metadata);
        });
    }

    public override shoot(): void {
        if (this._reloadTime === 0) {
            const bulletProperties = this._getBulletProperties();

            for (const barrel of this._barrels) {
                this._shootFrom(barrel, bulletProperties);
            }

            this._reloadTime = this._properties.reloadTime;
        }

        super.shoot();
    }

    protected _shootFrom(barrel: Barrel, bulletProperties: BulletProperties): void {
        const bullet = barrel.shoot(this._bullets, this, this._createBulletNode, bulletProperties);
        this._recoil.x += bullet.velocity.x * bullet.mass;
        this._recoil.z += bullet.velocity.z * bullet.mass;
    }

    protected _getBulletProperties(): BulletProperties {
        return {
            speed: this._properties.bulletSpeed,
            damage: this._properties.bulletDamage,
            health: this._properties.bulletHealth,
        };
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
