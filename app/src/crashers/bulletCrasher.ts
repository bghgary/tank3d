import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { applyRecoil } from "../common";
import { Barrel } from "../components/barrel";
import { BulletCrasherMetadata } from "../metadata";
import { Player } from "../player";
import { Bullet } from "../projectiles/bullets";
import { World } from "../worlds/world";
import { BarrelCrasher } from "./barrelCrasher";

const CHASE_ANGLE = 0.02 * Math.PI;

export class BulletCrasher extends BarrelCrasher {
    public constructor(world: World, node: TransformNode) {
        super(world, node);
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
        const bullet = barrel.shootBullet(Bullet, this, this._world.sources.bullet.crasher, (this._metadata as BulletCrasherMetadata).bullet, 3);
        applyRecoil(this._recoil, bullet);
    }
}
