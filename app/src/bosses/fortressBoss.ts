import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { findNode } from "../common";
import { Barrel } from "../components/barrel";
import { WeaponProperties } from "../components/weapon";
import { decayVector3ToRef, TmpVector3 } from "../math";
import { Player } from "../player";
import { SingleTargetDrone, SingleTargetDrones } from "../projectiles/drones";
import { Trap } from "../projectiles/traps";
import { World } from "../worlds/world";
import { BaseBoss } from "./baseBoss";

const IDLE_ROTATION_SPEED = 0.4;
const CHASE_DISTANCE = 20;
const TRAP_RELOAD_TIME = 1;
const DRONE_RELOAD_TIME = 0.5;
const MAX_DRONE_COUNT = 36;

export class FortressBoss extends BaseBoss {
    private readonly _trapBarrels: Array<Barrel>;
    private readonly _leftDroneBarrels: Array<Barrel>;
    private readonly _rightDroneBarrels: Array<Barrel>;
    private readonly _trapProperties: WeaponProperties;
    private readonly _drones: SingleTargetDrones;

    private _trapReloadTime = 0;
    private _droneBarrel = true; // true = left, false = right
    private _droneReloadTime = 0;

    public constructor(world: World, node: TransformNode) {
        super(world, node);

        this._trapBarrels = this._metadata.barrels!
            .filter((name) => name.startsWith("trapBarrel"))
            .map((name) => new Barrel(this._world, findNode(this._node, name)));

        this._leftDroneBarrels = this._metadata.barrels!
            .filter((name) => name.startsWith("droneBarrelL"))
            .map((name) => new Barrel(this._world, findNode(this._node, name)));

        this._rightDroneBarrels = this._metadata.barrels!
            .filter((name) => name.startsWith("droneBarrelR"))
            .map((name) => new Barrel(this._world, findNode(this._node, name)));

        this._trapProperties = this._metadata.trap as DeepImmutable<WeaponProperties>;

        const droneProperties = this._metadata.drone as DeepImmutable<WeaponProperties>;
        this._drones = new SingleTargetDrones(world, node.parent as TransformNode, droneProperties);
        this._node.onDisposeObservable.add(() => {
            this._drones.dispose();
        });
    }

    protected _update(deltaTime: number, player: Player): void {
        const velocityTarget = TmpVector3[0].setAll(0);
        let trackingPlayer = false;

        if (player.active) {
            const deltaPosition = TmpVector3[1];
            player.position.subtractToRef(this._node.position, deltaPosition);
            const distance = deltaPosition.length();
            if (distance < CHASE_DISTANCE) {
                deltaPosition.scaleToRef(this._metadata.speed / Math.max(distance, 0.01), velocityTarget);
                trackingPlayer = true;
            }
        }

        decayVector3ToRef(this.velocity, velocityTarget, deltaTime, 2, this.velocity);

        this._node.addRotation(0, -IDLE_ROTATION_SPEED * deltaTime, 0);

        const target = this._drones.target;
        if (trackingPlayer) {
            target.defendRadius = 0;
            target.position.copyFrom(player.position);
        } else {
            target.defendRadius = this._metadata.size;
            target.position.copyFrom(this._node.position);
        }
        this._drones.update(deltaTime);

        this._trapReloadTime = Math.max(this._trapReloadTime - deltaTime, 0);
        if (trackingPlayer && this._trapReloadTime === 0) {
            this._shootTraps();
            this._trapReloadTime = TRAP_RELOAD_TIME;
        }

        this._droneReloadTime = Math.max(this._droneReloadTime - deltaTime, 0);
        if (this._droneReloadTime === 0 && this._drones.count < MAX_DRONE_COUNT) {
            this._shootDrones(this._droneBarrel ? this._leftDroneBarrels : this._rightDroneBarrels);
            this._droneReloadTime = (trackingPlayer ? 1 : 2) * DRONE_RELOAD_TIME;
            this._droneBarrel = !this._droneBarrel;
        }
    }

    private _shootTraps(): void {
        for (const barrel of this._trapBarrels) {
            const source = this._world.sources.trap.bossFortress;
            barrel.shootTrap(Trap, this, source, this._trapProperties, 24);
        }
    }

    private _shootDrones(barrels: Array<Barrel>): void {
        for (const barrel of barrels) {
            if (this._drones.count < MAX_DRONE_COUNT) {
                const source = this._world.sources.drone.bossFortress;
                barrel.shootDrone(this._drones, SingleTargetDrone, this, source, Number.POSITIVE_INFINITY);
            }
        }
    }
}
