import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Entity, EntityType } from "../entity";
import { decayScalar } from "../math";
import { World } from "../worlds/world";
import { Health } from "./health";
import { Weapon, WeaponProperties } from "./weapon";

export class Lance extends Weapon {
    private readonly _health: Health;
    private readonly _originalScale: number;
    private _decayFactor = 0.5;

    public constructor(world: World, owner: Entity, node: TransformNode, properties: WeaponProperties) {
        super(world, EntityType.Lance, owner, node, properties.damage)
        this._health = new Health(properties.health);
        this._originalScale = this._node.scaling.z;
    }

    public override get size(): number {
        const scaling = this._node.scaling;
        return super.size * Math.max(scaling.x, scaling.z);
    }

    public get currentScale(): number {
        return this._node.scaling.z * this._originalScale;
    }

    public set currentScale(value: number) {
        this._node.scaling.z = value * this._originalScale;
    }

    public targetScale = 1;

    public get decayFactor(): number {
        return this._decayFactor;
    }

    public set decayFactor(value: number) {
        this._decayFactor = value;
    }

    public update(deltaTime: number): void {
        this._node.scaling.z = decayScalar(this._node.scaling.z, this.targetScale * this._originalScale, deltaTime, this._decayFactor);

        if (!this._health.update(deltaTime)) {
            this._health.reset();
            this._node.scaling.z *= 0.75;
        }
    }

    public postCollide(other: Entity): number {
        this._node.scaling.z *= 0.95;
        this._health.takeDamage(other);
        return other.damage.time;
    }
}
