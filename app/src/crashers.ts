import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Quaternion, TmpVectors, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Observable } from "@babylonjs/core/Misc/observable";
import { Bullets } from "./bullets";
import { Collider } from "./collisions";
import { ApplyCollisionForce, ApplyGravity, ApplyMovement, ApplyWallClamp } from "./common";
import { Drones } from "./drones";
import { Entity, EntityType } from "./entity";
import { Health } from "./health";
import { BulletCrasherMetadata, CrasherMetadata, DroneCrasherMetadata } from "./metadata";
import { Player } from "./player";
import { Shadow } from "./shadow";
import { Sources } from "./sources";
import { World } from "./world";

const DROP_HEIGHT = 5;
const IDLE_MOVEMENT_SPEED = 1;
const IDLE_ROTATION_SPEED = 1;
const CHASE_DISTANCE = 15;
const CHASE_ANGLE = 0.01 * Math.PI;
const MAX_DRONE_COUNT = 4;

export interface Crasher extends Entity {
    readonly points: number;
}

export class Crashers {
    private readonly _world: World;
    private readonly _maxCount: number;
    private readonly _root: TransformNode;
    private readonly _crashers = new Set<CrasherImpl>();
    private _spawnTime = 0;

    public constructor(world: World, maxCount: number) {
        this._world = world;
        this._maxCount = maxCount;

        this._root = new TransformNode("crashers", world.scene);

        this._world.collisions.register({
            [Symbol.iterator]: this._getCollidableEntities.bind(this)
        });
    }

    public onCrasherDestroyedObservable = new Observable<{ crasher: Crasher, other: Entity }>();

    public update(deltaTime: number, player: Player): void {
        for (const crasher of this._crashers) {
            crasher.update(deltaTime, this._world, player, (entity) => {
                this._crashers.delete(crasher);
                this.onCrasherDestroyedObservable.notifyObservers({ crasher: crasher, other: entity });
            });
        }

        if (this._crashers.size < this._maxCount) {
            this._spawnTime = Math.max(this._spawnTime - deltaTime, 0);
            if (this._spawnTime === 0) {
                this._spawnCrashers();
                this._spawnTime = Scalar.RandomRange(5, 15);
            }
        }
    }

    private _addCrasher(crasher: CrasherImpl, x: number, z: number, rotation: number): void {
        crasher.position.set(x, DROP_HEIGHT, z);
        Quaternion.RotationYawPitchRollToRef(rotation, 0, 0, crasher.rotation);
        this._crashers.add(crasher);
    }

    private _createCrasher(source: TransformNode): CrasherImpl {
        return new CrasherImpl(this._world.sources, this._world.sources.create(source, this._root));
    }

    private _createBulletCrasher(source: TransformNode): CrasherImpl {
        return new BulletCrasherImpl(this._world.sources, this._world.bullets, this._world.sources.create(source, this._root));
    }

    private _createDroneCrasher(source: TransformNode): CrasherImpl {
        const node = this._world.sources.create(source, this._root);
        const drones = new Drones(this._world, this._root, (node.metadata as DroneCrasherMetadata).drone);
        return new DroneCrasherImpl(this._world.sources, drones, node);
    }

    private _spawnCrashers(): void {
        const sources = this._world.sources;

        if (Math.random() < 0.95) {
            const create = [
                () => this._createCrasher(sources.crasher.small),
                () => this._createCrasher(sources.crasher.big),
                () => this._createBulletCrasher(sources.crasher.shooter),
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
                const crasher = create[n < 0.6 ? 0 : n < 0.9 ? 1 : 2]!();
                this._addCrasher(crasher, x + x1, z + z1, rotation + rotation1);
            }
        } else {
            const create = [
                () => this._createBulletCrasher(sources.crasher.destroyer),
                () => this._createDroneCrasher(sources.crasher.drone),
            ];

            const n = Math.random();
            const crasher = create[n < 0.5 ? 0 : 1]!();
            const limit = (this._world.size - crasher.size) * 0.5;
            const x = Scalar.RandomRange(-limit, limit);
            const z = Scalar.RandomRange(-limit, limit);
            const rotation = Scalar.RandomRange(0, Scalar.TwoPi);
            this._addCrasher(crasher, x, z, rotation);
        }
    }

    private *_getCollidableEntities(): Iterator<CrasherImpl> {
        for (const crasher of this._crashers) {
            if (crasher.position.y === 0) {
                yield crasher;
            }
        }
    }
}

class CrasherImpl implements Crasher, Collider {
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

class BulletCrasherImpl extends CrasherImpl {
    private readonly _bullets: Bullets;
    private readonly _createBulletNode: (parent: TransformNode) => TransformNode;
    private _reloadTime = 0;

    protected override get _metadata(): BulletCrasherMetadata {
        return this._node.metadata;
    }

    public constructor(sources: Sources, bullets: Bullets, node: TransformNode) {
        super(sources, node);

        this._bullets = bullets;
        this._createBulletNode = (parent) => sources.create(sources.bullet.crasher, parent);
    }

    public override update(deltaTime: number, world: World, player: Player, onDestroyed: (entity: Entity) => void): void {
        this._reloadTime = Math.max(this._reloadTime - deltaTime, 0);
        super.update(deltaTime, world, player, onDestroyed);
    }

    protected override _chase(deltaTime: number, player: Player, direction: Vector3): boolean {
        if (!super._chase(deltaTime, player, direction)) {
            return false;
        }

        if (this._reloadTime === 0) {
            const angle = Math.acos(Vector3.Dot(this._node.forward, direction));
            if (angle < CHASE_ANGLE) {
                for (const barrelMetadata of this._metadata.barrels) {
                    this._bullets.add(this, barrelMetadata, this._metadata.bullet, this._createBulletNode);
                }

                this._reloadTime = this._metadata.reload;
            }
        }

        return true;
    }
}

class DroneCrasherImpl extends CrasherImpl {
    private readonly _drones: Drones;
    private readonly _createDroneNode: (parent: TransformNode) => TransformNode;
    private _reloadTime = 0;

    protected override get _metadata(): DroneCrasherMetadata {
        return this._node.metadata;
    }

    public constructor(sources: Sources, drones: Drones, node: TransformNode) {
        super(sources, node);
        this._drones = drones;
        this._createDroneNode = (parent) => sources.create(sources.drone.crasher, parent);
    }

    public override update(deltaTime: number, world: World, player: Player, onDestroyed: (entity: Entity) => void): void {
        if (player.active) {
            this._drones.update(deltaTime, player.position, 0);
        } else {
            this._drones.update(deltaTime, this._node.position, this._metadata.size);
        }

        this._reloadTime = Math.max(this._reloadTime - deltaTime, 0);

        super.update(deltaTime, world, player, (entity) => {
            onDestroyed(entity);
            this._drones.dispose();
        });
    }

    protected override _chase(deltaTime: number, player: Player, direction: Vector3): boolean {
        if (!super._chase(deltaTime, player, direction)) {
            return false;
        }

        if (this._reloadTime === 0 && this._drones.count < MAX_DRONE_COUNT) {
            const angle = Math.acos(Vector3.Dot(this._node.forward, direction));
            if (angle < CHASE_ANGLE) {
                for (const barrelMetadata of this._metadata.barrels) {
                    this._drones.add(this, barrelMetadata, this._createDroneNode);
                }

                this._reloadTime = this._metadata.reload;
            }
        }

        return true;
    }
}