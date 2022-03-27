import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Tools } from "@babylonjs/core/Misc/tools";
import { IDisposable } from "@babylonjs/core/scene";
import { Collider } from "../collisions";
import { WeaponProperties, WeaponPropertiesWithMultiplier } from "../components/weapon";
import { Entity, EntityType } from "../entity";
import { TmpVector3 } from "../math";
import { BarrelMetadata } from "../metadata";
import { World } from "../worlds/world";

function applyAngleVariance(forward: Readonly<Vector3>, variance = Tools.ToRadians(2), result: Vector3): Vector3 {
    const angle = Scalar.RandomRange(-variance, variance);
    forward.rotateByQuaternionToRef(Quaternion.FromEulerAngles(0, angle, 0), result);
    return result;
}

function applySpeedVariance(speed: number, variance = 0): number {
    return speed + Scalar.RandomRange(-variance * speed, variance * speed);
}

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
    protected readonly _properties: WeaponPropertiesWithMultiplier;

    public constructor(owner: Entity, barrelNode: TransformNode, projectileNode: TransformNode, properties: Readonly<WeaponProperties>) {
        const barrelMetadata = barrelNode.metadata as BarrelMetadata;
        const barrelDiameter = barrelMetadata.diameter * barrelNode.absoluteScaling.x;
        const barrelLength = barrelMetadata.length * barrelNode.absoluteScaling.z;

        this.owner = owner;
        this.size = barrelDiameter * 0.75;

        this._node = projectileNode;
        this._node.scaling.setAll(this.size);

        const forward = applyAngleVariance(barrelNode.forward, barrelMetadata.angleVariance, TmpVector3[0]);
        forward.scaleToRef(barrelLength + this.size * 0.5, this._node.position).addInPlace(barrelNode.absolutePosition);

        this._node.rotationQuaternion!.copyFrom(barrelNode.absoluteRotationQuaternion);

        const speed = applySpeedVariance(properties.speed, barrelMetadata.speedVariance);
        const initialSpeed = Math.max(Vector3.Dot(this.owner.velocity, forward) + speed, 0.1);
        this.velocity.copyFrom(forward).scaleInPlace(initialSpeed);

        this._properties = new WeaponPropertiesWithMultiplier(properties, barrelMetadata.multiplier);
    }

    // Entity
    public get displayName() { return this.owner.displayName; }
    public abstract readonly type: EntityType;
    public get active() { return this._node.isEnabled(); }
    public readonly size: number;
    public get mass() { return this.size * this.size; }
    public get damage() { return this._properties.damage; }
    public get damageTime() { return this._properties.damageTime; }
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
