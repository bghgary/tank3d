import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { applyRecoil } from "../common";
import { Barrel } from "../components/barrel";
import { WeaponProperties, WeaponType } from "../components/weapon";
import { World } from "../worlds/world";
import { BarrelTank } from "./barrelTank";
import { PlayerTank, TankProperties } from "./playerTank";

export abstract class TrapTank extends BarrelTank {
    protected abstract readonly _trapSource: Mesh;
    protected readonly _trapProperties: WeaponProperties;

    protected constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._trapProperties = {
            speed: this._properties.weaponSpeed,
            damage: {
                value: this._properties.weaponDamage,
                time: 0.2,
            },
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

    public override setUpgrades(upgrades: DeepImmutable<TankProperties>): void {
        super.setUpgrades(upgrades);
        this._updateTrapProperties();
    }

    protected _shootFrom(barrel: Barrel): void {
        const trap = barrel.shootTrap(this, this._trapSource, this._trapProperties, 24);
        applyRecoil(this._recoil, trap);
    }

    protected _updateTrapProperties(): void {
        this._trapProperties.speed = this._properties.weaponSpeed;
        this._trapProperties.damage.value = this._properties.weaponDamage;
        this._trapProperties.health = this._properties.weaponHealth;
    }
}
