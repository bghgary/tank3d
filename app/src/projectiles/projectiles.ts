import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Tools } from "@babylonjs/core/Misc/tools";
import { IDisposable } from "@babylonjs/core/scene";
import { DeepImmutable } from "@babylonjs/core/types";
import { Collider } from "../collisions";
import { Flash } from "../components/flash";
import { Health } from "../components/health";
import { Shadow } from "../components/shadow";
import { WeaponProperties, WeaponPropertiesWithMultiplier } from "../components/weapon";
import { Entity, EntityType } from "../entity";
import { TmpVector3 } from "../math";
import { BarrelMetadata } from "../metadata";
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
    new(world: World, owner: Entity, node: TransformNode, barrelNode: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number): T;
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

    public get count(): number {
        return this._projectiles.size;
    }

    protected _add(constructor: ProjectileConstructor<T>, owner: Entity, source: TransformNode, properties: DeepImmutable<WeaponProperties>, barrelNode: TransformNode, duration: number): T {
        const node = this._world.sources.create(source, this._root);
        const projectile = new constructor(this._world, owner, node, barrelNode, properties, duration);
        this._projectiles.add(projectile);
        return projectile;
    }

    public update(deltaTime: number): void {
        for (const projectile of this._projectiles) {
            projectile.update(deltaTime, () => {
                this._projectiles.delete(projectile);
            });
        }
    }
}

export abstract class Projectile implements Entity, Collider {
    protected readonly _node: TransformNode;
    protected readonly _properties: WeaponPropertiesWithMultiplier;
    protected readonly _shadow: Shadow;
    protected readonly _flash: Flash;
    protected abstract readonly _health: Health;

    protected _time: number;

    public constructor(world: World, owner: Entity, node: TransformNode, barrelNode: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        this.owner = owner;

        this._node = node;
        const barrelMetadata = barrelNode.metadata as BarrelMetadata;
        this._properties = new WeaponPropertiesWithMultiplier(properties, barrelMetadata.multiplier);
        const barrelDiameter = barrelMetadata.diameter * barrelNode.absoluteScaling.x;
        this._node.scaling.setAll(barrelDiameter * 0.75);

        this._shadow = new Shadow(world.sources, this._node);
        this._flash = new Flash(this._node);

        this._time = duration;
    }

    public shoot(barrelNode: TransformNode): void {
        const barrelMetadata = barrelNode.metadata as BarrelMetadata;

        const barrelForward = applyAngleVariance(barrelNode.forward, barrelMetadata.angleVariance, TmpVector3[0]);
        const barrelLength = barrelMetadata.length * barrelNode.absoluteScaling.z;
        barrelForward.scaleToRef(barrelLength + this.size * 0.5, this._node.position).addInPlace(barrelNode.absolutePosition);
        this._node.setDirection(barrelForward);
        this._node.computeWorldMatrix();

        const speed = applySpeedVariance(this._properties.speed, barrelMetadata.speedVariance);
        const initialSpeed = Math.max(Vector3.Dot(this.owner.velocity, barrelForward) + speed, 0.1);
        this.velocity.copyFrom(barrelForward).scaleInPlace(initialSpeed);
    }

    public update(deltaTime: number, onDestroy: () => void): void {
        this._flash.update(deltaTime);

        if (!this._health.update(deltaTime) || (this._time -= deltaTime) <= 0) {
            onDestroy();
            this._node.dispose();
        }
    }

    // Entity
    public get displayName() { return this.owner.displayName; }
    public abstract readonly type: EntityType;
    public get active() { return this._node.isEnabled(); }
    public get size() { return this._node.scaling.x; }
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
