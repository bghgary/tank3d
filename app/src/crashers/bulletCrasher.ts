import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Barrel } from "../barrel";
import { Bullets } from "../bullets";
import { BulletCrasherMetadata } from "../metadata";
import { Player } from "../player";
import { Sources } from "../sources";
import { BarrelCrasher } from "./barrelCrasher";

const CHASE_ANGLE = 0.02 * Math.PI;

export class BulletCrasher extends BarrelCrasher {
    private readonly _bullets: Bullets;
    private readonly _createBulletNode: (parent: TransformNode) => TransformNode;

    protected override get _metadata(): BulletCrasherMetadata {
        return this._node.metadata;
    }

    public constructor(sources: Sources, bullets: Bullets, node: TransformNode) {
        super(sources, node);

        this._bullets = bullets;
        this._createBulletNode = (parent) => sources.create(sources.bullet.crasher, parent);
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
                this._reloadTime = this._metadata.reload;
            }
        }
    }

    protected _shootFrom(barrel: Barrel): void {
        const bullet = barrel.shootBullet(this._bullets, this, this._metadata.bullet, this._createBulletNode);
        this._recoil.x += bullet.velocity.x * bullet.mass;
        this._recoil.z += bullet.velocity.z * bullet.mass;
    }
}
