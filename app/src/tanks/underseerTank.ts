import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable, DeepImmutableObject } from "@babylonjs/core/types";
import { WeaponProperties } from "../components/weapon";
import { Entity, EntityType } from "../entity";
import { DroneConstructor, SingleTargetDrone } from "../projectiles/drones";
import { Shape } from "../shapes";
import { Sources } from "../sources";
import { getUpgradeNames } from "../ui/upgrades";
import { World } from "../worlds/world";
import { DirectorTank } from "./directorTank";
import { PlayerTank, TankProperties } from "./playerTank";

const BASE_MAX_CLONE_COUNT = 10;

interface UnderseerTankInternal extends Entity {
    _addDrone(position: DeepImmutable<Vector3>, rotation: DeepImmutable<Quaternion>): void;
}

export class UnderseerTank extends DirectorTank {
    protected override readonly _maxDroneCount: number = 1;
    protected override readonly _droneConstructor: DroneConstructor<SingleTargetDrone> = UnderseerDrone;
    protected override readonly _droneSource = this._world.sources.drone.tankUnderseer;

    private readonly _removeEmptyDestroyedObserver: () => void;
    private _maxCloneCount = BASE_MAX_CLONE_COUNT;

    public constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        const observer = world.onEnemyDestroyedObservable.add(([source, target]) => {
            if (source === this && target.type === EntityType.Shape && target.points === 10) {
                this._addDrone(target.position, target.rotation);
            }
        });

        this._removeEmptyDestroyedObserver = () => {
            world.onEnemyDestroyedObservable.remove(observer);
        };
    }

    public override dispose(): void {
        this._removeEmptyDestroyedObserver();
        super.dispose();
    }

    public override readonly upgradeNames = getUpgradeNames("Drone", undefined, "Max Drone Count");

    public static override Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.underseer, parent);
    }

    public override setUpgrades(upgrades: DeepImmutableObject<TankProperties>): void {
        super.setUpgrades(upgrades);
        this._maxCloneCount = BASE_MAX_CLONE_COUNT + upgrades.reloadTime;
        this._properties.reloadTime = 3;
    }

    protected _addDrone(position: DeepImmutable<Vector3>, rotation: DeepImmutable<Quaternion>): void {
        if (this._drones.count < this._maxCloneCount) {
            const drone = this._barrels[0]!.addDrone(this._drones, this._droneConstructor, this, this._droneSource, Number.POSITIVE_INFINITY);
            drone.position.copyFrom(position);
            drone.rotation.copyFrom(rotation);
            drone.velocity.setAll(0);
        }
    }
}

class UnderseerDrone extends SingleTargetDrone {
    private readonly _removeEntityDestroyedObserver: () => void;

    public constructor(world: World, owner: Entity, node: TransformNode, barrelNode: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        super(world, owner, node, barrelNode, properties, duration);

        const observer = world.onEnemyDestroyedObservable.add(([source, target]) => {
            if (source === this && target.type === EntityType.Shape && target.points === 10) {
                const underseerTank = (owner as UnderseerTankInternal);
                underseerTank._addDrone(target.position, target.rotation);
            }
        });

        this._removeEntityDestroyedObserver = () => {
            world.onEnemyDestroyedObservable.remove(observer);
        };
    }

    public override update(deltaTime: number, onDestroy: () => void): void {
        super.update(deltaTime, () => {
            this._removeEntityDestroyedObserver();
            onDestroy();
        });
    }

    public override onCollide(other: Entity): number {
        if (other.type === EntityType.Shape && (other as Shape).points === 10) {
            return 1;
        }

        return super.onCollide(other);
    }
}
