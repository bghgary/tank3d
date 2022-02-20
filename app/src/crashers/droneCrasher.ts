import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Drones } from "../drones";
import { Entity } from "../entity";
import { DroneCrasherMetadata } from "../metadata";
import { Player } from "../player";
import { Sources } from "../sources";
import { World } from "../world";
import { BarrelCrasher } from "./barrelCrasher";

const CHASE_ANGLE = 0.02 * Math.PI;
const MAX_DRONE_COUNT = 4;

export class DroneCrasher extends BarrelCrasher {
    private readonly _drones: Drones;
    private readonly _createDroneNode: (parent: TransformNode) => TransformNode;

    protected override get _metadata(): DroneCrasherMetadata {
        return this._node.metadata;
    }

    public constructor(sources: Sources, drones: Drones, node: TransformNode) {
        super(sources, node);
        this._drones = drones;
        this._createDroneNode = (parent) => sources.create(sources.drone.crasher, parent);
    }

    public override update(deltaTime: number, world: World, player: Player, onDestroyed: (entity: Entity) => void): void {
        if (player.active) {
            this._drones.update(deltaTime, player.position, 0);
        } else {
            this._drones.update(deltaTime, this._node.position, this._metadata.size);
        }

        super.update(deltaTime, world, player, (entity) => {
            onDestroyed(entity);
            this._drones.dispose();
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
                    this._recoil.x += drone.velocity.x * drone.mass;
                    this._recoil.z += drone.velocity.z * drone.mass;
                }

                this._reloadTime = this._metadata.reload;
            }
        }

        return true;
    }
}
