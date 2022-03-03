import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { decayVector3ToRef, TmpVector3 } from "../math";
import { Player } from "../player";
import { World } from "../worlds/world";
import { BaseBoss } from "./baseBoss";
import { BossTank } from "./bossTank";

const IDLE_ROTATION_SPEED = 0.4;
const CHASE_DISTANCE = 20;

export class KeeperBoss extends BaseBoss {
    protected readonly _tanks: Array<BossTank>;

    public constructor(world: World, node: TransformNode) {
        super(world, node);
        this._tanks = this._metadata.tanks.map((metadata) => new BossTank(this._world, this, metadata, this._node));
    }

    protected _update(deltaTime: number, player: Player): void {
        const targetVelocity = TmpVector3[0].setAll(0);
        let tanksActive = false;

        if (player.active) {
            const deltaPosition = TmpVector3[1];
            player.position.subtractToRef(this._node.position, deltaPosition);
            const distance = deltaPosition.length();
            if (distance < CHASE_DISTANCE) {
                deltaPosition.scaleToRef(this._metadata.speed / Math.max(distance, 0.01), targetVelocity);
                tanksActive = true;
            }
        }

        decayVector3ToRef(this.velocity, targetVelocity, deltaTime, 2, this.velocity);

        for (const tank of this._tanks) {
            tank.update(deltaTime, tanksActive, player);
        }

        this._node.addRotation(0, -IDLE_ROTATION_SPEED * deltaTime, 0);
    }
}
