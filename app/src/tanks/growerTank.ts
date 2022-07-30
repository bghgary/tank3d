import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { computeMass } from "../common";
import { Trap } from "../projectiles/traps";
import { Sources } from "../sources";
import { TrapTank } from "./trapTank";

const GROW_DURATION = 2;
const GROW_SCALE = 3;

export class GrowerTank extends TrapTank {
    protected override readonly _trapSource = this._world.sources.trap.tankDodeca;
    protected override readonly _trapConstructor = GrowerTrap;

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.grower, parent);
    }
}

class GrowerTrap extends Trap {
    private _growTime = 0;

    public override update(deltaTime: number, onDestroy: () => void): void {
        this._growTime = Math.min(this._growTime + deltaTime, GROW_DURATION);
        this._node.scaling.x = this._node.scaling.z = 1 + Math.pow(this._growTime / GROW_DURATION, 2) * GROW_SCALE;
        super.update(deltaTime, onDestroy);
    }

    // Entity
    public override get mass() { return computeMass(1, 1); }
}
