import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { applyRecoil } from "../common";
import { Entity } from "../entity";
import { BarrelCrasherMetadata, DroneCrasherMetadata } from "../metadata";
import { Player } from "../player";
import { Drones } from "../projectiles/drones";
import { World } from "../worlds/world";
import { BarrelCrasher } from "./barrelCrasher";

const CHASE_ANGLE = 0.02 * Math.PI;
const MAX_DRONE_COUNT = 4;

export class DroneCrasher extends BarrelCrasher {
    private readonly _drones: Drones;
    private readonly _createDroneNode: (parent: TransformNode) => TransformNode;

    public constructor(world: World, node: TransformNode) {
        super(world, node);

        this._drones = new Drones(world, node.parent as TransformNode, (node.metadata as DroneCrasherMetadata).drone);
        this._createDroneNode = (parent) => this._world.sources.create(this._world.sources.drone.crasher, parent);
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
            this._drones.update(deltaTime, player.position, 0);
        } else {
            this._drones.update(deltaTime, this._node.position, this._metadata.size);
        }

        if (this._drones.count < MAX_DRONE_COUNT && this._reloadTime === 0) {
            for (const barrel of this._barrels) {
                const drone = barrel.shootDrone(this._drones, this, this._createDroneNode);
                applyRecoil(this._recoil, drone);
            }

            this._reloadTime = (this._metadata as BarrelCrasherMetadata).reload;
        }

        return chasing;
    }
}
