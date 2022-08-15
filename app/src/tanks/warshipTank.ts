import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { WeaponProperties } from "../components/weapon";
import { Entity } from "../entity";
import { SingleTargetDrone, SingleTargetDrones } from "../projectiles/drones";
import { Sources } from "../sources";
import { getUpgradeNames } from "../ui/upgrades";
import { World } from "../worlds/world";
import { BarrelTank } from "./barrelTank";
import { PlayerTank, TankProperties } from "./playerTank";

export class WarshipTank extends BarrelTank {
    private readonly _drones: SingleTargetDrones;
    private readonly _droneProperties: WeaponProperties;

    public constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._droneProperties = {
            speed: this._properties.weaponSpeed,
            damage: {
                value: this._properties.weaponDamage,
                time: 0.2,
            },
            health: this._properties.weaponHealth,
        };

        const parent = node.parent as TransformNode;
        this._drones = new SingleTargetDrones(world, parent, this._droneProperties);
        this._node.onDisposeObservable.add(() => {
            this._drones.dispose();
        });
    }

    public override readonly upgradeNames = getUpgradeNames("Drone");

    public override shoot(): void {
        if (this._reloadTime === 0) {
            for (const barrel of this._barrels) {
                barrel.shootDrone(this._drones, SingleTargetDrone, this, this._world.sources.drone.tank, 5, this._recoil);
            }

            this._reloadTime = this._properties.reloadTime;
        }

        super.shoot();
    }

    public override update(deltaTime: number, onDestroy: (entity: Entity) => void): void {
        this._drones.target.position.copyFrom(this._world.pointerPosition);
        this._drones.update(deltaTime);

        super.update(deltaTime, onDestroy);
    }

    public override setUpgrades(upgrades: DeepImmutable<TankProperties>): void {
        super.setUpgrades(upgrades);
        this._droneProperties.speed = this._properties.weaponSpeed;
        this._droneProperties.damage.value = this._properties.weaponDamage;
        this._droneProperties.health = this._properties.weaponHealth;
    }

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.warship, parent);
    }
}
