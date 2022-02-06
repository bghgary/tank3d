import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { Bullet } from "../bullets";
import { CollidableEntity } from "../collisions";
import { ApplyCollisionForce, ApplyWallClamp } from "../common";
import { Entity, EntityType } from "../entity";
import { Health } from "../health";
import { Shadow } from "../shadow";
import { Shield } from "../shield";
import { TankMetadata } from "../sources";
import { World } from "../world";

export interface TankProperties {
    readonly bulletSpeed: number;
    readonly bulletDamage: number;
    readonly bulletHealth: number;
    readonly reloadTime: number;
    readonly healthRegen: number;
    readonly maxHealth: number;
    readonly moveSpeed: number;
    readonly bodyDamage: number;
}

const BaseProperties: TankProperties = {
    bulletSpeed: 5,
    bulletDamage: 6,
    bulletHealth: 10,
    reloadTime: 0.5,
    healthRegen: 0,
    maxHealth: 100,
    moveSpeed: 5,
    bodyDamage: 30,
};

function add(properties: TankProperties, value: Partial<TankProperties>): TankProperties {
    return {
        bulletSpeed:  properties.bulletSpeed  + (value.bulletSpeed  || 0),
        bulletDamage: properties.bulletDamage + (value.bulletDamage || 0),
        bulletHealth: properties.bulletHealth + (value.bulletHealth || 0),
        reloadTime:   properties.reloadTime   + (value.reloadTime   || 0),
        healthRegen:  properties.healthRegen  + (value.healthRegen  || 0),
        maxHealth:    properties.maxHealth    + (value.maxHealth    || 0),
        moveSpeed:    properties.moveSpeed    + (value.moveSpeed    || 0),
        bodyDamage:   properties.bodyDamage   + (value.bodyDamage   || 0),
    };
}

function multiply(properties: TankProperties, value: Partial<TankProperties>): TankProperties {
    return {
        bulletSpeed:  properties.bulletSpeed  * (value.bulletSpeed  || 1),
        bulletDamage: properties.bulletDamage * (value.bulletDamage || 1),
        bulletHealth: properties.bulletHealth * (value.bulletHealth || 1),
        reloadTime:   properties.reloadTime   * (value.reloadTime   || 1),
        healthRegen:  properties.healthRegen  * (value.healthRegen  || 1),
        maxHealth:    properties.maxHealth    * (value.maxHealth    || 1),
        moveSpeed:    properties.moveSpeed    * (value.moveSpeed    || 1),
        bodyDamage:   properties.bodyDamage   * (value.bodyDamage   || 1),
    };
}

export class Tank implements CollidableEntity {
    private readonly _multiplier: Partial<TankProperties>;
    private readonly _collisionToken: IDisposable;

    protected readonly _node: TransformNode;
    protected readonly _shield: Shield;
    protected readonly _health: Health;
    protected readonly _shadow: Shadow;

    protected _properties: TankProperties;

    protected get _metadata(): TankMetadata {
        return this._node.metadata;
    }

    protected constructor(displayName: string, node: TransformNode, multiplier: Partial<TankProperties>, world: World, previousTank?: Tank) {
        this.displayName = displayName;

        this._node = node;
        this._multiplier = multiplier;
        this._properties = multiply(BaseProperties, multiplier);

        if (previousTank) {
            this._node.position.copyFrom(previousTank._node.position);
            this._node.rotationQuaternion!.copyFrom(previousTank._node.rotationQuaternion!);

            this._shield = previousTank._shield;
            this._shield.setParent(this._node);

            this._health = previousTank._health;
            this._health.setParent(this._node);

            this._shadow = previousTank._shadow;
            this._shadow.setParent(this._node);

            previousTank.dispose();
        } else {
            this._shield = new Shield(world.sources, node);
            this._health = new Health(world.sources, this._node, this._properties.maxHealth, this._properties.healthRegen);
            this._shadow = new Shadow(world.sources, this._node);
        }

        this._collisionToken = world.collisions.register([this]);
    }

    public dispose(): void {
        this._node.dispose();
        this._collisionToken.dispose();
    }

    public get shielded(): boolean {
        return this._shield.enabled;
    }

    // Entity
    public readonly displayName: string;
    public readonly type = EntityType.Tank;
    public get size() { return this._shield.enabled ? this._shield.size : this._metadata.size; }
    public readonly mass = 2;
    public get damage() { return this._shield.enabled ? 0 : this._properties.bodyDamage; }
    public get position() { return this._node.position; }
    public get rotation() { return this._node.rotationQuaternion!; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._node.position.x - this.size * 0.5; }
    public get y() { return this._node.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public lookAt(targetPoint: Vector3): void {
        this._node.lookAt(targetPoint);
    }

    public rotate(value: number): void {
        this._node.addRotation(0, value, 0);
    }

    public move(deltaTime: number, x: number, z: number, limit: number): void {
        const decayFactor = Math.exp(-deltaTime * 2);

        if (x !== 0 || z !== 0) {
            const moveFactor = this._properties.moveSpeed / Math.sqrt(x * x + z * z);
            x *= moveFactor;
            z *= moveFactor;

            this.velocity.x = x - (x - this.velocity.x) * decayFactor;
            this.velocity.z = z - (z - this.velocity.z) * decayFactor;

            this._shield.enabled = false;
        } else {
            this.velocity.x *= decayFactor;
            this.velocity.z *= decayFactor;
        }

        this._node.position.x += this.velocity.x * deltaTime;
        this._node.position.z += this.velocity.z * deltaTime;
        ApplyWallClamp(this._node.position, this.size, limit);
    }

    public shoot(): void {
        this._shield.enabled = false;
    }

    public update(deltaTime: number, onDestroyed: (entity: Entity) => void): void {
        this._shield.update(deltaTime);

        this._health.update(deltaTime, (entity) => {
            this._node.setEnabled(false);
            onDestroyed(entity);
        });
    }

    public setUpgrades(upgrades: TankProperties): void {
        this._properties = multiply(add(BaseProperties, upgrades), this._multiplier);
        this._health.setMax(this._properties.maxHealth);
        this._health.setRegenSpeed(this._properties.healthRegen);
    }

    public reset(): void {
        this._health.reset();
        this.position.setAll(0);
        this.velocity.setAll(0);
        this._node.setEnabled(true);
        this._shield.enabled = true;
    }

    public getCollisionRepeatRate(): number {
        return 1;
    }

    public onCollide(other: Entity): void {
        if (other.type === EntityType.Bullet && (other as Bullet).owner === this) {
            return;
        }

        if (!this._shield.enabled) {
            this._health.takeDamage(other);
        }

        ApplyCollisionForce(this, other);
    }
}