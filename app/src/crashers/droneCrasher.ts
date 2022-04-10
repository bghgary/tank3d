import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { applyRecoil } from "../common";
import { Entity } from "../entity";
import { BarrelCrasherMetadata, DroneCrasherMetadata } from "../metadata";
import { Player } from "../player";
import { SingleTargetDrones } from "../projectiles/drones";
import { World } from "../worlds/world";
import { BarrelCrasher } from "./barrelCrasher";

const MAX_DRONE_COUNT = 4;

export class DroneCrasher extends BarrelCrasher {
    private readonly _drones: SingleTargetDrones;

    public constructor(world: World, node: TransformNode) {
        super(world, node);

        this._drones = new SingleTargetDrones(world, node.parent as TransformNode, (node.metadata as DroneCrasherMetadata).drone);
    }

    public override update(deltaTime: number, player: Player, onDestroy: (entity: Entity) => void): void {
        super.update(deltaTime, player, (entity) => {
            this._drones.dispose();
            onDestroy(entity);
        });
    }

    protected override _chase(deltaTime: number, player: Player, direction: Vector3): boolean {
        const chasing = super._chase(deltaTime, player, direction);

        if (player.active && chasing) {
            this._drones.target.copyFrom(player.position);
            this._drones.radius = 0;
        } else {
            this._drones.target.copyFrom(this._node.position);
            this._drones.radius = this._metadata.size;
        }
        this._drones.update(deltaTime);

        if (this._drones.count < MAX_DRONE_COUNT && this._reloadTime === 0) {
            for (const barrel of this._barrels) {
                const drone = barrel.shootDrone(this._drones, this, this._world.sources.drone.crasher);
                applyRecoil(this._recoil, drone);
            }

            this._reloadTime = (this._metadata as BarrelCrasherMetadata).reload;
        }

        return chasing;
    }
}
