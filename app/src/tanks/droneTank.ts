import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { applyRecoil } from "../common";
import { Barrel } from "../components/barrel";
import { WeaponProperties, WeaponType } from "../components/weapon";
import { Entity } from "../entity";
import { Drones } from "../projectiles/drones";
import { World } from "../worlds/world";
import { BarrelTank } from "./barrelTank";
import { PlayerTank, TankProperties } from "./playerTank";

const MAX_DRONE_COUNT = 4;

export abstract class DroneTank extends BarrelTank {
    protected readonly _drones: Drones;
    protected readonly _droneProperties: WeaponProperties;
    protected readonly _target = new Vector3();
    protected _radius = 0;

    protected constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._droneProperties = {
            speed: this._properties.weaponSpeed,
            damage: this._properties.weaponDamage,
            damageTime: 0.2,
            health: this._properties.weaponHealth,
        };

        this._drones = new Drones(world, node.parent as TransformNode, this._droneProperties);
        this._target.copyFrom(world.pointerPosition);
    }

    public override dispose(): void {
        this._drones.dispose();
        super.dispose();
    }

    public override readonly weaponType = WeaponType.Drone;

    public override shoot(): void {
        if (this._reloadTime === 0 && this._drones.count < MAX_DRONE_COUNT) {
            for (const barrel of this._barrels) {
                this._shootFrom(barrel);
            }

            this._reloadTime = this._properties.reloadTime;
        }

        super.shoot();
    }

    public override update(deltaTime: number, onDestroy: (entity: Entity) => void): void {
        this._drones.update(deltaTime, this._target, this._radius);
        super.update(deltaTime, onDestroy);
    }

    public override setUpgrades(upgrades: Readonly<TankProperties>): void {
        super.setUpgrades(upgrades);
        this._updateDroneProperties();
    }

    protected _shootFrom(barrel: Barrel): void {
        const drone = barrel.shootDrone(this._drones, this, this._world.sources.drone.tank);
        applyRecoil(this._recoil, drone);
    }

    protected _updateDroneProperties(): void {
        this._droneProperties.speed = this._properties.weaponSpeed;
        this._droneProperties.damage = this._properties.weaponDamage;
        this._droneProperties.health = this._properties.weaponHealth;
    }
}
