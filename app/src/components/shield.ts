import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { findNode } from "../common";
import { Entity, EntityType } from "../entity";
import { ShieldMetadata } from "../metadata";
import { World } from "../worlds/world";
import { WeaponCollider } from "./weapon";

export class Shield {
    private readonly _colliders: Array<WeaponCollider>;
    private readonly _collisionToken: IDisposable;

    public constructor(world: World, owner: Entity, node: TransformNode) {
        const metadata = node.metadata as ShieldMetadata;
        this._colliders = metadata.colliders.map((name) => new WeaponCollider(EntityType.Shield, owner, findNode(node, name)));
        this._collisionToken = world.collisions.register(this._colliders);
    }

    public dispose(): void {
        this._collisionToken.dispose();
    }
}
