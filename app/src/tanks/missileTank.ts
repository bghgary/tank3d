import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { applyRecoil } from "../common";
import { Barrel } from "../components/barrel";
import { WeaponProperties, WeaponType } from "../components/weapon";
import { Entity } from "../entity";
import { MissileConstructor, Missiles } from "../projectiles/missiles";
import { World } from "../worlds/world";
import { BarrelTank } from "./barrelTank";
import { PlayerTank, TankProperties } from "./playerTank";

export abstract class MissileTank extends BarrelTank {
    protected readonly _missiles: Missiles;
    protected readonly _createMissileNode: (parent: TransformNode) => TransformNode;
    protected readonly _missileProperties: WeaponProperties;

    protected abstract readonly _missileConstructor: MissileConstructor;

    protected constructor(world: World, node: TransformNode, missileSource: Mesh, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._missileProperties = {
            speed: this._properties.weaponSpeed,
            damage: this._properties.weaponDamage,
            damageTime: 0.2,
            health: this._properties.weaponHealth,
        };

        this._missiles = new Missiles(world, node.parent as TransformNode, this._missileProperties);
        this._createMissileNode = (parent) => this._world.sources.create(missileSource, parent);
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

    public override update(deltaTime: number, onDestroy: (entity: Entity) => void): void {
        this._missiles.update(deltaTime);
        super.update(deltaTime, onDestroy);
    }

    public override setUpgrades(upgrades: Readonly<TankProperties>): void {
        super.setUpgrades(upgrades);
        this._updateMissileProperties();
    }

    protected _shootFrom(barrel: Barrel): void {
        const missile = barrel.shootMissile(this._missiles, this._missileConstructor, this, this._createMissileNode, 3);
        applyRecoil(this._recoil, missile);
    }

    protected _updateMissileProperties(): void {
        this._missileProperties.speed = this._properties.weaponSpeed;
        this._missileProperties.damage = this._properties.weaponDamage;
        this._missileProperties.health = this._properties.weaponHealth;
    }
}
