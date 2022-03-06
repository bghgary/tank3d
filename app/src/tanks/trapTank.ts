import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Barrel } from "../barrel";
import { ApplyRecoil } from "../common";
import { ProjectileMetadata } from "../metadata";
import { World } from "../worlds/world";
import { BarrelTank } from "./barrelTank";
import { ProjectileType, PlayerTank, TankProperties } from "./playerTank";

export class TrapTank extends BarrelTank {
    protected readonly _createTrapNode: (parent: TransformNode) => TransformNode;
    protected readonly _trapMetadata: ProjectileMetadata;

    protected constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._createTrapNode = (parent) => this._world.sources.create(this._world.sources.trap.tank, parent);
        this._trapMetadata = {
            speed: this._properties.projectileSpeed,
            damage: this._properties.projectileDamage,
            health: this._properties.projectileHealth,
        };
    }

    public override readonly projectileType = ProjectileType.Trap;

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
        this._updateTrapMetadata();
    }

    protected _shootFrom(barrel: Barrel): void {
        const trap = barrel.shootTrap(this._world.traps, this, this._trapMetadata, this._createTrapNode);
        ApplyRecoil(this._recoil, trap);
    }

    protected _updateTrapMetadata(): void {
        this._trapMetadata.speed = this._properties.projectileSpeed;
        this._trapMetadata.damage = this._properties.projectileDamage;
        this._trapMetadata.health = this._properties.projectileHealth;
    }
}
