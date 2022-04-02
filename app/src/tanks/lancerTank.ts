import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { findNode } from "../common";
import { Lance } from "../components/lance";
import { WeaponProperties, WeaponType } from "../components/weapon";
import { Entity } from "../entity";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { PlayerTank, TankProperties } from "./playerTank";

export class LancerTank extends PlayerTank {
    private readonly _lances: Array<Lance>;
    private readonly _lanceProperties: WeaponProperties;

    public constructor(world: World, parent: TransformNode, previousTank?: PlayerTank) {
        super(world, LancerTank.CreateMesh(world.sources, parent), previousTank);

        this._lanceProperties = {
            speed: this._properties.weaponSpeed,
            damage: {
                value: this._properties.weaponDamage,
                time: this._properties.reloadTime,
                count: 1,
            },
            health: this._properties.weaponHealth,
        };

        this._lances = this._metadata.lances!.map((name) => new Lance(world, this, findNode(this._node, name), this._lanceProperties));
    }

    public override readonly weaponType = WeaponType.Lance;

    public override update(deltaTime: number, onDestroy: (source: Entity) => void): void {
        for (const lance of this._lances) {
            lance.update(deltaTime);
        }

        super.update(deltaTime, onDestroy);
    }

    public override setUpgrades(upgrades: DeepImmutable<TankProperties>): void {
        super.setUpgrades(upgrades);
        this._updateLanceProperties();

        const lanceScale = 1 + upgrades.weaponSpeed * 0.1;
        for (const lance of this._lances) {
            lance.setScale(lanceScale);
        }
    }

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.lancer, parent);
    }

    private _updateLanceProperties(): void {
        this._lanceProperties.speed = this._properties.weaponSpeed;
        this._lanceProperties.damage.value = this._properties.weaponDamage;
        this._lanceProperties.damage.time = this._properties.reloadTime;
        this._lanceProperties.health = this._properties.weaponHealth;
    }
}
