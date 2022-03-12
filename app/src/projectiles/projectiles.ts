import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { Collider } from "../collisions";
import { ApplyVariance } from "../common";
import { Entity, EntityType } from "../entity";
import { TmpVector3 } from "../math";
import { BarrelMetadata, ProjectileMetadata } from "../metadata";
import { World } from "../worlds/world";

export class Projectiles {
    protected readonly _world: World;
    protected readonly _root: TransformNode;
    protected readonly _collisionToken: IDisposable;

    public constructor(world: World, rootName: string, projectiles: Iterable<Projectile>) {
        this._world = world;
        this._root = new TransformNode(rootName, this._world.scene);
        this._collisionToken = this._world.collisions.register(projectiles);
    }

    public dispose(): void {
        this._root.dispose();
        this._collisionToken.dispose();
    }
}

export abstract class Projectile implements Entity, Collider {
    protected readonly _node: TransformNode;
    protected readonly _metadata: Readonly<ProjectileMetadata>;

    public constructor(owner: Entity, barrelNode: TransformNode, barrelMetadata: Readonly<BarrelMetadata>, projectileNode: TransformNode, projectileMetadata: Readonly<ProjectileMetadata>) {
        this.owner = owner;
        this.size = barrelMetadata.diameter * 0.75;

        this._node = projectileNode;
        this._node.scaling.setAll(this.size);

        this._metadata = projectileMetadata;

        const forward = ApplyVariance(barrelNode.forward, barrelMetadata.variance, TmpVector3[0]);
        forward.scaleToRef(barrelMetadata.length + this.size * 0.5, this._node.position).addInPlace(barrelNode.absolutePosition);

        this._node.rotationQuaternion!.copyFrom(barrelNode.absoluteRotationQuaternion);

        const initialSpeed = Math.max(Vector3.Dot(this.owner.velocity, forward) + projectileMetadata.speed, 0.1);
        this.velocity.copyFrom(forward).scaleInPlace(initialSpeed);
    }

    // Entity
    public get displayName() { return this.owner.displayName; }
    public abstract readonly type: EntityType;
    public get active() { return this._node.isEnabled(); }
    public readonly size: number;
    public get mass() { return this.size * this.size; }
    public get damage() { return this._metadata.damage; }
    public get position() { return this._node.position; }
    public get rotation() { return this._node.rotationQuaternion!; }
    public readonly velocity = new Vector3();
    public readonly owner: Entity;

    // Quadtree.Rect
    public get x() { return this._node.position.x - this.size * 0.5; }
    public get y() { return this._node.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    // Collider
    public abstract onCollide(other: Entity): number;
}
