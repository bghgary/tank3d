import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { findNode } from "../common";
import { Entity } from "../entity";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

const SPINNER_ROTATION_SPEED = Math.PI;

export class SpinnerTank extends BulletTank {
    private readonly _spinners: Array<TransformNode>;

    public constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._spinners = this._metadata.spinners!.map((name) => findNode(node, name));
    }


    public override update(deltaTime: number, onDestroy: (entity: Entity) => void): void {
        for (const spinner of this._spinners) {
            spinner.addRotation(0, SPINNER_ROTATION_SPEED * deltaTime, 0);
        }

        super.update(deltaTime, onDestroy);
    }

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.spinner, parent);
    }
}
