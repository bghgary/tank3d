import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { Barrel } from "../components/barrel";
import { WeaponProperties } from "../components/weapon";
import { Trap, TrapConstructor } from "../projectiles/traps";
import { getUpgradeNames } from "../ui/upgrades";
import { World } from "../worlds/world";
import { BarrelTank } from "./barrelTank";
import { PlayerTank, TankProperties } from "./playerTank";

export abstract class TrapTank extends BarrelTank {
    protected readonly _trapConstructor: TrapConstructor = Trap;
    protected readonly _trapSource = this._world.sources.trap.tankTri;
    protected readonly _trapProperties: WeaponProperties;

    public constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
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

    public override readonly upgradeNames = getUpgradeNames("Trap");

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
        barrel.shootTrap(this._trapConstructor, this, this._trapSource, this._trapProperties, 24, this._recoil);
    }

    protected _updateTrapProperties(): void {
        this._trapProperties.speed = this._properties.weaponSpeed;
        this._trapProperties.damage.value = this._properties.weaponDamage;
        this._trapProperties.health = this._properties.weaponHealth;
    }
}
