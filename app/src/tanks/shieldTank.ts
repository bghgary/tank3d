import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { findNode } from "../common";
import { Shield } from "../components/shield";
import { Entity, EntityType } from "../entity";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

export class ShieldTank extends BulletTank {
    public constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);
        this._metadata.shields!.map((name) => new Shield(world, this, findNode(this._node, name)));
    }

    public override preCollide(other: Entity): boolean {
        if (other.owner === this && other.type === EntityType.Shield) {
            return false;
        }

        return super.preCollide(other);
    }

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.shield, parent);
    }
}
