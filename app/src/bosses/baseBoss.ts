import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Collidable, EntityCollider } from "../colliders/colliders";
import { applyGravity, applyMovement, applyWallClamp, computeMass } from "../common";
import { Flash, FlashState } from "../components/flash";
import { BarHealth } from "../components/health";
import { Shadow } from "../components/shadow";
import { Enemy, Entity, EntityType } from "../entity";
import { BossMetadata } from "../metadata";
import { Player } from "../player";
import { World } from "../worlds/world";

export abstract class BaseBoss implements Enemy, Collidable {
    protected readonly _world: World;
    protected readonly _node: TransformNode;
    protected readonly _metadata: BossMetadata;
    protected readonly _shadow: Shadow;
    protected readonly _flash: Flash;
    protected readonly _health: BarHealth;

    protected constructor(world: World, node: TransformNode) {
        this._world = world;
        this._node = node;
        this._metadata = this._node.metadata;
        this._shadow = new Shadow(this._world.sources, node);
        this._flash = new Flash(this._node);
        this._health = new BarHealth(this._world.sources, node, this._metadata.health);

        const collider = EntityCollider.FromMetadata(this._node, this._metadata, this);
        this._world.collisions.registerEntity(collider);
    }

    // Entity
    public get displayName() { return this._metadata.displayName; }
    public readonly type = EntityType.Boss;
    public get active() { return this._health.active && this._node.position.y === 0; }
    public get size() { return this._metadata.size; }
    public get mass() { return computeMass(1, this._metadata.size, this._metadata.height); }
    public get damage() { return this._metadata.damage; }
    public get position() { return this._node.position; }
    public get rotation() { return this._node.rotationQuaternion!; }
    public readonly velocity = new Vector3();

    // Enemy
    public get points() { return this._metadata.points; }

    public update(deltaTime: number, player: Player, onDestroy: (source: Entity) => void): void {
        if (applyGravity(deltaTime, this._node.position, this.velocity)) {
            this._shadow.update();
        } else {
            applyMovement(deltaTime, this._node.position, this.velocity);
            applyWallClamp(this._node.position, this.size, this._world.size);

            this._update(deltaTime, player);

            this._flash.update(deltaTime);
            if (!this._health.update(deltaTime)) {
                onDestroy(this._health.damageEntity);
                this._node.dispose();
            }
        }
    }

    protected abstract _update(deltaTime: number, player: Player): void;

    public preCollide(other: Entity): boolean {
        if (other.type === EntityType.Bullet && other.owner!.type === EntityType.Boss) {
            return false;
        }

        return true;
    }

    public postCollide(other: Entity): number {
        if (other.type === EntityType.Boss || (other.owner && other.owner.type === EntityType.Boss)) {
            return 0;
        }

        if (other.damage.value > 0) {
            this._flash.setState(FlashState.Damage);
            this._health.takeDamage(other);
        }

        return other.damage.time;
    }
}
