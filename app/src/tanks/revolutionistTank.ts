import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { Nullable } from "@babylonjs/core/types";
import { TargetCollider } from "../collisions";
import { findNode } from "../common";
import { AutoTarget } from "../components/autoTarget";
import { Entity } from "../entity";
import { PlayerTankMetadata } from "../metadata";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

const ROTATION_SPEED = -1;
const TARGET_RADIUS = 10;

export class RevolutionistTank extends BulletTank {
    private readonly _tank: AutoTarget;
    private readonly _center: TransformNode;
    private _targetCollisionToken: Nullable<IDisposable> = null;
    private _tankReloadTime = 0;
    private _tankRotation = Math.PI / 2;

    public constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._center = findNode(this._node, "center");

        const metadata = this._node.metadata as PlayerTankMetadata;
        this._tank = new AutoTarget(findNode(this._node, metadata.tanks![0]!));
    }

    public override dispose(): void {
        if (this._targetCollisionToken) {
            this._targetCollisionToken.dispose();
            this._targetCollisionToken = null;
        }

        super.dispose();
    }

    public override shoot(): void {
        if (this._reloadTime === 0) {
            this._shootFrom(this._barrels[0]!);
            this._reloadTime = this._properties.reloadTime;
        }

        PlayerTank.prototype.shoot.call(this);
    }

    public override update(deltaTime: number, onDestroy: (entity: Entity) => void): void {
        this._tankRotation += ROTATION_SPEED * deltaTime;
        this._node.computeWorldMatrix(true); // REVIEW: why is this necessary?
        this._center.rotationQuaternion!.copyFrom(this._node.absoluteRotationQuaternion).invertInPlace();
        this._center.addRotation(0, this._tankRotation, 0);

        this._tank.update(deltaTime);
        this._tankReloadTime = Math.max(this._tankReloadTime - deltaTime, 0);
        if (this.active && this._tankReloadTime === 0 && this._tank.targetAcquired) {
            this._shootFrom(this._barrels[1]!);
            this._tankReloadTime = this._properties.reloadTime;
        }

        if (!this._targetCollisionToken) {
            this._targetCollisionToken = this._world.collisions.register([
                new TargetCollider(this._node.position, TARGET_RADIUS * 2, (other) => {
                    if (this.inBounds && other !== this && other.owner !== this) {
                        this._tank.onCollide(other);
                    }
                })
            ]);
        }

        super.update(deltaTime, onDestroy);
    }

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.revolutionist, parent);
    }
}
