import { Nullable, Observable, Scalar, TmpVectors, TransformNode, Vector3 } from "@babylonjs/core";
import { Bullet, Bullets } from "./bullets";
import { CollidableEntity } from "./collisions";
import { ApplyCollisionForce, ApplyGravity, ApplyMovement, ApplyWallClamp } from "./common";
import { Entity, EntityType } from "./entity";
import { Health } from "./health";
import { Player } from "./player";
import { Sources } from "./sources";
import { World } from "./world";

const MAX_COUNT = 100;
const DROP_HEIGHT = 5;
const IDLE_MOVEMENT_SPEED = 1;
const IDLE_ROTATION_SPEED = 1;
const CHASE_DISTANCE = 15;
const CHASE_SPEED = 5;

export interface Crasher extends Entity {
    readonly points: number;
}

export class Crashers {
    private readonly _sources: Sources;
    private readonly _world: World;
    private readonly _root: TransformNode;
    private readonly _crashers = new Set<CrasherImpl>();
    private _spawnTime = 0;

    public constructor(world: World) {
        this._sources = world.sources;
        this._world = world;

        const scene = world.scene;

        this._root = new TransformNode("crashers", scene);

        world.collisions.register({
            [Symbol.iterator]: this._getIterator.bind(this)
        });
    }

    public onCrasherDestroyedObservable = new Observable<{ crasher: Crasher, other: Entity }>();

    public update(deltaTime: number, player: Player): void {
        for (const crasher of this._crashers) {
            crasher.update(deltaTime, this._world.size, player, (entity) => {
                this._crashers.delete(crasher);
                this.onCrasherDestroyedObservable.notifyObservers({ crasher: crasher, other: entity });
                crasher.dispose();
            });
        }

        this._spawnTime = Math.max(this._spawnTime - deltaTime, 0);
        if (this._spawnTime === 0) {
            if (this._crashers.size < MAX_COUNT) {
                this._createClump();
                this._spawnTime = Scalar.RandomRange(5, 15);
            }
        }
    }

    private _createClump(): void {
        const create = (createInstance: (name: string, parent: TransformNode) => TransformNode, x: number, z: number, rotation: number, size: number, health: number, damage: number, points: number, canShoot: boolean): void => {
            const node = createInstance("crasher", this._root);
            const healthNode = this._sources.createHealth("health", node, size, 0.2);
            const crasher = new CrasherImpl(node, healthNode, size, health, damage, points, canShoot, this._world);
            crasher.position.set(x, DROP_HEIGHT, z);
            crasher.rotation = rotation;
            crasher.forward.scaleToRef(CHASE_SPEED, crasher.velocity);
            this._crashers.add(crasher);
        };

        const entries = [
            { createInstance: this._sources.createSmallCrasher,   size: 0.60, health: 10, damage: 20, points: 10, canShoot: false },
            { createInstance: this._sources.createBigCrasher,     size: 0.80, health: 20, damage: 40, points: 25, canShoot: false },
            { createInstance: this._sources.createShooterCrasher, size: 0.80, health: 20, damage: 30, points: 50, canShoot: true  },
        ];

        const clumpSize = Math.round(Scalar.RandomRange(4, 7));
        const limit = (this._world.size - clumpSize) * 0.5;
        const x = Scalar.RandomRange(-limit, limit);
        const z = Scalar.RandomRange(-limit, limit);
        const rotation = Scalar.RandomRange(0, Scalar.TwoPi);
        for (let index = 0; index < clumpSize; ++index) {
            const x1 = Math.random() * clumpSize;
            const z1 = Math.random() * clumpSize;
            const rotation1 = Math.random() * Math.PI * 0.5;
            const n = Math.random();
            const entry = entries[n < 0.6 ? 0 : n < 0.9 ? 1 : 2];
            create(entry.createInstance.bind(this._sources), x + x1, z + z1, rotation + rotation1, entry.size, entry.health, entry.damage, entry.points, entry.canShoot);
        }
    }

    private *_getIterator(): Iterator<CrasherImpl> {
        for (const crasher of this._crashers) {
            if (crasher.position.y === 0) {
                yield crasher;
            }
        }
    }
}

class CrasherImpl implements Crasher, CollidableEntity {
    private readonly _node: TransformNode;
    private readonly _health: Health;
    private readonly _bullets: Nullable<Bullets> = null;
    private _reloadTime = 0;

    public constructor(node: TransformNode, healthNode: TransformNode, size: number, health: number, damage: number, points: number, canShoot: boolean, world: World) {
        this._node = node;
        this._health = new Health(healthNode, size, health);
        this.size = size;
        this.mass = size * size;
        this.damage = damage;
        this.points = points;

        if (canShoot) {
            this._bullets = new Bullets(this, world, 0.15);
        }
    }

    public dispose(): void {
        this._node.dispose();

        if (this._bullets) {
            this._bullets.dispose();
        }
    }

    // Entity
    public readonly type = EntityType.Crasher;
    public readonly size: number;
    public readonly mass: number;
    public readonly damage: number;
    public readonly points: number;
    public get position(): Vector3 { return this._node.position; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._node.position.x - this.size * 0.5; }
    public get y() { return this._node.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public get rotation(): number { return this._node.rotation.y; }
    public set rotation(value: number) { this._node.rotation.y = value; }

    public get forward(): Vector3 { return this._node.forward; }

    public update(deltaTime: number, worldSize: number, player: Player, onDestroyed: (entity: Entity) => void): void {
        this._health.update(deltaTime, (entity) => {
            onDestroyed(entity);
        });

        ApplyGravity(deltaTime, this._node.position, this.velocity);

        if (this._node.position.y === 0) {
            ApplyMovement(deltaTime, this._node.position, this.velocity);
            ApplyWallClamp(this._node.position, this.velocity, this.size, worldSize);

            if (this._bullets) {
                this._bullets.update(deltaTime);
            }

            let speed = 0;
            const direction = TmpVectors.Vector3[0];
            player.position.subtractToRef(this.position, direction);
            if (direction.lengthSquared() < CHASE_DISTANCE * CHASE_DISTANCE) {
                direction.normalize();
                const angle = Math.acos(Vector3.Dot(this._node.forward, direction));

                const directionDecayFactor = Math.exp(-deltaTime * 10);
                direction.x = direction.x - (direction.x - this._node.forward.x) * directionDecayFactor;
                direction.z = direction.z - (direction.z - this._node.forward.z) * directionDecayFactor;
                this._node.setDirection(direction);
                speed = CHASE_SPEED;

                if (this._bullets && angle < Math.PI * 0.1) {
                    this._reloadTime = Math.max(this._reloadTime - deltaTime, 0);
                    if (this._reloadTime === 0) {
                        const bulletSpeed = 5;
                        const initialSpeed = Vector3.Dot(this.velocity, this._node.forward) + bulletSpeed;
                        this._bullets.add(this._node.position, this._node.forward, initialSpeed, bulletSpeed, 0.625);
                        this._reloadTime = 0.5;
                    }

                }
            } else {
                this._node.rotation.y += IDLE_ROTATION_SPEED * deltaTime;
                speed = IDLE_MOVEMENT_SPEED;
            }

            const decayFactor = Math.exp(-deltaTime * 2);
            const targetVelocityX = this._node.forward.x * speed;
            const targetVelocityZ = this._node.forward.z * speed;
            this.velocity.x = targetVelocityX - (targetVelocityX - this.velocity.x) * decayFactor;
            this.velocity.z = targetVelocityZ - (targetVelocityZ - this.velocity.z) * decayFactor;
        }
    }

    public getCollisionRepeatRate(other: Entity): number {
        return (other.type === EntityType.Crasher) ? 0 : 1;
    }

    public onCollide(other: Entity): void {
        if (other.type !== EntityType.Crasher) {
            this._health.takeDamage(other);
        }

        ApplyCollisionForce(this, other);
    }
}
