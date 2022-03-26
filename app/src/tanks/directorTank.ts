import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { Nullable } from "@babylonjs/core/types";
import { Collider } from "../collisions";
import { Entity, EntityType } from "../entity";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { DroneTank } from "./droneTank";
import { PlayerTank } from "./playerTank";

const TARGET_RADIUS = 20;

class TargetCollider implements Collider {
    private readonly _parent: Entity;
    private readonly _onCollide: (other: Entity) => void;

    constructor(parent: Entity, size: number, onCollide: (other: Entity) => void) {
        this._parent = parent;
        this.size = size;
        this._onCollide = onCollide;
    }

    // Collider
    public readonly active = true;
    public get position() { return this._parent.position; }
    public readonly size: number;
    public get x() { return this._parent.position.x - this.size * 0.5; }
    public get y() { return this._parent.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public onCollide(other: Entity): number {
        this._onCollide(other);
        return 0;
    }
}

export class DirectorTank extends DroneTank {
    private readonly _circleRadius: number;
    private _targetCollisionToken: Nullable<IDisposable> = null;
    private _targetDistanceSquared = 0;
    private _defendTime = 0;

    public constructor(world: World, parent: TransformNode, previousTank?: PlayerTank) {
        super(world, DirectorTank.CreateMesh(world.sources, parent), previousTank);

        this._circleRadius = this._metadata.size + 2;
    }

    public override dispose(): void {
        if (this._targetCollisionToken) {
            this._targetCollisionToken.dispose();
            this._targetCollisionToken = null;
        }

        super.dispose();
    }

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
        this.shoot();

        if ((this.inBounds && this._autoShoot) || this._autoRotate) {
            if (this._targetCollisionToken) {
                this._targetCollisionToken.dispose();
                this._targetCollisionToken = null;
            }

            this._radius = 0;
            this._droneProperties.speed = this._properties.weaponSpeed;

            if (this._autoShoot) {
                this._target.copyFrom(this._world.pointerPosition);
            } else {
                this._target.copyFrom(this._node.forward).scaleInPlace(this._circleRadius);
                this._target.addInPlace(this._node.position);
            }
        } else {
            this._defendTime = Math.max(this._defendTime - deltaTime, 0);
            if (this._defendTime === 0) {
                this._radius = this._circleRadius;
                this._droneProperties.speed = this._properties.weaponSpeed * 0.5;

                this._target.copyFrom(this._node.position);
                this._targetDistanceSquared = Number.MAX_VALUE;
            }

            if (!this._targetCollisionToken) {
                this._targetCollisionToken = this._world.collisions.register([new TargetCollider(this, TARGET_RADIUS, (other) => {
                    if (this.inBounds && other.type !== EntityType.Bullet && other !== this && other.owner !== this) {
                        this._radius = 0;
                        this._droneProperties.speed = this._properties.weaponSpeed;

                        const distanceSquared =
                            (other.type === EntityType.Shape ? TARGET_RADIUS * TARGET_RADIUS : 0) +
                            Vector3.DistanceSquared(this.position, other.position);

                        if (distanceSquared < this._targetDistanceSquared) {
                            this._target.copyFrom(other.position);
                            this._targetDistanceSquared = distanceSquared;
                            this._defendTime = 1;
                        }
                    }
                })]);
            }
        }

        super.update(deltaTime, onDestroy);
    }

    protected override _updateDroneProperties(): void {
        super._updateDroneProperties();
        this._updateAutoRotateSpeed();
    }

    private _updateAutoRotateSpeed(): void {
        this._autoRotateSpeed = this._properties.weaponSpeed * 0.5 / this._circleRadius;
    }

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.director, parent);
    }
}
