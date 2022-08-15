import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { TargetCollider } from "../colliders/targetCollider";
import { findNode } from "../common";
import { AutoTarget } from "../components/autoTarget";
import { Entity } from "../entity";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

const ROTATION_SPEED = -1;
const TARGET_RADIUS = 10;

export class RevolutionistTank extends BulletTank {
    private readonly _tank: AutoTarget;
    private readonly _center: TransformNode;
    private _tankReloadTime = 0;
    private _tankRotation = Math.PI / 2;

    public constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);

        this._tank = new AutoTarget(findNode(this._node, this._metadata.tanks![0]!));
        this._center = findNode(this._node, "center");

        const targetCollider = new TargetCollider(this._node, TARGET_RADIUS, (other) => {
            if (this.inBounds && other !== this && other.owner !== this) {
                this._tank.onCollide(other);
            }
        });

        this._world.collisions.register(targetCollider);
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
        if (this.inBounds && !this.idle && this._tankReloadTime === 0 && this._tank.targetAcquired) {
            this._shootFrom(this._barrels[1]!);
            this._tankReloadTime = this._properties.reloadTime;
        }

        super.update(deltaTime, onDestroy);
    }

    public static Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.revolutionist, parent);
    }
}
