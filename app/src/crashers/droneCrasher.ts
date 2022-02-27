import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { ApplyRecoil } from "../common";
import { Drones } from "../drones";
import { Entity } from "../entity";
import { BarrelCrasherMetadata, DroneCrasherMetadata } from "../metadata";
import { Player } from "../player";
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
        if (player.active) {
            this._drones.update(deltaTime, player.position, 0);
        } else {
            this._drones.update(deltaTime, this._node.position, this._metadata.size);
        }

        super.update(deltaTime, player, (entity) => {
            this._drones.dispose();
            onDestroy(entity);
        });
    }

    protected override _chase(deltaTime: number, player: Player, direction: Vector3): boolean {
        if (!super._chase(deltaTime, player, direction)) {
            return false;
        }

        if (this._reloadTime === 0 && this._drones.count < MAX_DRONE_COUNT) {
            const angle = Math.acos(Vector3.Dot(this._node.forward, direction));
            if (angle < CHASE_ANGLE) {
                for (const barrel of this._barrels) {
                    const drone = barrel.shootDrone(this._drones, this, this._createDroneNode);
                    ApplyRecoil(this._recoil, drone);
                }

                this._reloadTime = (this._metadata as BarrelCrasherMetadata).reload;
            }
        }

        return true;
    }
}
