import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Boss } from "../bosses";
import { Collider } from "../collisions";
import { applyCollisionForce, applyGravity, applyMovement, applyWallClamp } from "../common";
import { Entity, EntityType } from "../entity";
import { Health } from "../components/health";
import { BossMetadata } from "../metadata";
import { Player } from "../player";
import { Shadow } from "../components/shadow";
import { World } from "../worlds/world";

export abstract class BaseBoss implements Boss, Collider {
    protected readonly _world: World;
    protected readonly _node: TransformNode;
    protected readonly _metadata: BossMetadata;
    protected readonly _health: Health;
    protected readonly _shadow: Shadow;

    protected constructor(world: World, node: TransformNode) {
        this._world = world;
        this._node = node;
        this._metadata = this._node.metadata;
        this._health = new Health(this._world.sources, node, this._metadata.health);
        this._shadow = new Shadow(this._world.sources, node);
    }

    // Entity
    public get displayName() { return this._metadata.displayName; }
    public readonly type = EntityType.Boss;
    public get active() { return this._node.position.y === 0 && this._node.isEnabled(); }
    public get size() { return this._metadata.size; }
    public get mass() { return this.size * this.size; }
    public get damage() { return this._metadata.damage; }
    public readonly damageTime = 1;
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

            this._update(deltaTime, player);

            this._shadow.update();

            this._health.update(deltaTime, (source) => {
                onDestroy(source);
                this._node.dispose();
            });
        }
    }

    protected abstract _update(deltaTime: number, player: Player): void;

    public onCollide(other: Entity): number {
        if (other.type === EntityType.Boss || (other.owner && other.owner.type === EntityType.Boss)) {
            if (other.type !== EntityType.Bullet) {
                applyCollisionForce(this, other);
                return 0;
            }
        } else {
            this._health.takeDamage(other);
            applyCollisionForce(this, other);
        }

        return other.damageTime;
    }
}
