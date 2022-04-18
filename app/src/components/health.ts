import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Nullable } from "@babylonjs/core/types";
import { Entity } from "../entity";
import { SizeMetadata } from "../metadata";
import { Sources } from "../sources";

const REGEN_TIME = 30;
const REGEN_SPEED = 0.2;
const RESET_SPEED = 200;
const DAMAGE_SPEED = 5;
const POISON_SPEED = 5;

export class Health {
    protected _max: number;
    protected _current: number;
    protected _target: number;
    protected _damageEntity: Nullable<Entity> = null;
    protected _poisons = new Set<{ time: number, speed: number }>();

    public constructor(max: number) {
        this._max = this._current = this._target = max;
    }

    public update(deltaTime: number): boolean {
        this._applyPoisons(deltaTime);
        this._current = this._target;
        return this._current > 0;
    }

    public takeDamage(entity: Entity): void {
        this._damageEntity = entity;

        if (entity.damage.poison) {
            this._poisons.add({ time: entity.damage.value * entity.damage.poison / POISON_SPEED, speed: POISON_SPEED });
        } else {
            this._target -= entity.damage.value;
        }
    }

    public get damageEntity(): Entity {
        return this._damageEntity!;
    }

    public reset(): void {
        this._target = this._max;
        this._poisons.clear();
    }

    protected _applyPoisons(deltaTime: number): void {
        if (this._poisons.size > 0) {
            for (const poison of this._poisons) {
                this._target -= poison.speed * deltaTime;
                if ((poison.time -= deltaTime) <= 0) {
                    this._poisons.delete(poison);
                }
            }
        }
    }
}

export class BarHealth extends Health {
    private readonly _node: TransformNode;
    private _size!: number;
    private _speed = 0;
    private _regenSpeed: number;
    private _regenTime = 0;

    public constructor(sources: Sources, parent: TransformNode, max: number, regenSpeed = 0) {
        super(max);

        this._node = sources.createHealth();
        this._node.billboardMode = Mesh.BILLBOARDMODE_Y;
        this._node.setEnabled(false);

        this.setParent(parent);

        this._regenSpeed = regenSpeed;
    }

    public setParent(parent: TransformNode): void {
        const height = (parent.metadata as SizeMetadata)?.height;
        const size = (parent.metadata as SizeMetadata)?.size || 1;

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

    public override update(deltaTime: number): boolean {
        this._applyPoisons(deltaTime);

        if (this._target < this._current) {
            this._node.setEnabled(true);
            this._current = Math.max(this._current - this._speed * deltaTime, Math.max(this._target, 0));
            this._updateBar();
            if (this._current === 0) {
                this._target = this._current;
                return false;
            }
        } else if (this._target > this._current) {
            this._node.setEnabled(true);
            this._current = Math.min(this._current + this._speed * deltaTime, Math.min(this._target, this._max));
            this._updateBar();
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

        return true;
    }

    public override takeDamage(entity: Entity): void {
        super.takeDamage(entity);

        this._regenTime = REGEN_TIME;

        if (entity.damage.poison) {
            this._speed = Number.MAX_VALUE;
        } else {
            this._speed = Math.abs(this._current - this._target) * DAMAGE_SPEED;
        }
    }

    public override reset(): void {
        super.reset();
        this._speed = RESET_SPEED;
    }

    private _updateBar(): void {
        this._node.scaling.x = Math.max(this._current / this._max * this._size, 0.02);
    }
}
