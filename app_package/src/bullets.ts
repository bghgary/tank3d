import { Vector3, TransformNode } from "@babylonjs/core";
import { CollidableEntity } from "./collisions";
import { ApplyCollisionForce, ApplyMovement } from "./common";
import { Entity, EntityType } from "./entity";
import { World } from "./world";

const MAX_DURATION = 3;
const MAX_COUNT = 100;
const BULLET_MASS = 0.3;

export interface Bullet extends Entity {
    readonly owner: Entity;
}

class BulletImpl implements Bullet, CollidableEntity {
    private readonly _root: TransformNode;
    private _health: number;

    public constructor(owner: Entity, root: TransformNode, size: number) {
        this.owner = owner;
        this._root = root;
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
    public get position(): Vector3 { return this._root.position; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._root.position.x - this.size * 0.5; }
    public get y() { return this._root.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public readonly owner: Entity;

    public targetSpeed = 0;
    public time = 0;

    public get enabled(): boolean { return this._root.isEnabled(); }
    public set enabled(value: boolean) { this._root.setEnabled(value); }

    public update(deltaTime: number): void {
        if (this._root.isEnabled()) {
            ApplyMovement(deltaTime, this._root.position, this.velocity);

            const oldSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
            const decayFactor = Math.exp(-deltaTime * 2);
            const newSpeed = this.targetSpeed - (this.targetSpeed - oldSpeed) * decayFactor;
            const speedFactor = newSpeed / oldSpeed;
            this.velocity.x *= speedFactor;
            this.velocity.z *= speedFactor;

            this.time += deltaTime;
            if (this.time > MAX_DURATION) {
                this._root.setEnabled(false);
            }
        }
    }

    public getCollisionRepeatRate(): number {
        return 0.2;
    }

    public onCollide(other: Entity): void {
        switch (other.type) {
            case EntityType.Bullet: {
                // TODO
                break;
            }
            case EntityType.Tank: {
                // TODO
                break;
            }
            case EntityType.Crasher:
            case EntityType.Shape: {
                ApplyCollisionForce(this, other, 5);
                this._health = Math.max(this._health - other.damage, 0);
                if (this._health === 0) {
                    this._root.setEnabled(false);
                }
                break;
            }
        }
    }
}

export class Bullets {
    private readonly _bullets: Array<BulletImpl>;
    private _start = 0;
    private _count = 0;

    constructor(owner: Entity, world: World, size: number) {
        const scene = world.scene;
        const root = new TransformNode("bullets", scene);

        this._bullets = new Array<BulletImpl>(MAX_COUNT);
        const padLength = (this._bullets.length - 1).toString().length;
        for (let index = 0; index < this._bullets.length; ++index) {
            const name = index.toString().padStart(padLength, "0");
            const mesh = world.sources.createBullet(name, root);
            mesh.scaling.setAll(size);
            mesh.setEnabled(false);
            this._bullets[index] = new BulletImpl(owner, mesh, size);
        }

        const bullets = { [Symbol.iterator]: this._getIterator.bind(this) };
        world.collisions.register(bullets);
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
