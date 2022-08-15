import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { TargetCollider } from "../colliders/targetCollider";
import { findNode, isTarget } from "../common";
import { AutoTarget } from "../components/autoTarget";
import { Entity } from "../entity";
import { PlayerTankMetadata } from "../metadata";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

const TARGET_RADIUS = 10;

export class AutoTwoTank extends BulletTank {
    private readonly _tanks: Array<AutoTarget>;
    private _barrelIndex = 0;

    public constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        const metadata = this._node.metadata as PlayerTankMetadata;
        this._tanks = metadata.tanks!.map((name) => new AutoTarget(findNode(this._node, name)));

        const targetCollider = new TargetCollider(this._node, TARGET_RADIUS, (other) => {
            if (this.inBounds && isTarget(other, this)) {
                for (const tank of this._tanks) {
                    tank.onCollide(other);
                }
            }
        });

        this._world.collisions.register(targetCollider);
    }

    public override shoot(): void {
        if (this._reloadTime === 0) {
            if (this._tanks[this._barrelIndex]!.targetAcquired) {
                this._shootFrom(this._barrels[this._barrelIndex]!);
            }
            this._barrelIndex = (this._barrelIndex + 1) % this._barrels.length;
            this._reloadTime = this._properties.reloadTime / this._barrels.length;
        }

        PlayerTank.prototype.shoot.call(this);
    }

    public override update(deltaTime: number, onDestroy: (entity: Entity) => void): void {
        for (const tank of this._tanks) {
            tank.update(deltaTime);
        }

        super.update(deltaTime, onDestroy);
    }

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.autoTwo, parent);
    }
}
