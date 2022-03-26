import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { applyRecoil } from "../common";
import { Barrel } from "../components/barrel";
import { WeaponProperties, WeaponType } from "../components/weapon";
import { World } from "../worlds/world";
import { BarrelTank } from "./barrelTank";
import { PlayerTank, TankProperties } from "./playerTank";

export class TrapTank extends BarrelTank {
    protected readonly _createTrapNode: (parent: TransformNode) => TransformNode;
    protected readonly _trapProperties: WeaponProperties;

    protected constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._createTrapNode = (parent) => this._world.sources.create(this._world.sources.trap.tank, parent);
        this._trapProperties = {
            speed: this._properties.weaponSpeed,
            damage: this._properties.weaponDamage,
            damageTime: 0.2,
            health: this._properties.weaponHealth,
        };
    }

    public override readonly weaponType = WeaponType.Trap;

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
        this._updateTrapProperties();
    }

    protected _shootFrom(barrel: Barrel): void {
        const trap = barrel.shootTrap(this._world.traps, this, this._createTrapNode, this._trapProperties, 24);
        applyRecoil(this._recoil, trap);
    }

    protected _updateTrapProperties(): void {
        this._trapProperties.speed = this._properties.weaponSpeed;
        this._trapProperties.damage = this._properties.weaponDamage;
        this._trapProperties.health = this._properties.weaponHealth;
    }
}
