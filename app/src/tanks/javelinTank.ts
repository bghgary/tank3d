import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { findNode } from "../common";
import { Lance } from "../components/lance";
import { WeaponProperties } from "../components/weapon";
import { Entity, EntityType } from "../entity";
import { Trap } from "../projectiles/traps";
import { Sources } from "../sources";
import { getUpgradeNames } from "../ui/upgrades";
import { World } from "../worlds/world";
import { PlayerTank, TankProperties } from "./playerTank";
import { TrapTank } from "./trapTank";

export class JavelinTank extends TrapTank {
    protected override readonly _trapSource = this._world.sources.trap.tankJavelin;
    protected override readonly _trapConstructor = JavelinTrap;

    private readonly _lances: Array<Lance>;
    private readonly _lanceProperties: WeaponProperties;

    public constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._lanceProperties = {
            speed: this._properties.weaponSpeed,
            damage: {
                value: this._properties.weaponDamage,
                time: this._properties.reloadTime,
            },
            health: this._properties.weaponHealth,
        };

        this._lances = this._metadata.lances!.map((name) => new Lance(world, this, findNode(this._node, name), this._lanceProperties));
    }

    public override readonly upgradeNames = getUpgradeNames("Javelin");

    public override update(deltaTime: number, onDestroy: (source: Entity) => void): void {
        for (const lance of this._lances) {
            lance.update(deltaTime);
        }

        super.update(deltaTime, onDestroy);
    }

    public override shoot(): void {
        let index = 0;
        for (const barrel of this._barrels) {
            const lance = this._lances[index++]!;
            if (lance.currentScale > 0.9) {
                lance.currentScale = 0.1;
                this._shootFrom(barrel);
            }
        }

        PlayerTank.prototype.shoot.call(this);
    }

    public override setUpgrades(upgrades: DeepImmutable<TankProperties>): void {
        super.setUpgrades(upgrades);
        this._updateLanceProperties();

        const decayFactor = 1 + upgrades.reloadTime * 0.2;
        for (const lance of this._lances) {
            lance.decayFactor = decayFactor;
        }
    }

    public override preCollide(other: Entity): boolean {
        if (other.owner === this && other.type === EntityType.Lance) {
            return false;
        }

        return super.preCollide(other);
    }

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.javelin, parent);
    }

    private _updateLanceProperties(): void {
        this._lanceProperties.speed = this._properties.weaponSpeed;
        this._lanceProperties.damage.value = this._properties.weaponDamage;
        this._lanceProperties.damage.time = this._properties.reloadTime;
        this._lanceProperties.health = this._properties.weaponHealth;
    }
}

class JavelinTrap extends Trap {
    protected override readonly _velocityDecayFactor = 1;

    public override update(deltaTime: number, onDestroy: () => void): void {
        super.update(deltaTime, onDestroy);

        if (this.velocity.lengthSquared() < 2) {
            onDestroy();
            this._node.dispose();
        }
    }
}
