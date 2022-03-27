import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { findNode } from "../common";
import { Barrel } from "../components/barrel";
import { Entity } from "../entity";
import { decayQuaternionToRef, decayVector3ToRef, QuaternionIdentity, TmpMatrix, TmpVector3 } from "../math";
import { BossTankMetadata } from "../metadata";
import { Player } from "../player";
import { Bullet } from "../projectiles/bullets";
import { World } from "../worlds/world";

const MAX_TANK_ANGLE = 0.5 * Math.PI;
const SHOOT_ANGLE = 0.02 * Math.PI;

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
            const rotation = this._node.rotationQuaternion!;
            decayQuaternionToRef(rotation, QuaternionIdentity, deltaTime, 2, rotation);
            rotation.normalize();
        }
    }

    private _shoot(deltaTime: number, player: Player): boolean {
        const playerDirection = TmpVector3[0];
        player.position.subtractToRef(this._node.absolutePosition, playerDirection).normalize();

        const parent = this._node.parent! as TransformNode;
        const tankAngle = Math.acos(Vector3.Dot(parent.forward, playerDirection));
        if (tankAngle >= MAX_TANK_ANGLE) {
            return false;
        }

        const forward = this._node.forward;
        const direction = TmpVector3[1].setAll(0);
        decayVector3ToRef(forward, playerDirection, deltaTime, 20, direction);
        const invWorldMatrix = TmpMatrix[0];
        parent.getWorldMatrix().invertToRef(invWorldMatrix);
        Vector3.TransformNormalToRef(direction, invWorldMatrix, direction);
        this._node.setDirection(direction.normalize());

        const angle = Math.acos(Vector3.Dot(playerDirection, forward));
        if (this._reloadTime === 0 && angle < SHOOT_ANGLE) {
            for (const barrel of this._barrels) {
                barrel.shootBullet(Bullet, this._owner, this._world.sources.bullet.boss, this._metadata.bullet, 3);
            }

            this._reloadTime = this._metadata.reload;
        }

        return true;
    }
}
