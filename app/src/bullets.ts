import { TmpVectors, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { CollidableEntity } from "./collisions";
import { ApplyCollisionForce, ApplyMovement } from "./common";
import { Entity, EntityType } from "./entity";
import { Shadow } from "./shadow";
import { BarrelMetadata, Sources } from "./sources";
import { World } from "./world";

const MAX_DURATION = 3;

export interface Bullet extends Entity {
    readonly owner: Entity;
}

export interface BulletProperties {
    readonly speed: number;
    readonly damage: number;
    readonly health: number;
}

export class Bullets {
    private readonly _root: TransformNode;
    private readonly _sources: Sources;
    private readonly _bullets = new Set<BulletImpl>();

    public constructor(world: World) {
        this._root = new TransformNode("bullets", world.scene);
        this._sources = world.sources;
        world.collisions.register(this._bullets);
    }

    public add(owner: Entity, barrelMetadata: BarrelMetadata, createNode: (parent: TransformNode) => TransformNode, properties: BulletProperties): Bullet {
        const size = barrelMetadata.size * 0.75;

        const forward = TmpVectors.Vector3[0];
        barrelMetadata.forward.rotateByQuaternionToRef(owner.rotation, forward);

        const position = TmpVectors.Vector3[1];
        barrelMetadata.forward.scaleToRef(barrelMetadata.length + size * 0.5, position).addInPlace(barrelMetadata.offset);
        position.rotateByQuaternionToRef(owner.rotation, position).addInPlace(owner.position);

        const initialSpeed = Math.max(Vector3.Dot(owner.velocity, forward) + properties.speed, 0.1);

        const node = createNode(this._root);
        node.scaling.setAll(size);

        const bullet = new BulletImpl(owner, node, this._sources, size, properties);
        bullet.position.copyFrom(position);
        bullet.velocity.copyFrom(forward).scaleInPlace(initialSpeed);
        bullet.targetSpeed = properties.speed;
        bullet.time = 0;
        this._bullets.add(bullet);

        return bullet;
    }

    public update(deltaTime: number): void {
        for (const bullet of this._bullets) {
            bullet.update(deltaTime, () => {
                this._bullets.delete(bullet);
            });
        }
    }
}

class BulletImpl implements Bullet, CollidableEntity {
    private readonly _node: TransformNode;
    private readonly _shadow: Shadow;
    private _health: number;

    public constructor(owner: Entity, node: TransformNode, sources: Sources, size: number, properties: BulletProperties) {
        this.owner = owner;
        this._node = node;
        this._shadow = new Shadow(sources, node);
        this.size = size;
        this.mass = this.size * this.size;
        this.damage = properties.damage;
        this._health = properties.health;
    }

    // Bullet
    public get displayName() { return this.owner.displayName; }
    public readonly type = EntityType.Bullet;
    public readonly size: number;
    public readonly mass: number;
    public readonly damage: number;
    public get position() { return this._node.position; }
    public get rotation() { return this._node.rotationQuaternion!; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._node.position.x - this.size * 0.5; }
    public get y() { return this._node.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public readonly owner: Entity;

    public targetSpeed = 0;
    public time = 0;

    public update(deltaTime: number, onDestroyed: () => void): void {
        this._shadow.update();

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
            this._node.dispose();
            onDestroyed();
        }

        if (this._health <= 0) {
            this._node.dispose();
            onDestroyed();
        }
    }

    public onCollide(other: Entity): number {
        switch (other.type) {
            case EntityType.Bullet: {
                const bullet = other as Bullet;
                if (bullet.owner !== this.owner) {
                    this._health -= other.damage;
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
                    this._health -= other.damage;
                }
                break;
            }
            case EntityType.Shape: {
                ApplyCollisionForce(this, other, 5);
                this._health -= other.damage;
                break;
            }
        }

        return 0.2;
    }
}
