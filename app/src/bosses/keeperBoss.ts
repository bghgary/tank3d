import { TmpVectors, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Boss } from "../bosses";
import { Collider } from "../collisions";
import { ApplyCollisionForce, ApplyGravity, ApplyMovement, ApplyWallClamp } from "../common";
import { Entity, EntityType } from "../entity";
import { Health } from "../health";
import { BossMetadata } from "../metadata";
import { Player } from "../player";
import { Shadow } from "../shadow";
import { World } from "../world";
import { BossTank } from "./bossTank";

const IDLE_ROTATION_SPEED = 0.4;
const CHASE_DISTANCE = 15;

export class KeeperBoss implements Boss, Collider {
    protected readonly _world: World;
    protected readonly _node: TransformNode;
    protected readonly _metadata: Readonly<BossMetadata>;
    protected readonly _health: Health;
    protected readonly _shadow: Shadow;
    protected readonly _tanks: Array<BossTank>;

    public constructor(world: World, node: TransformNode) {
        this._world = world;
        this._node = node;
        this._metadata = this._node.metadata;
        this._health = new Health(this._world.sources, node, this._metadata.health);
        this._shadow = new Shadow(this._world.sources, node);
        this._tanks = this._metadata.tanks.map((metadata) => new BossTank(this._world, this, metadata, this._node));

        this._node.addRotation(0, 0.1, 0);
    }

    // Entity
    public get displayName() { return this._metadata.displayName; }
    public readonly type = EntityType.Boss;
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

            if (player.active) {
                const targetVelocity = TmpVectors.Vector3[0];
                player.position.subtractToRef(this._node.position, targetVelocity);
                const distance = targetVelocity.length();
                const inRange = distance < CHASE_DISTANCE;
                const decayFactor = Math.exp(-deltaTime * 2);
                targetVelocity.scaleInPlace(inRange ? this._metadata.speed / distance : 0);
                this.velocity.x = targetVelocity.x - (targetVelocity.x - this.velocity.x) * decayFactor;
                this.velocity.z = targetVelocity.z - (targetVelocity.z - this.velocity.z) * decayFactor;

                for (const tank of this._tanks) {
                    tank.update(deltaTime, inRange, player);
                }
            }

            this._node.addRotation(0, -IDLE_ROTATION_SPEED * deltaTime, 0);

            this._shadow.update();

            this._health.update(deltaTime, (entity) => {
                onDestroy(entity);
                this._node.dispose();
            });
        }
    }

    public onCollide(other: Entity): number {
        if (other.type === EntityType.Boss || (other.owner && other.owner.type === EntityType.Boss)) {
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
