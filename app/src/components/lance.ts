import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { findNode } from "../common";
import { Entity, EntityType } from "../entity";
import { decayScalar } from "../math";
import { LanceMetadata } from "../metadata";
import { World } from "../worlds/world";
import { Health } from "./health";
import { WeaponCollider, WeaponProperties } from "./weapon";

export class Lance {
    private readonly _node: TransformNode;
    private readonly _colliders: Array<WeaponCollider>;
    private readonly _collisionToken: IDisposable;

    private _health: Health;
    private _targetScale = 1;

    public constructor(world: World, owner: Entity, node: TransformNode, properties: WeaponProperties) {
        this._node = node;
        this._health = new Health(properties.health);

        const metadata = this._node.metadata as LanceMetadata;
        this._colliders = metadata.colliders.map((name) => new WeaponCollider(
            EntityType.Lance, owner, findNode(node, name), properties.damage, this._takeDamage.bind(this)));
        this._collisionToken = world.collisions.register(this._colliders);
    }

    public dispose(): void {
        this._collisionToken.dispose();
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

    private _takeDamage(other: Entity): void {
        this._health.takeDamage(other);
        this._node.scaling.z = Math.max(this._node.scaling.z * 0.95, 0.5);
    }
}
