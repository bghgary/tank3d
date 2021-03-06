import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { DeepImmutable, Nullable } from "@babylonjs/core/types";
import { TargetCollider } from "../collisions";
import { getThreatValue, isTarget } from "../common";
import { Barrel } from "../components/barrel";
import { WeaponProperties } from "../components/weapon";
import { Entity } from "../entity";
import { DroneConstructor, SingleTargetDrone, SingleTargetDrones } from "../projectiles/drones";
import { Sources } from "../sources";
import { getUpgradeNames } from "../ui/upgrades";
import { World } from "../worlds/world";
import { BarrelTank } from "./barrelTank";
import { PlayerTank, TankProperties } from "./playerTank";

const TARGET_RADIUS = 10;

export class DirectorTank extends BarrelTank {
    protected readonly _droneProperties: WeaponProperties;
    protected readonly _drones: SingleTargetDrones;
    protected readonly _maxDroneCount: number = 4;
    protected readonly _droneConstructor: DroneConstructor<SingleTargetDrone> = SingleTargetDrone;
    protected readonly _droneSource = this._world.sources.drone.tank;

    private readonly _circleRadius: number;
    private _barrelIndex = 0;
    private _targetCollisionToken: Nullable<IDisposable> = null;
    private _targetThreatValue = Number.MAX_VALUE;
    private _defendTime = 0;

    public constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._circleRadius = this._metadata.size + 2;

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
    }

    public override dispose(): void {
        if (this._targetCollisionToken) {
            this._targetCollisionToken.dispose();
            this._targetCollisionToken = null;
        }

        this._drones.dispose();

        super.dispose();
    }

    public override readonly upgradeNames = getUpgradeNames("Drone");

    public override toggleAutoShoot(): void {
        super.toggleAutoShoot();
        if (this._autoShoot) {
            this._autoRotate = false;
        }
    }

    public override toggleAutoRotate(): void {
        super.toggleAutoRotate();
        if (this._autoRotate) {
            this._updateAutoRotateSpeed();
            this._autoShoot = false;
        }
    }

    public override update(deltaTime: number, onDestroy: (entity: Entity) => void): void {
        if (this.inBounds && !this.idle && this._reloadTime === 0) {
            for (let i = 0; i < this._barrels.length; ++i) {
                if (this._drones.count < this._maxDroneCount) {
                    this._shootFrom(this._barrels[this._barrelIndex]!);
                    this._barrelIndex = (this._barrelIndex + 1) % this._barrels.length;
                }
            }

            this._reloadTime = this._properties.reloadTime;
        }

        const target = this._drones.target;
        if ((this.inBounds && this._autoShoot) || this._autoRotate) {
            if (this._targetCollisionToken) {
                this._targetCollisionToken.dispose();
                this._targetCollisionToken = null;
            }

            target.radius = 0;
            if (this._autoShoot) {
                target.position.copyFrom(this._world.pointerPosition);
            } else {
                target.position.copyFrom(this._node.forward).scaleInPlace(this._circleRadius).addInPlace(this._node.position);
            }
            target.size = 1;

            this._droneProperties.speed = this._properties.weaponSpeed;
        } else {
            this._defendTime = Math.max(this._defendTime - deltaTime, 0);
            if (this._defendTime === 0) {
                target.radius = this._circleRadius;
                target.position.copyFrom(this._node.position);
                target.size = 1;
                this._droneProperties.speed = this._properties.weaponSpeed * 0.5;
            }

            this._targetThreatValue = 0;

            if (!this._targetCollisionToken) {
                this._targetCollisionToken = this._world.collisions.register([
                    new TargetCollider(this._node.position, TARGET_RADIUS, (other) => {
                        if (this.inBounds && isTarget(other, this)) {
                            const threatValue = getThreatValue(other, Vector3.Distance(this.position, other.position));
                            if (threatValue > this._targetThreatValue) {
                                this._targetThreatValue = threatValue;
                                target.radius = 0;
                                target.position.copyFrom(other.position);
                                target.size = other.size;
                                this._droneProperties.speed = this._properties.weaponSpeed;
                                this._defendTime = 1;
                            }
                        }
                    })
                ]);
            }
        }

        this._drones.update(deltaTime);
        super.update(deltaTime, onDestroy);
    }

    public override setUpgrades(upgrades: DeepImmutable<TankProperties>): void {
        super.setUpgrades(upgrades);
        this._updateDroneProperties();
    }

    protected _shootFrom(barrel: Barrel): void {
        barrel.shootDrone(this._drones, this._droneConstructor, this, this._droneSource, Number.POSITIVE_INFINITY, this._recoil);
    }

    protected _updateDroneProperties(): void {
        this._droneProperties.speed = this._properties.weaponSpeed;
        this._droneProperties.damage.value = this._properties.weaponDamage;
        this._droneProperties.health = this._properties.weaponHealth;
        this._updateAutoRotateSpeed();
    }

    private _updateAutoRotateSpeed(): void {
        this._autoRotateSpeed = this._properties.weaponSpeed * 0.5 / this._circleRadius;
    }

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.director, parent);
    }
}
