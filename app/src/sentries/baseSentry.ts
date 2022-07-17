import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Collider } from "../collisions";
import { applyGravity, findNode } from "../common";
import { Barrel } from "../components/barrel";
import { Flash, FlashState } from "../components/flash";
import { BarHealth } from "../components/health";
import { Shadow } from "../components/shadow";
import { Entity, EntityType } from "../entity";
import { decayScalar, decayVector3ToRef, TmpVector3 } from "../math";
import { SentryMetadata } from "../metadata";
import { Player } from "../player";
import { Bullet } from "../projectiles/bullets";
import { World } from "../worlds/world";

const BULLET_DURATION = 4;
const CHASE_DISTANCE = 20;
const CHASE_ANGLE = 0.02 * Math.PI;

export class BaseSentry implements Collider {
    protected readonly _world: World;
    protected readonly _node: TransformNode;
    protected readonly _metadata: SentryMetadata;
    protected readonly _shadow: Shadow;
    protected readonly _flash: Flash;
    protected readonly _health: BarHealth;

    protected readonly _top: TransformNode;
    protected readonly _bottom: TransformNode;
    protected readonly _tank: TransformNode;
    protected readonly _barrels: Array<Barrel>;

    private _reloadTime = 0;

    public constructor(world: World, node: TransformNode) {
        this._world = world;
        this._node = node;
        this._metadata = node.metadata;
        this._shadow = new Shadow(this._world.sources, node);
        this._flash = new Flash(this._node);
        this._health = new BarHealth(this._world.sources, node, this._metadata.health);

        this._top = findNode(this._node, "top");
        this._bottom = findNode(this._node, "bottom");
        this._tank = findNode(this._node, "tank");
        this._barrels = this._metadata.barrels.map((barrel) => new Barrel(this._world, findNode(this._node, barrel)));
    }

    // Entity
    public get displayName() { return this._metadata.displayName; }
    public readonly type = EntityType.Sentry;
    public get active() { return this._health.active && this._node.position.y === 0; }
    public get size() { return this._metadata.size; }
    public get mass() { return this.size * this.size; }
    public get damage() { return this._metadata.damage; }
    public get points() { return this._metadata.points; }
    public get position() { return this._node.position; }
    public get rotation() { return this._node.rotationQuaternion!; }
    public readonly velocity = Vector3.ZeroReadOnly;

    // Quadtree.Rect
    public get x() { return this._node.position.x - this.size * 0.5; }
    public get y() { return this._node.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public update(deltaTime: number, player: Player, onDestroy: (source: Entity) => void): void {
        if (applyGravity(deltaTime, this._node.position, this.velocity)) {
            this._shadow.update();
        } else {
            for (const barrel of this._barrels) {
                barrel.update(deltaTime);
            }

            this._reloadTime = Math.max(this._reloadTime - deltaTime, 0);

            const direction = TmpVector3[0];
            if (this._chase(deltaTime, player, direction)) {
                this._shoot(direction);
            }

            this._flash.update(deltaTime);
            if (!this._health.update(deltaTime)) {
                onDestroy(this._health.damageEntity);
                this._node.dispose();
            }
        }
    }

    private _chase(deltaTime: number, player: Player, direction: Vector3): boolean {
        const openClose = (value: boolean): boolean => {
            const [decayFactor, y] = value ? [10, 0.5] : [5, 0.3];
            this._top.position.y = decayScalar(this._top.position.y, y, deltaTime, decayFactor);
            this._bottom.position.y = -this._top.position.y;
            return (this._top.position.y > y * 0.99);
        };

        if (player.active) {
            player.position.subtractToRef(this._node.position, direction);
            const distanceSquared = direction.lengthSquared();
            if (distanceSquared < CHASE_DISTANCE * CHASE_DISTANCE) {
                if (openClose(true)) {
                    direction.normalizeFromLength(Math.sqrt(distanceSquared));
                    decayVector3ToRef(this._tank.forward, direction, deltaTime, 10, direction);
                    this._tank.setDirection(direction);
                    return true;
                }

                return false;
            }
        }

        openClose(false);
        return false;
    }

    protected _shoot(direction: Vector3): void {
        if (this._reloadTime === 0) {
            const angle = Math.acos(Vector3.Dot(this._tank.forward, direction));
            if (angle < CHASE_ANGLE) {
                for (const barrel of this._barrels) {
                    this._shootFrom(barrel);
                }
                this._reloadTime = this._metadata.reload;
            }
        }
    }

    protected _shootFrom(barrel: Barrel): void {
        const source = this._world.sources.bullet.sentry;
        const properties = this._metadata.bullet;
        barrel.shootBullet(Bullet, this, source, properties, BULLET_DURATION);
    }

    public onCollide(other: Entity): number {
        if (other.type === EntityType.Sentry || (other.owner && other.owner.type === EntityType.Sentry)) {
            if (other.type !== EntityType.Bullet) {
                return 0;
            }
        } else {
            if (other.damage.value > 0) {
                this._flash.setState(FlashState.Damage);
                this._health.takeDamage(other);
            }
        }

        return other.damage.time;
    }
}
