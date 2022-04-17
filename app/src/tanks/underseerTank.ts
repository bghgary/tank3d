import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable, DeepImmutableObject, Nullable } from "@babylonjs/core/types";
import { WeaponProperties } from "../components/weapon";
import { Entity, EntityType } from "../entity";
import { DroneConstructor, DroneTarget, SingleTargetDrone } from "../projectiles/drones";
import { Sources } from "../sources";
import { getUpgradeNames } from "../ui/upgrades";
import { World } from "../worlds/world";
import { DirectorTank } from "./directorTank";
import { TankProperties } from "./playerTank";

const BASE_MAX_CLONE_COUNT = 10;

interface UnderseerTankInternal extends Entity {
    _cloneDrone(drone: SingleTargetDrone): Nullable<SingleTargetDrone>;
}

export class UnderseerTank extends DirectorTank {
    protected override readonly _maxDroneCount: number = 1;
    protected override readonly _droneConstructor: DroneConstructor<SingleTargetDrone> = UnderseerDrone;
    protected override readonly _droneSource = this._world.sources.drone.tankUnderseer;

    private _maxCloneCount = BASE_MAX_CLONE_COUNT;

    public override readonly upgradeNames = getUpgradeNames("Drone", undefined, "Max Drone Count");

    public static override CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.underseer, parent);
    }

    public override setUpgrades(upgrades: DeepImmutableObject<TankProperties>): void {
        super.setUpgrades(upgrades);
        this._maxCloneCount = BASE_MAX_CLONE_COUNT + upgrades.reloadTime;
        this._properties.reloadTime = 3;
    }

    protected _cloneDrone(source: SingleTargetDrone): Nullable<SingleTargetDrone> {
        if (this._drones.count >= this._maxCloneCount) {
            return null;
        }

        return this._drones.clone(source, this._droneConstructor, Number.POSITIVE_INFINITY);
    }
}

class UnderseerDrone extends SingleTargetDrone {
    private readonly _removeEmptyDestroyedObservable: () => void;

    public constructor(world: World, owner: Entity, node: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        super(world, owner, node, properties, duration);

        const observer = world.onEnemyDestroyedObservable.add(([source, target]) => {
            if (source === this && target.type === EntityType.Shape && target.points === 10) {
                const underseerTank = (owner as UnderseerTankInternal);
                const clone = underseerTank._cloneDrone(this);
                if (clone) {
                    clone.position.copyFrom(this.position);
                    clone.rotation.copyFrom(this.rotation);
                }
            }
        });

        this._removeEmptyDestroyedObservable = () => {
            world.onEnemyDestroyedObservable.remove(observer);
        };
    }

    public override update(deltaTime: number, target: DroneTarget, onDestroy: () => void): void {
        super.update(deltaTime, target, () => {
            this._removeEmptyDestroyedObservable();
            onDestroy();
        });
    }
}
