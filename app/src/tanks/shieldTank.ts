import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { findNode } from "../common";
import { Shield } from "../components/shield";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

export class ShieldTank extends BulletTank {
    private _shields: Array<Shield>;

    public constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._shields = this._metadata.shields!.map((name) => new Shield(world, this, findNode(this._node, name)));
    }

    public override dispose(): void {
        for (const shield of this._shields) {
            shield.dispose();
        }

        super.dispose();
    }

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.shield, parent);
    }
}
