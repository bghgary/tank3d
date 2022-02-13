import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { Nullable } from "@babylonjs/core/types";
import { Collider } from "../collisions";
import { DroneBehavior } from "../drones";
import { Entity, EntityType } from "../entity";
import { Sources } from "../sources";
import { World } from "../world";
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
    private _targetCollisionToken: Nullable<IDisposable> = null;
    private _targetDistanceSquared = 0;

    public constructor(world: World, parent: TransformNode, previousTank?: PlayerTank) {
        super("Director", DirectorTank.CreateNode(world.sources, parent), {
            projectileSpeed: 0.5,
            reloadTime: 3,
        }, world, previousTank);
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
            this._autoRotateSpeed = this._properties.projectileSpeed * 0.5 / this._rotateRadius;
            this._autoShoot = false;
        }
    }

    public override update(deltaTime: number, onDestroyed: (entity: Entity) => void): void {
        super.update(deltaTime, onDestroyed);

        if (this._autoShoot || this._autoRotate) {
            if (this._targetCollisionToken) {
                this._targetCollisionToken.dispose();
                this._targetCollisionToken = null;
            }

            this._behavior = DroneBehavior.Attack;
            this._droneProperties.speed = this._properties.projectileSpeed;

            if (this._autoShoot) {
                this._target.copyFrom(this._world.pointerPosition);
            } else {
                this._target.copyFrom(this._node.forward).scaleInPlace(this._rotateRadius);
                this._target.addInPlace(this._node.position);
            }
        } else {
            this._behavior = DroneBehavior.Defend;
            this._droneProperties.speed = this._properties.projectileSpeed * 0.5;

            this._target.copyFrom(this._node.position);
            this._targetDistanceSquared = Number.MAX_VALUE;

            if (!this._targetCollisionToken) {
                this._targetCollisionToken = this._world.collisions.register([new TargetCollider(this, TARGET_RADIUS, (other) => {
                    if (other.type === EntityType.Shape || other.type === EntityType.Crasher) {
                        this._behavior = DroneBehavior.Attack;
                        this._droneProperties.speed = this._properties.projectileSpeed;

                        const distanceSquared =
                            (other.type === EntityType.Shape ? TARGET_RADIUS * TARGET_RADIUS : 0) +
                            Vector3.DistanceSquared(this.position, other.position);

                        if (distanceSquared < this._targetDistanceSquared) {
                            this._target.copyFrom(other.position);
                            this._targetDistanceSquared = distanceSquared;
                        }
                    }
                })]);
            }
        }
    }

    public static CreateNode(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.createDirectorTank(parent);
    }
}
