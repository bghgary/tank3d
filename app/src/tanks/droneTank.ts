import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Barrel } from "../barrel";
import { Drones } from "../drones";
import { Entity } from "../entity";
import { ProjectileMetadata } from "../metadata";
import { World } from "../world";
import { BarrelTank } from "./barrelTank";
import { ProjectileType, PlayerTank, TankProperties } from "./playerTank";

const MAX_DRONE_COUNT = 4;

export abstract class DroneTank extends BarrelTank {
    protected readonly _drones: Drones;
    protected readonly _createDroneNode: (parent: TransformNode) => TransformNode;
    protected readonly _droneMetadata: ProjectileMetadata;
    protected readonly _target = new Vector3();
    protected _radius = 0;

    protected constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._droneMetadata = {
            speed: this._properties.projectileSpeed,
            damage: this._properties.projectileDamage,
            health: this._properties.projectileHealth,
        };

        this._drones = new Drones(world, node.parent as TransformNode, this._droneMetadata);
        this._createDroneNode = (parent) => world.sources.create(world.sources.drone.tank, parent);
        this._target.copyFrom(world.pointerPosition);
    }

    public override dispose(): void {
        this._drones.dispose();
        super.dispose();
    }

    public override readonly projectileType = ProjectileType.Drone;

    public override shoot(): void {
        if (this._reloadTime === 0 && this._drones.count < MAX_DRONE_COUNT) {
            for (const barrel of this._barrels) {
                this._shootFrom(barrel);
            }

            this._reloadTime = this._properties.reloadTime;
        }

        super.shoot();
    }

    public override update(deltaTime: number, onDestroyed: (entity: Entity) => void): void {
        this._drones.update(deltaTime, this._target, this._radius);
        super.update(deltaTime, onDestroyed);
    }

    public override setUpgrades(upgrades: Readonly<TankProperties>): void {
        super.setUpgrades(upgrades);
        this._updateDroneMetadata();
    }

    protected _shootFrom(barrel: Barrel): void {
        const drone = barrel.shootDrone(this._drones, this, this._createDroneNode);
        this._recoil.x += drone.velocity.x * drone.mass;
        this._recoil.z += drone.velocity.z * drone.mass;
    }

    protected _updateDroneMetadata(): void {
        this._droneMetadata.speed = this._properties.projectileSpeed;
        this._droneMetadata.damage = this._properties.projectileDamage;
        this._droneMetadata.health = this._properties.projectileHealth;
    }
}
