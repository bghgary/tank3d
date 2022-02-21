import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { Collider } from "../collisions";
import { ApplyCollisionForce, ApplyWallClamp } from "../common";
import { Entity, EntityType } from "../entity";
import { Health } from "../health";
import { TankMetadata } from "../metadata";
import { Shadow } from "../shadow";
import { Shield } from "../shield";
import { World } from "../world";

export const enum ProjectileType {
    Bullet,
    Drone,
}

export interface TankProperties {
    projectileSpeed: number;
    projectileDamage: number;
    projectileHealth: number;
    reloadTime: number;
    healthRegen: number;
    maxHealth: number;
    moveSpeed: number;
    bodyDamage: number;
}

const BaseProperties: Readonly<TankProperties> = {
    projectileSpeed: 5,
    projectileDamage: 6,
    projectileHealth: 10,
    reloadTime: 0.5,
    healthRegen: 0,
    maxHealth: 100,
    moveSpeed: 5,
    bodyDamage: 30,
};

function add(properties: Readonly<TankProperties>, value: Partial<Readonly<TankProperties>>): TankProperties {
    return {
        projectileSpeed:  properties.projectileSpeed  + (value.projectileSpeed  || 0),
        projectileDamage: properties.projectileDamage + (value.projectileDamage || 0),
        projectileHealth: properties.projectileHealth + (value.projectileHealth || 0),
        reloadTime:       properties.reloadTime       + (value.reloadTime       || 0),
        healthRegen:      properties.healthRegen      + (value.healthRegen      || 0),
        maxHealth:        properties.maxHealth        + (value.maxHealth        || 0),
        moveSpeed:        properties.moveSpeed        + (value.moveSpeed        || 0),
        bodyDamage:       properties.bodyDamage       + (value.bodyDamage       || 0),
    };
}

function multiply(properties: Readonly<TankProperties>, value: Partial<Readonly<TankProperties>>): TankProperties {
    return {
        projectileSpeed:  properties.projectileSpeed  * (value.projectileSpeed  || 1),
        projectileDamage: properties.projectileDamage * (value.projectileDamage || 1),
        projectileHealth: properties.projectileHealth * (value.projectileHealth || 1),
        reloadTime:       properties.reloadTime       * (value.reloadTime       || 1),
        healthRegen:      properties.healthRegen      * (value.healthRegen      || 1),
        maxHealth:        properties.maxHealth        * (value.maxHealth        || 1),
        moveSpeed:        properties.moveSpeed        * (value.moveSpeed        || 1),
        bodyDamage:       properties.bodyDamage       * (value.bodyDamage       || 1),
    };
}

export abstract class PlayerTank implements Entity, Collider {
    protected readonly _world: World;
    protected readonly _node: TransformNode;
    protected readonly _metadata: Readonly<TankMetadata>;
    protected readonly _shield: Shield;
    protected readonly _health: Health;
    protected readonly _shadow: Shadow;

    protected _autoShoot = false;
    protected _autoRotate = false;
    protected _autoRotateSpeed = 1;
    protected _properties: Readonly<TankProperties>;

    private readonly _collisionToken: IDisposable;

    protected constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        this._world = world;

        this._node = node;
        this._metadata = this._node.metadata;
        this._properties = multiply(BaseProperties, this._metadata.multiplier);

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

        this._collisionToken = this._world.collisions.register([this]);
    }

    public dispose(): void {
        this._node.dispose();
        this._collisionToken.dispose();
    }

    // Entity
    public get displayName() { return this._metadata.displayName; }
    public readonly type = EntityType.Tank;
    public get active() { return !this._shield.enabled && this.inBounds && this._node.isEnabled(); }
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

    public abstract readonly projectileType: ProjectileType;

    public get inBounds(): boolean {
        const limit = (this._world.size + this._metadata.size) * 0.5;
        const position = this._node.position;
        return -limit <= position.x && position.x <= limit && -limit <= position.z && position.z < limit;
    }

    public toggleAutoShoot(): void {
        this._autoShoot = !this._autoShoot;
    }

    public toggleAutoRotate(): void {
        this._autoRotate = !this._autoRotate;
    }

    public rotate(deltaTime: number): void {
        if (this._autoRotate) {
            this._node.addRotation(0, this._autoRotateSpeed * deltaTime, 0);
        } else {
            this._node.lookAt(this._world.pointerPosition);
        }
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

    public update(deltaTime: number, onDestroy: (entity: Entity) => void): void {
        if (this._autoShoot && this.inBounds) {
            this.shoot();
        }

        this._shield.update(deltaTime);

        this._health.update(deltaTime, (entity) => {
            onDestroy(entity);
            this._node.setEnabled(false);
        });
    }

    public setUpgrades(upgrades: Readonly<TankProperties>): void {
        this._properties = multiply(add(BaseProperties, upgrades), this._metadata.multiplier);
        this._health.setMax(this._properties.maxHealth);
        this._health.setRegenSpeed(this._properties.healthRegen);
    }

    public reset(): void {
        this._health.reset();
        this.position.setAll(0);
        this.velocity.setAll(0);
        this._node.setEnabled(true);
        this._shield.enabled = true;
        this._autoRotate = false;
        this._autoShoot = false;
    }

    public onCollide(other: Entity): number {
        if (this._shield.enabled || other.owner === this) {
            ApplyCollisionForce(this, other);
            return 0;
        }

        this._health.takeDamage(other);
        ApplyCollisionForce(this, other);
        return 1;
    }
}