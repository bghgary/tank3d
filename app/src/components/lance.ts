import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { Collider } from "../collisions";
import { applyCollisionForce, findNode } from "../common";
import { Entity, EntityType } from "../entity";
import { decayScalar } from "../math";
import { LanceMetadata } from "../metadata";
import { World } from "../worlds/world";
import { WeaponProperties } from "./weapon";

class LanceCollider implements Entity, Collider {
    private readonly _node: TransformNode;
    private readonly _properties: Readonly<WeaponProperties>;
    private readonly _takeDamage: (other: Entity) => void;

    public constructor(owner: Entity, node: TransformNode, properties: Readonly<WeaponProperties>, size: number, takeDamage: (other: Entity) => void) {
        this.owner = owner;
        this._node = node;
        this._properties = properties;
        this.size = size;
        this._takeDamage = takeDamage;
    }

    // Entity
    public get displayName() { return this.owner.displayName; }
    public readonly type = EntityType.Lance;
    public get active() { return this._node.isEnabled(); }
    public readonly size: number;
    public get mass() { return this.size * this.size; }
    public get damage() { return this._properties.damage; }
    public get damageTime() { return this._properties.damageTime; }
    public get position() { return this._node.absolutePosition; }
    public get rotation() { return this.owner.rotation; }
    public get velocity() { return this.owner.velocity; }
    public readonly owner: Entity;

    // Quadtree.Rect
    public get x() { return this._node.absolutePosition.x - this.size * 0.5; }
    public get y() { return this._node.absolutePosition.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public onCollide(other: Entity): number {
        if (this.owner.type === other.type || (other.owner && this.owner.type === other.owner.type)) {
            return 1;
        }

        applyCollisionForce(this.owner, other);
        this._takeDamage(other);
        return other.damageTime;
    }
}

export class Lance {
    private readonly _node: TransformNode;
    private readonly _properties: Readonly<WeaponProperties>;
    private readonly _colliders: Array<LanceCollider>;
    private readonly _collisionToken: IDisposable;

    private _health: number;
    private _targetScale = 1;

    public constructor(world: World, owner: Entity, node: TransformNode, properties: WeaponProperties) {
        this._node = node;
        this._properties = properties;
        this._health = properties.health;

        const midPointNode = findNode(this._node, "midpoint");
        const endPointNode = findNode(this._node, "endpoint");
        const metadata = this._node.metadata as LanceMetadata;
        this._colliders = [
            new LanceCollider(owner, this._node, properties, metadata.diameter, this._takeDamage.bind(this)),
            new LanceCollider(owner, midPointNode, properties, metadata.diameter / 2, this._takeDamage.bind(this)),
            new LanceCollider(owner, endPointNode, properties, 0, this._takeDamage.bind(this)),
        ];

        this._collisionToken = world.collisions.register(this._colliders);
    }

    public dispose(): void {
        this._collisionToken.dispose();
    }

    public setScale(value: number): void {
        this._targetScale = value;
    }

    public update(deltaTime: number): void {
        if (this._health <= 0) {
            this._health = this._properties.health;
            this._node.scaling.z *= 0.6;
        } else {
            this._node.scaling.z = decayScalar(this._node.scaling.z, this._targetScale, deltaTime, 0.5);
            this._health = decayScalar(this._health, this._properties.health, deltaTime, 0.5);
        }
    }

    private _takeDamage(other: Entity): void {
        this._health -= other.damage;
        this._node.scaling.z *= 0.9;
    }
}
