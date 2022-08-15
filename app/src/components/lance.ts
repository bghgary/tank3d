import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Entity, EntityType } from "../entity";
import { decayScalar } from "../math";
import { World } from "../worlds/world";
import { Health } from "./health";
import { Weapon, WeaponProperties } from "./weapon";

export class Lance extends Weapon {
    private _health: Health;
    private _targetScale = 1;

    public constructor(world: World, owner: Entity, node: TransformNode, properties: WeaponProperties) {
        super(world, EntityType.Lance, owner, node, properties.damage)
        this._health = new Health(properties.health);
    }

    public setScale(value: number): void {
        this._targetScale = value;
    }

    public update(deltaTime: number): void {
        this._node.scaling.z = decayScalar(this._node.scaling.z, this._targetScale, deltaTime, 0.5);

        if (!this._health.update(deltaTime)) {
            this._health.reset();
            this._node.scaling.z = Math.max(this._node.scaling.z * 0.75, 0.5);
        }
    }

    protected override _takeDamage(other: Entity): void {
        this._health.takeDamage(other);
        this._node.scaling.z = Math.max(this._node.scaling.z * 0.95, 0.5);
    }
}
