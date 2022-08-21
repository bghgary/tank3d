import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { ProximityCollider } from "../colliders/colliders";
import { applyMovement, getThreatValue, isTarget } from "../common";
import { WeaponProperties } from "../components/weapon";
import { Entity } from "../entity";
import { decayVector3ToRef, TmpVector3 } from "../math";
import { Trap } from "../projectiles/traps";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { TrapTank } from "./trapTank";

const PROXIMITY_RADIUS = 5;

export class DeceiverTank extends TrapTank {
    protected override readonly _trapSource = this._world.sources.trap.tankTri;
    protected override readonly _trapConstructor = DeceiverTrap;

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.deceiver, parent);
    }
}

class DeceiverTrap extends Trap {
    private readonly _targetPosition = new Vector3();
    private _targetThreatValue = 0;

    public constructor(world: World, owner: Entity, node: TransformNode, barrelNode: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        super(world, owner, node, barrelNode, properties, duration);

        const collider = new ProximityCollider(this._node, PROXIMITY_RADIUS,
            (entity) => isTarget(entity, this.owner),
            (entity) => {
                const distance = Vector3.Distance(this._node.position, entity.position);
                const threatValue = getThreatValue(entity, distance);
                if (threatValue > this._targetThreatValue) {
                    this._targetThreatValue = threatValue;
                    this._targetPosition.copyFrom(entity.position);
                }
            });

        world.collisions.registerProximity(collider);
    }

    public override update(deltaTime: number, onDestroy: () => void): void {
        applyMovement(deltaTime, this._node.position, this.velocity);

        if (this._targetThreatValue === 0) {
            decayVector3ToRef(this.velocity, Vector3.ZeroReadOnly, deltaTime, 2, this.velocity);
        } else {
            const direction = TmpVector3[0];
            this._targetPosition.subtractToRef(this._node.position, direction);
            const targetDistance = direction.length();
            direction.normalizeFromLength(Math.max(targetDistance, 0.01));

            const forward = this._node.forward;
            decayVector3ToRef(forward, direction, deltaTime, 10, direction);
            this._node.setDirection(direction.normalize());

            const speed = this._properties.speed * Math.min(targetDistance, 1);
            const velocityTarget = TmpVector3[2].copyFrom(forward).scaleInPlace(speed);
            decayVector3ToRef(this.velocity, velocityTarget, deltaTime, 2, this.velocity);

            this._targetThreatValue = 0;
        }

        super.update(deltaTime, onDestroy);
    }
}
