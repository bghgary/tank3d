import { Nullable, TransformNode } from "@babylonjs/core";
import { Entity } from "./entity";

const REGEN_TIME = 30;
const REGEN_SPEED = 0.2;
const DAMAGE_SPEED = 5;

export class Health {
    private readonly _node: TransformNode;
    private readonly _size: number;
    private readonly _max: number;
    private _current: number;
    private _target: number;
    private _speed = 0;
    private _regenTime = 0;
    private _lastDamageEntity: Nullable<Entity> = null;

    public constructor(node: TransformNode, size: number, max: number) {
        this._node = node;
        this._size = size;
        this._max = this._current = this._target = max;
    }

    public update(deltaTime: number, onZero: (entity: Entity) => void): void {
        if (this._target < this._current) {
            this._node.setEnabled(true);
            this._current = Math.max(Math.max(this._current - this._speed * deltaTime, this._target), 0);
            this._node.scaling.x = this._current / this._max * this._size;
            if (this._current === 0) {
                this._target = this._current;
                onZero(this._lastDamageEntity!);
            }
        } else if (this._target > this._current) {
            this._node.setEnabled(true);
            this._current = Math.min(Math.min(this._current + this._speed * deltaTime, this._target), this._max);
            this._node.scaling.x = this._current / this._max * this._size;
            if (this._current === this._max) {
                this._target = this._current;
                this._node.setEnabled(false);
            }
        } else if (this._regenTime > 0) {
            this._regenTime = Math.max(this._regenTime - deltaTime, 0);
            if (this._regenTime === 0) {
                this._target = this._max;
                this._speed = this._max * REGEN_SPEED;
            }
        }
    }

    public damage(entity: Entity): void {
        this._target = Math.min(this._current, this._target) - entity.damage;
        this._speed = (this._current - this._target) * DAMAGE_SPEED;
        this._regenTime = REGEN_TIME;

        if (this._target <= 0) {
            this._lastDamageEntity = entity;
        }
    }
}
