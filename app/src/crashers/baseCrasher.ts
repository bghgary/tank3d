import { TmpVectors, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Collider } from "../collisions";
import { ApplyCollisionForce, ApplyGravity, ApplyMovement, ApplyWallClamp } from "../common";
import { Entity, EntityType } from "../entity";
import { Health } from "../health";
import { CrasherMetadata } from "../metadata";
import { Player } from "../player";
import { Shadow } from "../shadow";
import { Sources } from "../sources";
import { World } from "../world";
import { Crasher } from "../crashers";

const IDLE_MOVEMENT_SPEED = 1;
const IDLE_ROTATION_SPEED = 1;
const CHASE_DISTANCE = 15;

export class BaseCrasher implements Crasher, Collider {
    protected readonly _node: TransformNode;
    protected readonly _health: Health;
    protected readonly _shadow: Shadow;

    protected get _metadata(): Readonly<CrasherMetadata> {
        return this._node.metadata;
    }

    public constructor(sources: Sources, node: TransformNode) {
        this._node = node;
        this._health = new Health(sources, node, this._metadata.health);
        this._shadow = new Shadow(sources, node);
    }

    // Entity
    public get displayName() { return this._metadata.displayName; }
    public readonly type = EntityType.Crasher;
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

    public update(deltaTime: number, world: World, player: Player, onDestroyed: (entity: Entity) => void): void {
        if (ApplyGravity(deltaTime, this._node.position, this.velocity)) {
            return;
        }

        ApplyMovement(deltaTime, this._node.position, this.velocity);
        ApplyWallClamp(this._node.position, this.size, world.size);

        const direction = TmpVectors.Vector3[0];
        const speed = this._chase(deltaTime, player, direction) ? this._metadata.speed : IDLE_MOVEMENT_SPEED;
        const decayFactor = Math.exp(-deltaTime * 2);
        const targetVelocityX = this._node.forward.x * speed;
        const targetVelocityZ = this._node.forward.z * speed;
        this.velocity.x = targetVelocityX - (targetVelocityX - this.velocity.x) * decayFactor;
        this.velocity.z = targetVelocityZ - (targetVelocityZ - this.velocity.z) * decayFactor;

        this._shadow.update();

        this._health.update(deltaTime, (entity) => {
            onDestroyed(entity);
            this._node.dispose();
        });
    }

    protected _chase(deltaTime: number, player: Player, direction: Vector3): boolean {
        if (player.active) {
            player.position.subtractToRef(this.position, direction);
            const distanceSquared = direction.lengthSquared();
            if (distanceSquared < CHASE_DISTANCE * CHASE_DISTANCE) {
                direction.scaleInPlace(1 / Math.sqrt(distanceSquared));
                const directionDecayFactor = Math.exp(-deltaTime * 10);
                direction.x = direction.x - (direction.x - this._node.forward.x) * directionDecayFactor;
                direction.z = direction.z - (direction.z - this._node.forward.z) * directionDecayFactor;
                this._node.setDirection(direction);
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

        return 1;
    }
}