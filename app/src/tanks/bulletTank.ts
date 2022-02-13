import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { BulletProperties, Bullets } from "../bullets";
import { World } from "../world";
import { Barrel, BarrelTank } from "./barrelTank";
import { ProjectileType, PlayerTank, TankProperties } from "./playerTank";

export class BulletTank extends BarrelTank {
    protected readonly _bullets: Bullets;
    protected readonly _createBulletNode: (parent: TransformNode) => TransformNode;
    protected readonly _bulletProperties: BulletProperties;

    protected constructor(displayName: string, node: TransformNode, multiplier: Partial<Readonly<TankProperties>>, world: World, previousTank?: PlayerTank) {
        super(displayName, node, multiplier, world, previousTank);

        this._bullets = world.bullets;
        this._createBulletNode = (parent) => world.sources.createTankBullet(parent);
        this._bulletProperties = {
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
        this._updateBulletProperties();
    }

    protected _shootFrom(barrel: Barrel): void {
        const bullet = barrel.shootBullet(this._bullets, this, this._createBulletNode, this._bulletProperties);
        this._recoil.x += bullet.velocity.x * bullet.mass;
        this._recoil.z += bullet.velocity.z * bullet.mass;
    }

    protected _updateBulletProperties(): void {
        this._bulletProperties.speed = this._properties.projectileSpeed;
        this._bulletProperties.damage = this._properties.projectileDamage;
        this._bulletProperties.health = this._properties.projectileHealth;
    }
}
