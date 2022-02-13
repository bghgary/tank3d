import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Quaternion, TmpVectors, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Observable } from "@babylonjs/core/Misc/observable";
import { Bullet, BulletProperties, Bullets } from "./bullets";
import { Collider } from "./collisions";
import { ApplyCollisionForce, ApplyGravity, ApplyMovement, ApplyWallClamp } from "./common";
import { Entity, EntityType } from "./entity";
import { Health } from "./health";
import { Player } from "./player";
import { Shadow } from "./shadow";
import { CrasherMetadata, ShooterCrasherMetadata, Sources } from "./sources";
import { World } from "./world";

const DROP_HEIGHT = 5;
const IDLE_MOVEMENT_SPEED = 1;
const IDLE_ROTATION_SPEED = 1;
const CHASE_DISTANCE = 15;
const CHASE_SPEED = 5;
const BULLET_RELOAD_TIME = 0.5;
const BULLET_SPEED = 5;
const BULLET_DAMAGE = 5;
const BULLET_HEALTH = 8;

interface CrasherProperties {
    speed: number;
    health: number;
    damage: number;
    points: number;
    bullet?: {
        reloadTime: number;
        properties: BulletProperties;
    }
}

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

    public constructor(world: World, maxCount: number) {
        this._sources = world.sources;
        this._worldSize = world.size;
        this._bullets = world.bullets;
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
                this._spawnCrashers();
                this._spawnTime = Scalar.RandomRange(5, 15);
            }
        }
    }

    private _createCrasher(node: TransformNode, x: number, z: number, rotation: number, displayName: string, properties: CrasherProperties): void {
        const crasher = new CrasherImpl(this._sources, node, displayName, properties, this._bullets);
        crasher.position.set(x, DROP_HEIGHT, z);
        Quaternion.RotationYawPitchRollToRef(rotation, 0, 0, crasher.rotation);
        this._crashers.add(crasher);
    }

    private _spawnCrashers(): void {
        const bullet = {
            reloadTime: BULLET_RELOAD_TIME,
            properties: {
                speed: BULLET_SPEED,
                damage: BULLET_DAMAGE,
                health: BULLET_HEALTH,
            },
        };

        if (Math.random() < 0.95) {
            const entries = [
                { createNode: () => this._sources.createSmallCrasher(this._root),   displayName: "Small Crasher",   properties: { speed: CHASE_SPEED, health: 10, damage: 20, points: 10                 } },
                { createNode: () => this._sources.createBigCrasher(this._root),     displayName: "Big Crasher",     properties: { speed: CHASE_SPEED, health: 20, damage: 40, points: 25                 } },
                { createNode: () => this._sources.createShooterCrasher(this._root), displayName: "Shooter Crasher", properties: { speed: CHASE_SPEED, health: 20, damage: 30, points: 50, bullet: bullet } },
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
                const entry = entries[n < 0.6 ? 0 : n < 0.9 ? 1 : 2]!;
                this._createCrasher(entry.createNode(), x + x1, z + z1, rotation + rotation1, entry.displayName, entry.properties);
            }
        } else {
            const node = this._sources.createMegaCrasher(this._root);
            const limit = (this._worldSize - 1) * 0.5;
            const x = Scalar.RandomRange(-limit, limit);
            const z = Scalar.RandomRange(-limit, limit);
            const rotation = Scalar.RandomRange(0, Scalar.TwoPi);
            this._createCrasher(node, x, z, rotation, "Mega Crasher", {
                speed: CHASE_SPEED * 0.5,
                health: 80,
                damage: 50,
                points: 100,
                bullet: {
                    reloadTime: BULLET_RELOAD_TIME * 2,
                    properties: {
                        speed: BULLET_SPEED,
                        damage: BULLET_DAMAGE * 2,
                        health: BULLET_HEALTH,
                    },
                },
            });
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
    private readonly _node: TransformNode;
    private readonly _health: Health;
    private readonly _shadow: Shadow;
    private readonly _bullets: Bullets;
    private readonly _createBulletNode: (parent: TransformNode) => TransformNode;
    private readonly _bullet?: Readonly<{ reloadTime: number; properties: BulletProperties }>;
    private _reloadTime = 0;

    private get _metadata(): CrasherMetadata {
        return this._node.metadata;
    }

    public constructor(sources: Sources, node: TransformNode, displayName: string, properties: Readonly<CrasherProperties>, bullets: Bullets) {
        this._node = node;
        this._health = new Health(sources, node, properties.health);
        this._shadow = new Shadow(sources, node);

        this.displayName = displayName;
        this.mass = this.size * this.size;
        this.damage = properties.damage;
        this.points = properties.points;

        this._bullets = bullets;
        this._createBulletNode = (parent) => sources.createCrasherBullet(parent);
        this._bullet = properties.bullet;
    }

    // Entity
    public readonly displayName: string;
    public readonly type = EntityType.Crasher;
    public get size() { return this._metadata.size; }
    public readonly mass: number;
    public readonly damage: number;
    public readonly points: number;
    public get position() { return this._node.position; }
    public get rotation() { return this._node.rotationQuaternion!; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._node.position.x - this.size * 0.5; }
    public get y() { return this._node.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public update(deltaTime: number, worldSize: number, player: Player, onDestroyed: (entity: Entity) => void): void {
        if (ApplyGravity(deltaTime, this._node.position, this.velocity)) {
            this._shadow.update();
        }

        if (this._node.position.y === 0) {
            ApplyMovement(deltaTime, this._node.position, this.velocity);
            ApplyWallClamp(this._node.position, this.size, worldSize);

            let speed = 0;
            if (!player.shielded && player.inBounds) {
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

                    if (this._bullet && angle < Math.PI * 0.1) {
                        this._reloadTime = Math.max(this._reloadTime - deltaTime, 0);
                        if (this._reloadTime === 0) {
                            for (const barrelMetadata of (this._metadata as ShooterCrasherMetadata).barrels) {
                                this._bullets.add(this, barrelMetadata, this._createBulletNode, this._bullet.properties);
                            }

                            this._reloadTime = this._bullet.reloadTime;
                        }
                    }
                }
            }

            if (speed === 0) {
                this._node.addRotation(0, IDLE_ROTATION_SPEED * deltaTime, 0);
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

    public onCollide(other: Entity): number {
        if (other.type === EntityType.Bullet && (other as Bullet).owner.type === EntityType.Crasher) {
            return 1;
        }

        if (other.type !== EntityType.Crasher) {
            this._health.takeDamage(other);
        }

        ApplyCollisionForce(this, other);

        return (other.type === EntityType.Crasher) ? 0 : 1;
    }
}
