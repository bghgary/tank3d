import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Collider } from "./colliders/collider";
import { applyGravity, computeMass, findNode } from "./common";
import { Barrel } from "./components/barrel";
import { Flash, FlashState } from "./components/flash";
import { BarHealth } from "./components/health";
import { Shadow } from "./components/shadow";
import { Enemy, Entity, EntityType } from "./entity";
import { decayScalar, decayVector3ToRef, TmpVector3 } from "./math";
import { SentryMetadata } from "./metadata";
import { Player } from "./player";
import { Bullet } from "./projectiles/bullets";
import { World } from "./worlds/world";

const SPAWN_DROP_HEIGHT = 5;
const BULLET_DURATION = 4;
const CHASE_DISTANCE = 20;
const CHASE_ANGLE = 0.02 * Math.PI;

export class Sentries {
    private readonly _world: World;
    private readonly _maxCount: number;
    private readonly _root: TransformNode;
    private readonly _sentries = new Set<Sentry>();
    private _spawnTime = 0;//Scalar.RandomRange(0, 30);

    public constructor(world: World, maxCount: number) {
        this._world = world;
        this._maxCount = maxCount;
        this._root = new TransformNode("sentries", this._world.scene);
    }

    public enabled = false;

    public update(deltaTime: number, player: Player) {
        for (const sentry of this._sentries) {
            sentry.update(deltaTime, player, (source) => {
                this._sentries.delete(sentry);
                this._world.onEnemyDestroyedObservable.notifyObservers([source, sentry]);
            });
        }

        if (this.enabled && this._sentries.size < this._maxCount) {
            this._spawnTime = Math.max(this._spawnTime - deltaTime, 0);
            if (this._spawnTime === 0) {
                this._spawn();
                this._spawnTime = Scalar.RandomRange(30, 120);
            }
        }
    }

    private _spawn(): void {
        const node = this._world.sources.create(this._world.sources.sentry, this._root);
        const sentry = new Sentry(this._world, node);

        const limit = (this._world.size - sentry.size) * 0.5;
        const x = Scalar.RandomRange(-limit, limit);
        const z = Scalar.RandomRange(-limit, limit);
        sentry.position.set(x, SPAWN_DROP_HEIGHT, z);

        this._sentries.add(sentry);
    }
}

class Sentry implements Enemy {
    private readonly _world: World;
    private readonly _node: TransformNode;
    private readonly _metadata: SentryMetadata;
    private readonly _shadow: Shadow;
    private readonly _flash: Flash;
    private readonly _health: BarHealth;
    private readonly _collider: Collider;

    private readonly _top: TransformNode;
    private readonly _bottom: TransformNode;
    private readonly _tank: TransformNode;
    private readonly _barrels: Array<Barrel>;

    private _reloadTime = 0;

    public constructor(world: World, node: TransformNode) {
        this._world = world;
        this._node = node;
        this._metadata = this._node.metadata;
        this._shadow = new Shadow(this._world.sources, this._node);
        this._flash = new Flash(this._node);
        this._health = new BarHealth(this._world.sources, this._node, this._metadata.health);

        this._collider = Collider.FromMetadata(this._node, this._metadata, this, this._onCollide.bind(this));
        this._world.collisions.register(this._collider);

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
    public get mass() { return computeMass(1, this._metadata.size, this._metadata.height); }
    public get damage() { return this._metadata.damage; }
    public get position() { return this._node.position; }
    public get rotation() { return this._node.rotationQuaternion!; }
    public readonly velocity = Vector3.ZeroReadOnly;

    // Enemy
    public get points() { return this._metadata.points; }

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

    private _shoot(direction: Vector3): void {
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

    private _shootFrom(barrel: Barrel): void {
        const source = this._world.sources.bullet.sentry;
        const properties = this._metadata.bullet;
        barrel.shootBullet(Bullet, this, source, properties, BULLET_DURATION);
    }

    private _onCollide(other: Entity): number {
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
