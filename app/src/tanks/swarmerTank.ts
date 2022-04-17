import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { applyRecoil } from "../common";
import { WeaponProperties } from "../components/weapon";
import { Entity } from "../entity";
import { AutoTargetDrone, AutoTargetDrones, SingleTargetDrone, SingleTargetDrones } from "../projectiles/drones";
import { Sources } from "../sources";
import { getUpgradeNames } from "../ui/upgrades";
import { World } from "../worlds/world";
import { BarrelTank } from "./barrelTank";
import { PlayerTank, TankProperties } from "./playerTank";

export class SwarmerTank extends BarrelTank {
    private readonly _singleTargetDrones: SingleTargetDrones;
    private readonly _autoTargetDrones: AutoTargetDrones;
    private readonly _droneProperties: WeaponProperties;

    private _toggle = false;

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
        this._singleTargetDrones = new SingleTargetDrones(world, parent, this._droneProperties);
        this._autoTargetDrones = new AutoTargetDrones(world, parent, this._droneProperties);
    }

    public override dispose(): void {
        this._singleTargetDrones.dispose();
        this._autoTargetDrones.dispose();
        super.dispose();
    }

    public override readonly upgradeNames = getUpgradeNames("Drone");

    public override shoot(): void {
        if (this._reloadTime === 0) {
            for (const barrel of this._barrels) {
                const source = this._world.sources.drone.tank;
                const duration = 5;
                const drone = this._toggle
                    ? barrel.shootDrone(this._autoTargetDrones, AutoTargetDrone, this, source, duration)
                    : barrel.shootDrone(this._singleTargetDrones, SingleTargetDrone, this, source, duration);
                applyRecoil(this._recoil, drone);
            }

            this._reloadTime = this._properties.reloadTime;
            this._toggle = !this._toggle;
        }

        super.shoot();
    }

    public override update(deltaTime: number, onDestroy: (entity: Entity) => void): void {
        this._singleTargetDrones.target.position.copyFrom(this._world.pointerPosition);
        this._singleTargetDrones.update(deltaTime);

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
        return sources.create(sources.tank.swarmer, parent);
    }
}
