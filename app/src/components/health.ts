import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Nullable } from "@babylonjs/core/types";
import { Entity } from "../entity";
import { SizeMetadata } from "../metadata";
import { Sources } from "../sources";
import { Damage } from "./damage";

const REGEN_TIME = 30;
const REGEN_SPEED = 0.2;
const RESET_SPEED = 200;
const DAMAGE_SPEED = 5;

export class Health {
    private readonly _max: number;
    private _current: number;
    private _damage: Nullable<Damage> = null;
    private _damageTime = 0;
    private _damageCount = 0;

    public constructor(max: number) {
        this._max = this._current = max;
    }

    public update(deltaTime: number): boolean {
        if (this._damage && this._damageCount > 0) {
            this._damageTime -= deltaTime;
            if (this._damageTime <= 0) {
                this._current -= this._damage.value;
                this._damageTime += this._damage.time;
                --this._damageCount;
            }
        }

        return this._current > 0;
    }

    public takeDamage(entity: Entity): void {
        this._damage = entity.damage;
        this._damageTime = 0;
        this._damageCount = entity.damage.count;
    }

    public reset(): void {
        this._current = this._max;
    }
}

export class BarHealth {
    private readonly _node: TransformNode;
    private _size!: number;
    private _max: number;
    private _current: number;
    private _target: number;
    private _speed = 0;
    private _regenSpeed: number;
    private _regenTime = 0;
    private _damageEntity: Nullable<Entity> = null;
    private _damageTime = 0;
    private _damageCount = 0;

    public constructor(sources: Sources, parent: TransformNode, max: number, regenSpeed = 0) {
        this._node = sources.createHealth();
        this._node.billboardMode = Mesh.BILLBOARDMODE_Y;
        this._node.setEnabled(false);

        this.setParent(parent);

        this._max = this._current = this._target = max;
        this._regenSpeed = regenSpeed;
    }

    public setParent(parent: TransformNode): void {
        const size = (parent.metadata as SizeMetadata).size;
        const height = (parent.metadata as SizeMetadata).height;

        this._node.parent = parent;
        this._node.position.y = (height || size) * 0.9;
        this._node.scaling.x = size;

        this._size = size;
    }

    public setMax(max: number): void {
        if (max === this._max) {
            return;
        }

        const delta = max - this._max;
        this._max += delta;
        if (delta > 0) {
            this._target += delta;
            this._speed = RESET_SPEED;
        } else {
            this._current = Math.max(this._current + delta, 0);
            this._target = Math.max(this._target + delta, 0);
        }
    }

    public setRegenSpeed(regenSpeed: number): void {
        this._regenSpeed = regenSpeed;
    }

    public update(deltaTime: number, onZero: (source: Entity) => void): void {
        if (this._damageEntity && this._damageCount > 0) {
            this._damageTime -= deltaTime;
            if (this._damageTime <= 0) {
                this._target = Math.min(this._current, this._target) - this._damageEntity.damage.value;
                this._speed = (this._current - this._target) * DAMAGE_SPEED;
                this._regenTime = REGEN_TIME;
                this._damageTime += this._damageEntity.damage.time;
                --this._damageCount;
            }
        }

        if (this._target < this._current) {
            this._node.setEnabled(true);
            this._current = Math.max(this._current - this._speed * deltaTime, Math.max(this._target, 0));
            this._node.scaling.x = this._current / this._max * this._size;
            if (this._current === 0) {
                this._target = this._current;
                onZero(this._damageEntity!);
            }
        } else if (this._target > this._current) {
            this._node.setEnabled(true);
            this._current = Math.min(this._current + this._speed * deltaTime, Math.min(this._target, this._max));
            this._node.scaling.x = this._current / this._max * this._size;
            if (this._current === this._max) {
                this._target = this._current;
                this._node.setEnabled(false);
            }
        } else {
            if (this._regenTime > 0) {
                this._regenTime = Math.max(this._regenTime - deltaTime, 0);
                if (this._regenTime === 0) {
                    this._target = this._max;
                    this._speed = this._max * REGEN_SPEED;
                }
            }

            if (this._regenSpeed > 0) {
                this._target = Math.min(this._target + this._regenSpeed * deltaTime, this._max);
            }
        }
    }

    public takeDamage(entity: Entity): void {
        this._damageEntity = entity;
        this._damageTime = 0;
        this._damageCount = entity.damage.count;
    }

    public reset(): void {
        this._target = this._max;
        this._speed = RESET_SPEED;
    }
}
