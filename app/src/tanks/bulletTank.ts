import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { applyRecoil } from "../common";
import { Barrel } from "../components/barrel";
import { WeaponProperties, WeaponType } from "../components/weapon";
import { Bullet, BulletConstructor } from "../projectiles/bullets";
import { World } from "../worlds/world";
import { BarrelTank } from "./barrelTank";
import { PlayerTank, TankProperties } from "./playerTank";

export class BulletTank extends BarrelTank {
    protected readonly _bulletConstructor: BulletConstructor = Bullet;
    protected readonly _bulletSource = this._world.sources.bullet.tank;
    protected readonly _bulletProperties: WeaponProperties;

    protected constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._bulletProperties = {
            speed: this._properties.weaponSpeed,
            damage: this._properties.weaponDamage,
            damageTime: 0.2,
            health: this._properties.weaponHealth,
        };
    }

    public override readonly weaponType = WeaponType.Bullet;

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
        const bullet = barrel.shootBullet(this._bulletConstructor, this, this._bulletSource, this._bulletProperties, 3);
        applyRecoil(this._recoil, bullet);
    }

    protected _updateBulletProperties(): void {
        this._bulletProperties.speed = this._properties.weaponSpeed;
        this._bulletProperties.damage = this._properties.weaponDamage;
        this._bulletProperties.health = this._properties.weaponHealth;
    }
}
