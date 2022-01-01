import { Vector3, TransformNode } from "@babylonjs/core";
import { CollidableEntity, CollisionRegisterToken } from "./collisions";
import { ApplyCollisionForce, ApplyMovement } from "./common";
import { Entity, EntityType } from "./entity";
import { Sources } from "./sources";
import { World } from "./world";

const MAX_DURATION = 3;
const BULLET_MASS = 0.3;

export interface Bullet extends Entity {
    readonly owner: Entity;
}

class Bullets {
    private readonly _root: TransformNode;
    private readonly _bullets: Array<BulletImpl>;
    private readonly _collisionRegisterToken: CollisionRegisterToken;
    private _start = 0;
    private _count = 0;

    public constructor(owner: Entity, world: World, size: number, maxCount: number, rootName: string, createBullet: (sources: Sources, name: string, parent: TransformNode) => TransformNode) {
        const scene = world.scene;
        this._root = new TransformNode(rootName, scene);

        this._bullets = new Array<BulletImpl>(maxCount);
        const padLength = (this._bullets.length - 1).toString().length;
        for (let index = 0; index < this._bullets.length; ++index) {
            const name = index.toString().padStart(padLength, "0");
            const node = createBullet(world.sources, name, this._root);
            node.scaling.setAll(size);
            node.setEnabled(false);
            this._bullets[index] = new BulletImpl(owner, node, size);
        }

        const bullets = { [Symbol.iterator]: this._getIterator.bind(this) };
        this._collisionRegisterToken = world.collisions.register(bullets);
    }

    public dispose(): void {
        this._collisionRegisterToken.dispose();
        this._root.dispose();
    }

    public add(position: Vector3, direction: Vector3, initialSpeed: number, targetSpeed: number, offset: number): void {
        const bullet = this._bullets[(this._start + this._count) % this._bullets.length];
        direction.scaleToRef(initialSpeed, bullet.velocity);
        bullet.targetSpeed = targetSpeed;
        bullet.time = 0;

        bullet.position.set(
            position.x + direction.x * offset,
            position.y + direction.y * offset,
            position.z + direction.z * offset);

        bullet.enabled = true;

        if (this._count == this._bullets.length) {
            this._start = (this._start + 1) % this._bullets.length;
        } else {
            ++this._count;
        }
    }

    public update(deltaTime: number): void {
        const bullets = { [Symbol.iterator]: this._getIterator.bind(this) };
        for (const bullet of bullets) {
            bullet.update(deltaTime);
        }

        while (this._count > 0 && !this._bullets[this._start].enabled) {
            this._start = (this._start + 1) % this._bullets.length;
            --this._count;
        }
    }

    private *_getIterator(): Iterator<BulletImpl> {
        const end = this._start + this._count;
        if (end <= this._bullets.length) {
            for (let index = this._start; index < end; ++index) {
                const bullet = this._bullets[index];
                if (bullet.enabled) {
                    yield bullet;
                }
            }
        } else {
            for (let index = this._start; index < this._bullets.length; ++index) {
                const bullet = this._bullets[index];
                if (bullet.enabled) {
                    yield bullet;
                }
            }
            for (let index = 0; index < end % this._bullets.length; ++index) {
                const bullet = this._bullets[index];
                if (bullet.enabled) {
                    yield bullet;
                }
            }
        }
    }
}

export class PlayerTankBullets extends Bullets {
    public constructor(owner: Entity, world: World, size: number, maxCount: number) {
        super(owner, world, size, maxCount, "playerTankBullets", (sources, name, parent) => {
            return sources.createPlayerTankBullet(name, parent);
        });
    }
}

export class ShooterCrasherBullets extends Bullets {
    public constructor(owner: Entity, world: World, size: number, maxCount: number) {
        super(owner, world, size, maxCount, "shooterCrasherBullets", (sources, name, parent) => {
            return sources.createShooterCrasherBullet(name, parent);
        });
    }
}

class BulletImpl implements Bullet, CollidableEntity {
    private readonly _node: TransformNode;
    private _health: number;

    public constructor(owner: Entity, node: TransformNode, size: number) {
        this.owner = owner;
        this._node = node;
        this.size = size;
        this.mass = BULLET_MASS;
        this.damage = 6; // TODO
        this._health = 10; // TODO
    }

    // Bullet
    public readonly type = EntityType.Bullet;
    public readonly size: number;
    public readonly mass: number;
    public readonly damage: number;
    public get position(): Vector3 { return this._node.position; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._node.position.x - this.size * 0.5; }
    public get y() { return this._node.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public readonly owner: Entity;

    public targetSpeed = 0;
    public time = 0;

    public get enabled(): boolean { return this._node.isEnabled(); }
    public set enabled(value: boolean) { this._node.setEnabled(value); }

    public update(deltaTime: number): void {
        if (this._node.isEnabled()) {
            ApplyMovement(deltaTime, this._node.position, this.velocity);

            const oldSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
            if (oldSpeed > 0) {
                const decayFactor = Math.exp(-deltaTime * 2);
                const newSpeed = this.targetSpeed - (this.targetSpeed - oldSpeed) * decayFactor;
                const speedFactor = newSpeed / oldSpeed;
                this.velocity.x *= speedFactor;
                this.velocity.z *= speedFactor;
            }

            this.time += deltaTime;
            if (this.time > MAX_DURATION) {
                this._node.setEnabled(false);
            }
        }
    }

    public getCollisionRepeatRate(): number {
        return 0.2;
    }

    public onCollide(other: Entity): void {
        const takeDamage = () => {
            this._health = Math.max(this._health - other.damage, 0);
            if (this._health === 0) {
                this._node.setEnabled(false);
            }
        };

        switch (other.type) {
            case EntityType.Bullet: {
                const bullet = other as Bullet;
                if (bullet.owner !== this.owner) {
                    takeDamage();
                }
                break;
            }
            case EntityType.Tank: {
                // TODO
                break;
            }
            case EntityType.Crasher: {
                if (this.owner.type !== EntityType.Crasher) {
                    ApplyCollisionForce(this, other, 5);
                    takeDamage();
                }
                break;
            }
            case EntityType.Shape: {
                ApplyCollisionForce(this, other, 5);
                takeDamage();
                break;
            }
        }
    }
}
