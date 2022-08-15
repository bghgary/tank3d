import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { Collider } from "../colliders/collider";
import { applyCollisionForce, applyMovement, applyWallClamp, computeMass } from "../common";
import { Damage, DamageZero } from "../components/damage";
import { Flash, FlashState } from "../components/flash";
import { BarHealth } from "../components/health";
import { Shadow } from "../components/shadow";
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

export abstract class PlayerTank implements Entity {
    protected readonly _world: World;
    protected readonly _node: TransformNode;
    protected readonly _metadata: PlayerTankMetadata;
    protected readonly _shadow: Shadow;
    protected readonly _flash: Flash;
    protected readonly _health: BarHealth;

    protected _idle = true;
    protected _autoShoot = false;
    protected _autoRotate = false;
    protected _autoRotateSpeed = 1;
    protected _properties: TankProperties;
    protected _damage: Damage = { value: 0, time: 1 };

    private readonly _collider: Collider;

    protected constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        this._world = world;

        this._node = node;
        this._metadata = this._node.metadata;
        this._properties = multiply(BaseProperties, this._metadata.multiplier);
        this._damage.value = this._properties.bodyDamage;

        this._flash = new Flash(this._node);

        if (previousTank) {
            this._node.position.copyFrom(previousTank._node.position);
            this._node.rotationQuaternion!.copyFrom(previousTank._node.rotationQuaternion!);
            this._node.computeWorldMatrix();

            this._shadow = previousTank._shadow;
            this._shadow.setParent(this._node);

            this._health = previousTank._health;
            this._health.setParent(this._node);

            this._idle = previousTank._idle;
            this._flash.setState(this._idle ? FlashState.Idle : FlashState.None);

            previousTank.dispose();
        } else {
            this._shadow = new Shadow(this._world.sources, this._node);
            this._health = new BarHealth(this._world.sources, this._node, this._properties.maxHealth, this._properties.healthRegen);
            this._flash.setState(FlashState.Idle);
            this._idle = true;
        }

        this._collider = Collider.FromMetadata(this._node, this._metadata, this, this._onCollide.bind(this));
        this._world.collisions.register(this._collider);
    }

    public dispose(): void {
        this._node.dispose();
    }

    // Entity
    public get displayName() { return this._metadata.displayName; }
    public readonly type = EntityType.Tank;
    public get active() { return this._health.active; }
    public get size() { return this._metadata.size; }
    public get mass() { return computeMass(2, this._metadata.size, this._metadata.height); }
    public get damage() { return this._idle ? DamageZero : this._damage; }
    public get position() { return this._node.position; }
    public get rotation() { return this._node.rotationQuaternion!; }
    public readonly velocity = new Vector3();

    public abstract readonly upgradeNames: Map<UpgradeType, string>;
    public readonly cameraRadiusMultiplier: number = 1;
    public readonly cameraTargetOffset = Vector3.Zero();

    public get inBounds(): boolean {
        const limit = (this._world.size + this._metadata.size) * 0.5;
        const position = this._node.position;
        return -limit <= position.x && position.x <= limit && -limit <= position.z && position.z < limit;
    }

    public get idle(): boolean {
        return this._idle;
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
            this._flash.setState(FlashState.None);
            this._idle = false;
        }

        decayVector3ToRef(this.velocity, targetVelocity, deltaTime, 2, this.velocity);

        applyMovement(deltaTime, this._node.position, this.velocity);
        applyWallClamp(this._node.position, this.size, limit);
    }

    public shoot(): void {
        this._flash.setState(FlashState.None);
        this._idle = false;
    }

    public secondary(_active: boolean): void {
        // do nothing
    }

    public update(deltaTime: number, onDestroy: (source: Entity) => void): void {
        if (this._autoShoot && this.inBounds) {
            this.shoot();
        }

        this._flash.update(deltaTime);
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
        this._flash.setState(FlashState.Idle);
        this._idle = true;
        this._autoRotate = false;
        this._autoShoot = false;
    }

    private _onCollide(other: Entity): number {
        if (other.owner === this && (other.type === EntityType.Bullet || other.type === EntityType.Lance || other.type === EntityType.Shield)) {
            return 0;
        }

        if (this._idle || other.owner === this) {
            applyCollisionForce(this, other);
            return 0;
        }

        if (other.damage.value > 0) {
            this._flash.setState(FlashState.Damage);
            this._health.takeDamage(other);
        }

        applyCollisionForce(this, other);
        return other.damage.time;
    }
}