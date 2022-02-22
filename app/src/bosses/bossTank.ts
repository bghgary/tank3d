import { TmpVectors, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Barrel } from "../barrel";
import { Entity } from "../entity";
import { BossTankMetadata } from "../metadata";
import { Player } from "../player";
import { World } from "../world";

const MAX_TANK_ANGLE = 0.5 * Math.PI;
const SHOOT_ANGLE = 0.02 * Math.PI;

export class BossTank {
    private readonly _world: World;
    private readonly _owner: Entity;
    private readonly _metadata: BossTankMetadata;
    private readonly _node: TransformNode;
    private readonly _barrels: Array<Barrel>;
    private readonly _createBulletNode: (parent: TransformNode) => TransformNode;

    private _reloadTime = 0;

    public constructor(world: World, owner: Entity, metadata: BossTankMetadata, node: TransformNode) {
        this._world = world;
        this._owner = owner;
        this._metadata = metadata;
        this._node = node.getChildren((node) => node.name === this._metadata.nodeName, false)[0] as TransformNode;
        this._barrels = this._metadata.barrels.map((metadata) => new Barrel(this._node, metadata));

        this._createBulletNode = (parent) => this._world.sources.create(this._world.sources.bullet.boss, parent);
    }

    public update(deltaTime: number, inRange: boolean, player: Player): void {
        for (const barrel of this._barrels) {
            barrel.update(deltaTime);
        }

        this._reloadTime = Math.max(this._reloadTime - deltaTime, 0);

        if (!player.active || !inRange || !this._shoot(deltaTime, player)) {
            const rotation = this._node.rotationQuaternion!;
            const decayFactor = Math.exp(-deltaTime * 2);
            rotation.x = 0 - (0 - rotation.x) * decayFactor;
            rotation.y = 0 - (0 - rotation.y) * decayFactor;
            rotation.z = 0 - (0 - rotation.z) * decayFactor;
            rotation.w = 1 - (1 - rotation.w) * decayFactor;
            rotation.normalize();
        }
    }

    private _shoot(deltaTime: number, player: Player): boolean {
        const playerDirection = TmpVectors.Vector3[0];
        player.position.subtractToRef(this._node.absolutePosition, playerDirection).normalize();

        const parent = this._node.parent! as TransformNode;
        const tankAngle = Math.acos(Vector3.Dot(parent.forward, playerDirection));
        if (tankAngle < MAX_TANK_ANGLE) {
            const direction = TmpVectors.Vector3[1].setAll(0);
            const decayFactor = Math.exp(-deltaTime * 20);
            direction.x = playerDirection.x - (playerDirection.x - this._node.forward.x) * decayFactor;
            direction.z = playerDirection.z - (playerDirection.z - this._node.forward.z) * decayFactor;
            const invWorldMatrix = TmpVectors.Matrix[0];
            parent.getWorldMatrix().invertToRef(invWorldMatrix);
            Vector3.TransformNormalToRef(direction, invWorldMatrix, direction);
            this._node.setDirection(direction.normalize());

            const angle = Math.acos(Vector3.Dot(playerDirection, this._node.forward));
            if (this._reloadTime === 0 && angle < SHOOT_ANGLE) {
                for (const barrel of this._barrels) {
                    barrel.shootBullet(this._world.bullets, this._owner, this._metadata.bullet, this._createBulletNode);
                }

                this._reloadTime = this._metadata.reload;
            }

            return true;
        }

        return false;
    }
}

