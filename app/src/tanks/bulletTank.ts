import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Barrel } from "../barrel";
import { ApplyRecoil } from "../common";
import { ProjectileMetadata } from "../metadata";
import { World } from "../world";
import { BarrelTank } from "./barrelTank";
import { ProjectileType, PlayerTank, TankProperties } from "./playerTank";

export class BulletTank extends BarrelTank {
    protected readonly _createBulletNode: (parent: TransformNode) => TransformNode;
    protected readonly _bulletMetadata: ProjectileMetadata;

    protected constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._createBulletNode = (parent) => this._world.sources.create(this._world.sources.bullet.tank, parent);
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
        const bullet = barrel.shootBullet(this._world.bullets, this, this._bulletMetadata, this._createBulletNode);
        ApplyRecoil(this._recoil, bullet);
    }

    protected _updateBulletMetadata(): void {
        this._bulletMetadata.speed = this._properties.projectileSpeed;
        this._bulletMetadata.damage = this._properties.projectileDamage;
        this._bulletMetadata.health = this._properties.projectileHealth;
    }
}
