import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Collider } from "../collisions";
import { ApplyCollisionForce, ApplyGravity, ApplyMovement, ApplyWallClamp } from "../common";
import { Entity, EntityType } from "../entity";
import { Health } from "../health";
import { CrasherMetadata } from "../metadata";
import { Player } from "../player";
import { Shadow } from "../shadow";
import { World } from "../world";
import { Crasher } from "../crashers";
import { decayVector3ToRef, TmpVector3 } from "../math";

const IDLE_MOVEMENT_SPEED = 1;
const IDLE_ROTATION_SPEED = 1;
const CHASE_DISTANCE = 15;

export class BaseCrasher implements Crasher, Collider {
    protected readonly _world: World;
    protected readonly _node: TransformNode;
    protected readonly _metadata: Readonly<CrasherMetadata>;
    protected readonly _health: Health;
    protected readonly _shadow: Shadow;

    public constructor(world: World, node: TransformNode) {
        this._world = world;
        this._node = node;
        this._metadata = this._node.metadata;
        this._health = new Health(this._world.sources, node, this._metadata.health);
        this._shadow = new Shadow(this._world.sources, node);
    }

    // Entity
    public get displayName() { return this._metadata.displayName; }
    public readonly type = EntityType.Crasher;
    public get active() { return this._node.position.y === 0 && this._node.isEnabled(); }
    public get size() { return this._metadata.size; }
    public get mass() { return this.size * this.size; }
    public get damage() { return this._metadata.damage; }
    public get points() { return this._metadata.points; }
    public get position() { return this._node.position; }
    public get rotation() { return this._node.rotationQuaternion!; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._node.position.x - this.size * 0.5; }
    public get y() { return this._node.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public update(deltaTime: number, player: Player, onDestroy: (entity: Entity) => void): void {
        if (ApplyGravity(deltaTime, this._node.position, this.velocity)) {
            this._shadow.update();
        } else {
            ApplyMovement(deltaTime, this._node.position, this.velocity);
            ApplyWallClamp(this._node.position, this.size, this._world.size);

            const direction = TmpVector3[0];
            const speed = this._chase(deltaTime, player, direction) ? this._metadata.speed : IDLE_MOVEMENT_SPEED;
            const targetVelocity = TmpVector3[1].copyFrom(this._node.forward).scaleInPlace(speed);
            decayVector3ToRef(this.velocity, targetVelocity, deltaTime, 2, this.velocity);

            this._shadow.update();

            this._health.update(deltaTime, (entity) => {
                onDestroy(entity);
                this._node.dispose();
            });
        }
    }

    protected _chase(deltaTime: number, player: Player, direction: Vector3): boolean {
        if (player.active) {
            player.position.subtractToRef(this._node.position, direction);
            const distanceSquared = direction.lengthSquared();
            if (distanceSquared < CHASE_DISTANCE * CHASE_DISTANCE) {
                direction.normalizeFromLength(Math.sqrt(distanceSquared));
                decayVector3ToRef(this._node.forward, direction, deltaTime, 10, direction);
                this._node.setDirection(direction.normalize());
                return true;
            }
        }

        this._node.addRotation(0, IDLE_ROTATION_SPEED * deltaTime, 0);
        return false;
    }

    public onCollide(other: Entity): number {
        if (other.type === EntityType.Crasher || (other.owner && other.owner.type === EntityType.Crasher)) {
            if (other.type !== EntityType.Bullet) {
                ApplyCollisionForce(this, other);
                return 0;
            }
        } else {
            this._health.takeDamage(other);
            ApplyCollisionForce(this, other);
        }

        return 0.5;
    }
}