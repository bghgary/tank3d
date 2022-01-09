import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { TmpVectors, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Observable } from "@babylonjs/core/Misc/observable";
import { Nullable } from "@babylonjs/core/types";
import { Bullet, Bullets } from "./bullets";
import { CollidableEntity } from "./collisions";
import { ApplyCollisionForce, ApplyGravity, ApplyMovement, ApplyWallClamp } from "./common";
import { Entity, EntityType } from "./entity";
import { Health } from "./health";
import { Player } from "./player";
import { Shadow } from "./shadow";
import { BarrelMetadata, CrasherMetadata, ShooterCrasherMetadata, Sources } from "./sources";
import { World } from "./world";

const DROP_HEIGHT = 5;
const IDLE_MOVEMENT_SPEED = 1;
const IDLE_ROTATION_SPEED = 1;
const CHASE_DISTANCE = 15;
const CHASE_SPEED = 5;

const SHOOTER_BULLET_SPEED = 5;
const SHOOTER_BULLET_RELOAD_TIME = 0.5;

export interface Crasher extends Entity {
    readonly points: number;
}

export class Crashers {
    private readonly _sources: Sources;
    private readonly _worldSize: number;
    private readonly _bullets: Bullets;
    private readonly _maxCount: number;
    private readonly _root: TransformNode;
    private readonly _crashers = new Set<CrasherImpl>();
    private _spawnTime = 0;

    public constructor(world: World, bullets: Bullets, maxCount: number) {
        this._sources = world.sources;
        this._worldSize = world.size;
        this._bullets = bullets;
        this._maxCount = maxCount;

        this._root = new TransformNode("crashers", world.scene);

        world.collisions.register({
            [Symbol.iterator]: this._getCollidableEntities.bind(this)
        });
    }

    public onCrasherDestroyedObservable = new Observable<{ crasher: Crasher, other: Entity }>();

    public update(deltaTime: number, player: Player): void {
        for (const crasher of this._crashers) {
            crasher.update(deltaTime, this._worldSize, player, (entity) => {
                this._crashers.delete(crasher);
                this.onCrasherDestroyedObservable.notifyObservers({ crasher: crasher, other: entity });
            });
        }

        if (this._crashers.size < this._maxCount) {
            this._spawnTime = Math.max(this._spawnTime - deltaTime, 0);
            if (this._spawnTime === 0) {
                this._createClump();
                this._spawnTime = Scalar.RandomRange(5, 15);
            }
        }
    }

    private _createClump(): void {
        const create = (node: TransformNode, x: number, z: number, rotation: number, displayName: string, health: number, damage: number, points: number, bullets: Nullable<Bullets>): void => {
            const crasher = new CrasherImpl(this._sources, node, displayName, health, damage, points, bullets);
            crasher.position.set(x, DROP_HEIGHT, z);
            crasher.rotation = rotation;
            crasher.forward.scaleToRef(CHASE_SPEED, crasher.velocity);
            this._crashers.add(crasher);
        };

        const entries = [
            { createNode: () => this._sources.createSmallCrasher(this._root),   displayName: "Small Crasher",   health: 10, damage: 20, points: 10, canShoot: false },
            { createNode: () => this._sources.createBigCrasher(this._root),     displayName: "Big Crasher",     health: 20, damage: 40, points: 25, canShoot: false },
            { createNode: () => this._sources.createShooterCrasher(this._root), displayName: "Shooter Crasher", health: 20, damage: 30, points: 50, canShoot: true  },
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
            const bullets = entry.canShoot ? this._bullets : null;
            create(entry.createNode(), x + x1, z + z1, rotation + rotation1, entry.displayName, entry.health, entry.damage, entry.points, bullets);
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

class CrasherImpl implements Crasher, CollidableEntity {
    private readonly _node: TransformNode;
    private readonly _metadata: CrasherMetadata;
    private readonly _health: Health;
    private readonly _shadow: Shadow;
    private readonly _bullets: Nullable<Bullets>;
    private readonly _createBulletNode: (parent: TransformNode) => TransformNode;
    private _reloadTime = 0;

    public constructor(sources: Sources, node: TransformNode, displayName: string, health: number, damage: number, points: number, bullets: Nullable<Bullets>) {
        this._node = node;
        this._metadata = node.metadata;
        this._health = new Health(sources, node, this.size, 0.2, health);
        this._shadow = new Shadow(sources, node, this.size);
        this.displayName = displayName;
        this.mass = this.size * this.size;
        this.damage = damage;
        this.points = points;
        this._bullets = bullets;
        this._createBulletNode = (parent) => sources.createShooterCrasherBullet(parent);
    }

    // Entity
    public readonly displayName: string;
    public readonly type = EntityType.Crasher;
    public get size() { return this._metadata.size; }
    public readonly mass: number;
    public readonly damage: number;
    public readonly points: number;
    public get position() { return this._node.position; }
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
        if (ApplyGravity(deltaTime, this._node.position, this.velocity)) {
            this._shadow.update();
        }

        if (this._node.position.y === 0) {
            ApplyMovement(deltaTime, this._node.position, this.velocity);
            ApplyWallClamp(this._node.position, this.size, worldSize);

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
                        const initialSpeed = Vector3.Dot(this.velocity, this._node.forward) + SHOOTER_BULLET_SPEED;
                        const barrelMetadata = this._metadata as ShooterCrasherMetadata as BarrelMetadata;
                        const bulletProperties = { damage: 6, health: 10 };
                        this._bullets.add(this, this._createBulletNode, barrelMetadata, bulletProperties, this._node.position, this._node.forward, initialSpeed, SHOOTER_BULLET_SPEED);
                        this._reloadTime = SHOOTER_BULLET_RELOAD_TIME;
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

        this._health.update(deltaTime, (entity) => {
            this._node.dispose();
            onDestroyed(entity);
        });
    }

    public getCollisionRepeatRate(other: Entity): number {
        return (other.type === EntityType.Crasher) ? 0 : 1;
    }

    public onCollide(other: Entity): void {
        if (other.type === EntityType.Bullet && (other as Bullet).owner.type === EntityType.Crasher) {
            return;
        }

        if (other.type !== EntityType.Crasher) {
            this._health.takeDamage(other);
        }

        ApplyCollisionForce(this, other);
    }
}
