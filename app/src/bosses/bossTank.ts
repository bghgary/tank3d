import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { findNode } from "../common";
import { Barrel } from "../components/barrel";
import { Entity } from "../entity";
import { angleBetween, decayScalar, TmpVector3 } from "../math";
import { BossTankMetadata } from "../metadata";
import { Player } from "../player";
import { Bullet } from "../projectiles/bullets";
import { World } from "../worlds/world";

const MAX_TANK_ANGLE = 0.5 * Math.PI;
const TARGET_RADIUS = 0.5;

export class BossTank {
    private readonly _world: World;
    private readonly _owner: Entity;
    private readonly _node: TransformNode;
    private readonly _metadata: BossTankMetadata;
    private readonly _barrels: Array<Barrel>;

    private _reloadTime = 0;

    public constructor(world: World, owner: Entity, node: TransformNode) {
        this._world = world;
        this._owner = owner;
        this._node = node;
        this._metadata = this._node.metadata;
        this._barrels = this._metadata.barrels.map((name) => new Barrel(this._world, findNode(this._node, name)));
    }

    public update(deltaTime: number, active: boolean, player: Player): void {
        for (const barrel of this._barrels) {
            barrel.update(deltaTime);
        }

        this._reloadTime = Math.max(this._reloadTime - deltaTime, 0);

        if (!active || !this._shoot(deltaTime, player)) {
            this._node.rotation.y = decayScalar(this._node.rotation.y, 0, deltaTime, 2);
        }
    }

    private _shoot(deltaTime: number, player: Player): boolean {
        const deltaPosition = TmpVector3[0].copyFrom(player.position).subtractInPlace(this._node.absolutePosition);
        const targetDistance = deltaPosition.length();
        const targetDirection = TmpVector3[1].copyFrom(deltaPosition).normalizeFromLength(targetDistance);
        const targetAngle = angleBetween(targetDirection, (this._node.parent as TransformNode).forward);
        if (Math.abs(targetAngle) >= MAX_TANK_ANGLE) {
            return false;
        }

        const angle = decayScalar(this._node.rotation.y, targetAngle, deltaTime, 20);
        this._node.rotation.y = angle;

        if (this._reloadTime === 0) {
            const maxAngle = Math.atan(TARGET_RADIUS / targetDistance);
            if (Math.abs(angle - targetAngle) < maxAngle) {
                for (const barrel of this._barrels) {
                    barrel.shootBullet(Bullet, this._owner, this._world.sources.bullet.boss, this._metadata.bullet, 3);
                }

                this._reloadTime = this._metadata.reload;
            }
        }

        return true;
    }
}
