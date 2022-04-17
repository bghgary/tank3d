import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { DeepImmutable } from "@babylonjs/core/types";
import { Collider } from "../collisions";
import { applyCollisionForce, applyMovement, applyWallClamp } from "../common";
import { Damage, DamageZero } from "../components/damage";
import { BarHealth } from "../components/health";
import { Shadow } from "../components/shadow";
import { Shield } from "../components/shield";
import { Entity, EntityType } from "../entity";
import { decayVector3ToRef, TmpVector3 } from "../math";
import { PlayerTankMetadata } from "../metadata";
import { UpgradeType } from "../ui/upgrades";
import { World } from "../worlds/world";

export interface TankProperties {
    weaponSpeed: number;
    weaponDamage: number;
    weaponHealth: number;
    reloadTime: number;
    healthRegen: number;
    maxHealth: number;
    moveSpeed: number;
    bodyDamage: number;
}

const BaseProperties: DeepImmutable<TankProperties> = {
    weaponSpeed:  5,
    weaponDamage: 6,
    weaponHealth: 10,
    reloadTime:   0.5,
    healthRegen:  0,
    maxHealth:    100,
    moveSpeed:    5,
    bodyDamage:   30,
};

const UpgradesMultiplier: DeepImmutable<TankProperties> = {
    weaponSpeed:  1,
    weaponDamage: 3,
    weaponHealth: 5,
    reloadTime:   -0.03,
    healthRegen:  1.6,
    maxHealth:    15,
    moveSpeed:    0.5,
    bodyDamage:   5,
};

function add(properties: DeepImmutable<TankProperties>, value: Partial<DeepImmutable<TankProperties>>): TankProperties {
    return {
        weaponSpeed:  properties.weaponSpeed  + (value.weaponSpeed  || 0),
        weaponDamage: properties.weaponDamage + (value.weaponDamage || 0),
        weaponHealth: properties.weaponHealth + (value.weaponHealth || 0),
        reloadTime:   properties.reloadTime   + (value.reloadTime   || 0),
        healthRegen:  properties.healthRegen  + (value.healthRegen  || 0),
        maxHealth:    properties.maxHealth    + (value.maxHealth    || 0),
        moveSpeed:    properties.moveSpeed    + (value.moveSpeed    || 0),
        bodyDamage:   properties.bodyDamage   + (value.bodyDamage   || 0),
    };
}

function multiply(properties: DeepImmutable<TankProperties>, value: Partial<DeepImmutable<TankProperties>>): TankProperties {
    return {
        weaponSpeed:  properties.weaponSpeed  * (value.weaponSpeed  || 1),
        weaponDamage: properties.weaponDamage * (value.weaponDamage || 1),
        weaponHealth: properties.weaponHealth * (value.weaponHealth || 1),
        reloadTime:   properties.reloadTime   * (value.reloadTime   || 1),
        healthRegen:  properties.healthRegen  * (value.healthRegen  || 1),
        maxHealth:    properties.maxHealth    * (value.maxHealth    || 1),
        moveSpeed:    properties.moveSpeed    * (value.moveSpeed    || 1),
        bodyDamage:   properties.bodyDamage   * (value.bodyDamage   || 1),
    };
}

export abstract class PlayerTank implements Entity, Collider {
    protected readonly _world: World;
    protected readonly _node: TransformNode;
    protected readonly _metadata: PlayerTankMetadata;
    protected readonly _shield: Shield;
    protected readonly _health: BarHealth;
    protected readonly _shadow: Shadow;

    protected _autoShoot = false;
    protected _autoRotate = false;
    protected _autoRotateSpeed = 1;
    protected _properties: TankProperties;
    protected _damage: Damage = { value: 0, time: 1 };

    private readonly _collisionToken: IDisposable;

    protected constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        this._world = world;

        this._node = node;
        this._metadata = this._node.metadata;
        this._properties = multiply(BaseProperties, this._metadata.multiplier);
        this._damage.value = this._properties.bodyDamage;

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
            this._shield = new Shield(this._world.sources, node);
            this._health = new BarHealth(this._world.sources, this._node, this._properties.maxHealth, this._properties.healthRegen);
            this._shadow = new Shadow(this._world.sources, this._node);
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
    public get damage() { return this._shield.enabled ? DamageZero : this._damage; }
    public get position() { return this._node.position; }
    public get rotation() { return this._node.rotationQuaternion!; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._node.position.x - this.size * 0.5; }
    public get y() { return this._node.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public abstract readonly upgradeNames: Map<UpgradeType, string>;
    public readonly cameraRadiusMultiplier: number = 1;
    public readonly cameraTargetOffset = Vector3.Zero();

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
        const targetVelocity = TmpVector3[0].setAll(0);
        if (x !== 0 || z !== 0) {
            const moveFactor = this._properties.moveSpeed / Math.sqrt(x * x + z * z);
            targetVelocity.set(x * moveFactor, 0, z * moveFactor);
            this._shield.enabled = false;
        }

        decayVector3ToRef(this.velocity, targetVelocity, deltaTime, 2, this.velocity);

        applyMovement(deltaTime, this._node.position, this.velocity);
        applyWallClamp(this._node.position, this.size, limit);
    }

    public shoot(): void {
        this._shield.enabled = false;
    }

    public secondary(_active: boolean): void {
    }

    public update(deltaTime: number, onDestroy: (source: Entity) => void): void {
        if (this._autoShoot && this.inBounds) {
            this.shoot();
        }

        this._shield.update(deltaTime);

        if (!this._health.update(deltaTime)) {
            onDestroy(this._health.damageEntity);
            this._node.setEnabled(false);
        }
    }

    public setUpgrades(upgrades: DeepImmutable<TankProperties>): void {
        this._properties = multiply(add(BaseProperties, multiply(upgrades, UpgradesMultiplier)), this._metadata.multiplier);
        this._damage.value = this._properties.bodyDamage;
        this._health.setMax(this._properties.maxHealth);
        this._health.setRegenSpeed(this._properties.healthRegen);
    }

    public reset(): void {
        this._health.reset();
        this._node.position.setAll(0);
        this.velocity.setAll(0);
        this._node.setEnabled(true);
        this._shield.enabled = true;
        this._autoRotate = false;
        this._autoShoot = false;
    }

    public onCollide(other: Entity): number {
        if (other.owner === this && (other.type === EntityType.Lance || other.type === EntityType.Bullet)) {
            return 0;
        }

        if (this._shield.enabled || other.owner === this) {
            applyCollisionForce(this, other);
            return 0;
        }

        this._health.takeDamage(other);
        applyCollisionForce(this, other);
        return other.damage.time;
    }
}