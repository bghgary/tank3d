import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Nullable } from "@babylonjs/core/types";
import { Entity } from "./entity";
import { Sources } from "./sources";

const REGEN_TIME = 30;
const REGEN_SPEED = 0.2;
const RESET_SPEED = 200;
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

    public constructor(sources: Sources, parent: TransformNode, size: number, offset: number, max: number) {
        this._node = sources.createHealth(parent);
        this._node.position.y = size * 0.5 + offset;
        this._node.scaling.x = size;
        this._node.billboardMode = Mesh.BILLBOARDMODE_Y;
        this._node.setEnabled(false);

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

    public takeDamage(entity: Entity): void {
        this._target = Math.min(this._current, this._target) - entity.damage;
        this._speed = (this._current - this._target) * DAMAGE_SPEED;
        this._regenTime = REGEN_TIME;

        if (this._target <= 0) {
            this._lastDamageEntity = entity;
        }
    }

    public reset(): void {
        this._target = this._max;
        this._speed = RESET_SPEED;
    }
}
