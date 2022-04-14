import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { applyRecoil } from "../common";
import { WeaponProperties, WeaponType } from "../components/weapon";
import { Entity } from "../entity";
import { AutoTargetDrone, AutoTargetDrones } from "../projectiles/drones";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { BarrelTank } from "./barrelTank";
import { PlayerTank, TankProperties } from "./playerTank";

export class DetectorTank extends BarrelTank {
    private readonly _autoTargetDrones: AutoTargetDrones;
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
        this._autoTargetDrones = new AutoTargetDrones(world, parent, this._droneProperties);
    }

    public override dispose(): void {
        this._autoTargetDrones.dispose();
        super.dispose();
    }

    public override readonly weaponType = WeaponType.Drone;

    public override shoot(): void {
        if (this._reloadTime === 0) {
            for (const barrel of this._barrels) {
                const drone = barrel.shootDrone(this._autoTargetDrones, AutoTargetDrone, this, this._world.sources.drone.tank, 5);
                applyRecoil(this._recoil, drone);
            }

            this._reloadTime = this._properties.reloadTime;
        }

        super.shoot();
    }

    public override update(deltaTime: number, onDestroy: (entity: Entity) => void): void {
        this._autoTargetDrones.update(deltaTime);
        super.update(deltaTime, onDestroy);
    }

    public override setUpgrades(upgrades: DeepImmutable<TankProperties>): void {
        super.setUpgrades(upgrades);
        this._droneProperties.speed = this._properties.weaponSpeed;
        this._droneProperties.damage.value = this._properties.weaponDamage;
        this._droneProperties.health = this._properties.weaponHealth;
    }

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.detector, parent);
    }
}