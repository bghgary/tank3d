import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DroneProperties, Drones } from "../drones";
import { Entity } from "../entity";
import { World } from "../world";
import { Barrel, BarrelTank } from "./barrelTank";
import { ProjectileType, Tank, TankProperties } from "./tank";

const MAX_DRONE_COUNT = 4;

export class DroneTank extends BarrelTank {
    protected readonly _drones: Drones;
    protected readonly _createDroneNode: (parent: TransformNode) => TransformNode;

    protected constructor(displayName: string, node: TransformNode, multiplier: Partial<TankProperties>, world: World, previousTank?: Tank) {
        super(displayName, node, multiplier, world, previousTank);

        this._drones = new Drones(world, node.parent as TransformNode, this._getDroneProperties());
        this._createDroneNode = (parent) => world.sources.createTankDrone(parent);
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
        this._drones.update(deltaTime);
        super.update(deltaTime, onDestroyed);
    }

    public override setUpgrades(upgrades: TankProperties): void {
        super.setUpgrades(upgrades);
        this._drones.setProperties(this._getDroneProperties());
    }

    protected _shootFrom(barrel: Barrel): void {
        const drone = barrel.shootDrone(this._drones, this, this._createDroneNode);
        this._recoil.x += drone.velocity.x * drone.mass;
        this._recoil.z += drone.velocity.z * drone.mass;
    }

    private _getDroneProperties(): DroneProperties {
        return {
            speed: this._properties.projectileSpeed,
            damage: this._properties.projectileDamage,
            health: this._properties.projectileHealth,
        };
    }
}
