import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { findNode } from "../common";
import { Barrel } from "../components/barrel";
import { Entity } from "../entity";
import { BarrelCrasherMetadata } from "../metadata";
import { Player } from "../player";
import { World } from "../worlds/world";
import { BaseCrasher } from "./baseCrasher";

export abstract class BarrelCrasher extends BaseCrasher {
    protected readonly _barrels: Array<Barrel>;

    protected _reloadTime = 0;
    protected _recoil = new Vector3();

    protected constructor(world: World, node: TransformNode) {
        super(world, node);

        this._barrels = (this._metadata as BarrelCrasherMetadata).barrels.map((name) => new Barrel(world, findNode(node, name)));
    }

    public override update(deltaTime: number, player: Player, onDestroy: (entity: Entity) => void): void {
        for (const barrel of this._barrels) {
            barrel.update(deltaTime);
        }

        this._reloadTime = Math.max(this._reloadTime - deltaTime, 0);

        this.velocity.subtractInPlace(this._recoil);
        this._recoil.setAll(0);

        super.update(deltaTime, player, onDestroy);
    }
}
