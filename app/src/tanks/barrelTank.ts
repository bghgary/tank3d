import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Barrel } from "../barrel";
import { Entity } from "../entity";
import { World } from "../worlds/world";
import { PlayerTank } from "./playerTank";

export abstract class BarrelTank extends PlayerTank {
    protected readonly _barrels: Array<Barrel>;

    protected _reloadTime = 0;
    protected _recoil = new Vector3();

    protected constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._barrels = this._metadata.barrels.map((metadata) => new Barrel(node, metadata));
    }

    public override update(deltaTime: number, onDestroy: (entity: Entity) => void): void {
        for (const barrel of this._barrels) {
            barrel.update(deltaTime);
        }

        this._reloadTime = Math.max(this._reloadTime - deltaTime, 0);

        this.velocity.subtractInPlace(this._recoil);
        this._recoil.setAll(0);

        super.update(deltaTime, onDestroy);
    }
}
