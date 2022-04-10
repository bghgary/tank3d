import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { DeepImmutable, Nullable } from "@babylonjs/core/types";
import { TargetCollider } from "../collisions";
import { applyRecoil } from "../common";
import { Barrel } from "../components/barrel";
import { WeaponProperties, WeaponType } from "../components/weapon";
import { Entity, EntityType } from "../entity";
import { SingleTargetDrones } from "../projectiles/drones";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { BarrelTank } from "./barrelTank";
import { PlayerTank, TankProperties } from "./playerTank";

const TARGET_RADIUS = 10;

export class DirectorTank extends BarrelTank {
    private readonly _circleRadius: number;
    private readonly _droneProperties: WeaponProperties;
    private readonly _drones: SingleTargetDrones;
    private _barrelIndex = 0;
    private _targetCollisionToken: Nullable<IDisposable> = null;
    private _targetDistanceSquared = Number.MAX_VALUE;
    private _defendTime = 0;

    protected readonly _maxDroneCount: number = 4;

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

    public override readonly weaponType = WeaponType.Drone;

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

    public override shoot(): void {
        if (this._reloadTime === 0) {
            for (let i = 0; i < this._barrels.length; ++i) {
                if (this._drones.count < this._maxDroneCount) {
                    this._shootFrom(this._barrels[this._barrelIndex]!);
                    this._barrelIndex = (this._barrelIndex + 1) % this._barrels.length;
                }
            }

            this._reloadTime = this._properties.reloadTime;
        }

        super.shoot();
    }

    public override update(deltaTime: number, onDestroy: (entity: Entity) => void): void {
        this.shoot();

        if ((this.inBounds && this._autoShoot) || this._autoRotate) {
            if (this._targetCollisionToken) {
                this._targetCollisionToken.dispose();
                this._targetCollisionToken = null;
            }

            this._drones.radius = 0;
            if (this._autoShoot) {
                this._drones.target.copyFrom(this._world.pointerPosition);
            } else {
                this._drones.target.copyFrom(this._node.forward).scaleInPlace(this._circleRadius).addInPlace(this._node.position);
            }

            this._droneProperties.speed = this._properties.weaponSpeed;
        } else {
            this._defendTime = Math.max(this._defendTime - deltaTime, 0);
            if (this._defendTime === 0) {
                this._drones.radius = this._circleRadius;
                this._drones.target.copyFrom(this._node.position);
                this._droneProperties.speed = this._properties.weaponSpeed * 0.5;
            }

            this._targetDistanceSquared = Number.MAX_VALUE;

            if (!this._targetCollisionToken) {
                this._targetCollisionToken = this._world.collisions.register([new TargetCollider(this._node.position, TARGET_RADIUS * 2, (other) => {
                    if (this.inBounds && other.type !== EntityType.Bullet && other !== this && other.owner !== this) {
                        const distanceSquared =
                            (other.type === EntityType.Shape ? TARGET_RADIUS * TARGET_RADIUS : 0) +
                            Vector3.DistanceSquared(this.position, other.position);

                        if (distanceSquared < this._targetDistanceSquared) {
                            this._drones.radius = 0;
                            this._drones.target.copyFrom(other.position);
                            this._droneProperties.speed = this._properties.weaponSpeed;
                            this._targetDistanceSquared = distanceSquared;
                            this._defendTime = 1;
                        }
                    }
                })]);
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
        const drone = barrel.shootDrone(this._drones, this, this._world.sources.drone.tank);
        applyRecoil(this._recoil, drone);
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

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.director, parent);
    }
}
