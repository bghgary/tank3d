import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Bullets } from "../bullets";
import { ProjectileMetadata } from "../metadata";
import { World } from "../world";
import { Barrel, BarrelTank } from "./barrelTank";
import { ProjectileType, PlayerTank, TankProperties } from "./playerTank";

export class BulletTank extends BarrelTank {
    protected readonly _bullets: Bullets;
    protected readonly _createBulletNode: (parent: TransformNode) => TransformNode;
    protected readonly _bulletMetadata: ProjectileMetadata;

    protected constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._bullets = world.bullets;
        this._createBulletNode = (parent) => world.sources.create(world.sources.bullet.tank, parent);
        this._bulletMetadata = {
            speed: this._properties.projectileSpeed,
            damage: this._properties.projectileDamage,
            health: this._properties.projectileHealth,
        };
    }

    public override readonly projectileType = ProjectileType.Bullet;

    public override shoot(): void {
        if (this._reloadTime === 0) {
            for (const barrel of this._barrels) {
                this._shootFrom(barrel);
            }

            this._reloadTime = this._properties.reloadTime;
        }

        super.shoot();
    }

    public override setUpgrades(upgrades: Readonly<TankProperties>): void {
        super.setUpgrades(upgrades);
        this._updateBulletMetadata();
    }

    protected _shootFrom(barrel: Barrel): void {
        const bullet = barrel.shootBullet(this._bullets, this, this._bulletMetadata, this._createBulletNode);
        this._recoil.x += bullet.velocity.x * bullet.mass;
        this._recoil.z += bullet.velocity.z * bullet.mass;
    }

    protected _updateBulletMetadata(): void {
        this._bulletMetadata.speed = this._properties.projectileSpeed;
        this._bulletMetadata.damage = this._properties.projectileDamage;
        this._bulletMetadata.health = this._properties.projectileHealth;
    }
}
