import { Observable, Scalar, TmpVectors, TransformNode, Vector3 } from "@babylonjs/core";
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
    private readonly _worldSize: number;
    private readonly _root: TransformNode;
    private readonly _crashers = new Set<CrasherImpl>();
    private _spawnTime = 0;

    public constructor(world: World) {
        this._sources = world.sources;
        this._worldSize = world.size;

        const scene = world.scene;

        this._root = new TransformNode("crashers", scene);

        this._resetSpawnTime();

        world.collisions.register({
            [Symbol.iterator]: this._getIterator.bind(this)
        });
    }

    public onCrasherDestroyedObservable = new Observable<{ crasher: Crasher, other: Entity }>();

    public update(deltaTime: number, player: Player): void {
        for (const crasher of this._crashers) {
            crasher.update(deltaTime, this._worldSize, player, (entity) => {
                this._crashers.delete(crasher);
                this.onCrasherDestroyedObservable.notifyObservers({ crasher: crasher, other: entity });
                crasher.dispose();
            });
        }

        this._spawnTime = Math.max(this._spawnTime - deltaTime, 0);
        if (this._spawnTime === 0) {
            if (this._crashers.size < MAX_COUNT) {
                this._createClump();
                this._resetSpawnTime();
            }
        }
    }

    private _resetSpawnTime(): void {
        this._spawnTime = Scalar.RandomRange(5, 15);
    }

    private _createClump(): void {
        const create = (createInstance: (name: string, parent: TransformNode) => TransformNode, x: number, z: number, rotation: number, size: number, health: number, damage: number, points: number): void => {
            const node = createInstance("crasher", this._root);
            const healthNode = this._sources.createHealth("health", node, size, 0.2);
            const crasher = new CrasherImpl(node, healthNode, size, health, damage, points);
            crasher.position.set(x, DROP_HEIGHT, z);
            crasher.rotation = rotation;
            crasher.forward.scaleToRef(CHASE_SPEED, crasher.velocity);
            this._crashers.add(crasher);
        };

        const entries = [
            { createInstance: this._sources.createSmallCrasher,   size: 0.60, health: 10, damage: 20, points: 10 },
            { createInstance: this._sources.createBigCrasher,     size: 0.80, health: 20, damage: 40, points: 25 },
            { createInstance: this._sources.createShooterCrasher, size: 0.80, health: 20, damage: 30, points: 50 },
        ];

        const clumpSize = Math.round(Scalar.RandomRange(4, 7));
        const limit = (this._worldSize - clumpSize) * 0.5;
        const x = Scalar.RandomRange(-limit, limit);
        const z = Scalar.RandomRange(-limit, limit);
        const rotation = Scalar.RandomRange(0, Scalar.TwoPi);
        for (let index = 0; index < clumpSize; ++index) {
            const x1 = Math.random() * clumpSize;
            const z1 = Math.random() * clumpSize;
            const rotation1 = Math.random() * Math.PI * 0.5;
            const n = Math.random();
            const entry = entries[n < 0.6 ? 0 : n < 0.9 ? 1 : 2];
            create(entry.createInstance.bind(this._sources), x + x1, z + z1, rotation + rotation1, entry.size, entry.health, entry.damage, entry.points);
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

    public constructor(node: TransformNode, healthNode: TransformNode, size: number, health: number, damage: number, points: number) {
        this._node = node;
        this._health = new Health(healthNode, size, health);
        this.size = size;
        this.mass = size * size;
        this.damage = damage;
        this.points = points;
    }

    public dispose(): void {
        this._node.dispose();
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

            const decayFactor = Math.exp(-deltaTime * 2);

            let speed = 0;
            const direction = TmpVectors.Vector3[0];
            player.position.subtractToRef(this.position, direction);
            if (direction.lengthSquared() < CHASE_DISTANCE * CHASE_DISTANCE) {
                direction.x = direction.x - (direction.x - this._node.forward.x) * decayFactor;
                direction.z = direction.z - (direction.z - this._node.forward.z) * decayFactor;
                this._node.setDirection(direction);
                speed = CHASE_SPEED;
            } else {
                this._node.rotation.y += IDLE_ROTATION_SPEED * deltaTime;
                speed = IDLE_MOVEMENT_SPEED;
            }

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
            this._health.damage(other);
        }

        ApplyCollisionForce(this, other);
    }
}
