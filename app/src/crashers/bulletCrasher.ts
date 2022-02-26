import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Barrel } from "../barrel";
import { ApplyRecoil } from "../common";
import { BulletCrasherMetadata } from "../metadata";
import { Player } from "../player";
import { World } from "../world";
import { BarrelCrasher } from "./barrelCrasher";

const CHASE_ANGLE = 0.02 * Math.PI;

export class BulletCrasher extends BarrelCrasher {
    private readonly _createBulletNode: (parent: TransformNode) => TransformNode;

    public constructor(world: World, node: TransformNode) {
        super(world, node);

        this._createBulletNode = (parent) => this._world.sources.create(this._world.sources.bullet.crasher, parent);
    }

    protected override _chase(deltaTime: number, player: Player, direction: Vector3): boolean {
        if (!super._chase(deltaTime, player, direction)) {
            return false;
        }

        this._shoot(direction);
        return true;
    }

    protected _shoot(direction: Vector3): void {
        if (this._reloadTime === 0) {
            const angle = Math.acos(Vector3.Dot(this._node.forward, direction));
            if (angle < CHASE_ANGLE) {
                for (const barrel of this._barrels) {
                    this._shootFrom(barrel);
                }
                this._reloadTime = (this._metadata as BulletCrasherMetadata).reload;
            }
        }
    }

    protected _shootFrom(barrel: Barrel): void {
        const bullet = barrel.shootBullet(this._world.bullets, this, (this._metadata as BulletCrasherMetadata).bullet, this._createBulletNode);
        ApplyRecoil(this._recoil, bullet);
    }
}
