import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Collider } from "../collisions";
import { applyCollisionForce, applyGravity, applyMovement, applyWallClamp } from "../common";
import { Flash, FlashState } from "../components/flash";
import { BarHealth } from "../components/health";
import { Shadow } from "../components/shadow";
import { Crasher } from "../crashers";
import { Entity, EntityType } from "../entity";
import { decayVector3ToRef, TmpVector3 } from "../math";
import { CrasherMetadata } from "../metadata";
import { Player } from "../player";
import { World } from "../worlds/world";

const IDLE_MOVEMENT_SPEED = 1;
const IDLE_ROTATION_SPEED = 1;
const CHASE_DISTANCE = 15;

export class BaseCrasher implements Crasher, Collider {
    protected readonly _world: World;
    protected readonly _node: TransformNode;
    protected readonly _metadata: CrasherMetadata;
    protected readonly _shadow: Shadow;
    protected readonly _flash: Flash;
    protected readonly _health: BarHealth;

    public constructor(world: World, node: TransformNode) {
        this._world = world;
        this._node = node;
        this._metadata = this._node.metadata;
        this._shadow = new Shadow(this._world.sources, node);
        this._flash = new Flash(this._node);
        this._health = new BarHealth(this._world.sources, node, this._metadata.health);
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

    public update(deltaTime: number, player: Player, onDestroy: (source: Entity) => void): void {
        if (applyGravity(deltaTime, this._node.position, this.velocity)) {
            this._shadow.update();
        } else {
            applyMovement(deltaTime, this._node.position, this.velocity);
            applyWallClamp(this._node.position, this.size, this._world.size);

            const direction = TmpVector3[0];
            const speed = this._chase(deltaTime, player, direction) ? this._metadata.speed : IDLE_MOVEMENT_SPEED;
            const targetVelocity = TmpVector3[1].copyFrom(this._node.forward).scaleInPlace(speed);
            decayVector3ToRef(this.velocity, targetVelocity, deltaTime, 2, this.velocity);

            this._flash.update(deltaTime);
            if (!this._health.update(deltaTime)) {
                onDestroy(this._health.damageEntity);
                this._node.dispose();
            }
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
                applyCollisionForce(this, other);
                return 0;
            }
        } else {
            this._flash.setState(FlashState.Damage);
            this._health.takeDamage(other);
            applyCollisionForce(this, other);
        }

        return other.damage.time;
    }
}