import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Tools } from "@babylonjs/core/Misc/tools";
import { IDisposable } from "@babylonjs/core/scene";
import { DeepImmutable } from "@babylonjs/core/types";
import { Collider } from "../collisions";
import { WeaponProperties, WeaponPropertiesWithMultiplier } from "../components/weapon";
import { Entity, EntityType } from "../entity";
import { TmpVector3 } from "../math";
import { BarrelMetadata } from "../metadata";
import { clone } from "../sources";
import { World } from "../worlds/world";

function applyAngleVariance(forward: DeepImmutable<Vector3>, variance = Tools.ToRadians(2), result: Vector3): Vector3 {
    const angle = Scalar.RandomRange(-variance, variance);
    forward.rotateByQuaternionToRef(Quaternion.FromEulerAngles(0, angle, 0), result);
    return result;
}

function applySpeedVariance(speed: number, variance = 0): number {
    return speed + Scalar.RandomRange(-variance * speed, variance * speed);
}

export interface ProjectileConstructor<T extends Projectile> {
    new(world: World, owner: Entity, node: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number): T;
}

export class Projectiles<T extends Projectile> {
    protected readonly _world: World;
    protected readonly _root: TransformNode;
    protected readonly _collisionToken: IDisposable;
    protected readonly _projectiles = new Set<T>();

    public constructor(world: World, rootName: string) {
        this._world = world;
        this._root = new TransformNode(rootName, this._world.scene);
        this._collisionToken = this._world.collisions.register(this._projectiles);
    }

    public dispose(): void {
        this._root.dispose();
        this._collisionToken.dispose();
    }
}

export abstract class Projectile implements Entity, Collider {
    protected readonly _node: TransformNode;
    protected readonly _properties: DeepImmutable<WeaponProperties>;

    public constructor(owner: Entity, node: TransformNode, properties: DeepImmutable<WeaponProperties>) {
        this.owner = owner;
        this._node = node;
        this._properties = properties;

        const scaling = this._node.scaling;
        this.size = Math.max(scaling.x, scaling.y, scaling.z);
    }

    public static FromBarrel<T extends Projectile>(barrelNode: TransformNode, constructor: ProjectileConstructor<T>, world: World, owner: Entity, node: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number): T {
        const barrelMetadata = barrelNode.metadata as BarrelMetadata;
        const barrelForward = applyAngleVariance(barrelNode.forward, barrelMetadata.angleVariance, TmpVector3[0]);
        const barrelDiameter = barrelMetadata.diameter * barrelNode.absoluteScaling.x;
        const barrelLength = barrelMetadata.length * barrelNode.absoluteScaling.z;

        node.setDirection(barrelForward);
        node.scaling.setAll(barrelDiameter * 0.75);
        properties = new WeaponPropertiesWithMultiplier(properties, barrelMetadata.multiplier);
        const projectile = new constructor(world, owner, node, properties, duration);

        barrelForward.scaleToRef(barrelLength + projectile.size * 0.5, projectile._node.position).addInPlace(barrelNode.absolutePosition);

        const speed = applySpeedVariance(properties.speed, barrelMetadata.speedVariance);
        const initialSpeed = Math.max(Vector3.Dot(owner.velocity, barrelForward) + speed, 0.1);
        projectile.velocity.copyFrom(barrelForward).scaleInPlace(initialSpeed);

        return projectile;
    }

    public clone<T extends Projectile>(constructor: ProjectileConstructor<T>, world: World, duration: number): T {
        const node = clone(this._node as AbstractMesh, this._node.parent as TransformNode);
        return new constructor(world, this.owner, node, this._properties, duration);
    }

    // Entity
    public get displayName() { return this.owner.displayName; }
    public abstract readonly type: EntityType;
    public get active() { return this._node.isEnabled(); }
    public readonly size: number;
    public get mass() { return this.size * this.size; }
    public get damage() { return this._properties.damage; }
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
