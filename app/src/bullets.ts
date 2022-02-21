import { TmpVectors, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Collider } from "./collisions";
import { ApplyCollisionForce, ApplyMovement } from "./common";
import { Entity, EntityType } from "./entity";
import { BarrelMetadata, ProjectileMetadata } from "./metadata";
import { Shadow } from "./shadow";
import { Sources } from "./sources";
import { World } from "./world";

const MAX_DURATION = 3;

export interface Bullet extends Entity {
    readonly owner: Entity;
}

export class Bullets {
    private readonly _world: World;
    private readonly _root: TransformNode;
    private readonly _bullets = new Set<BulletImpl>();

    public constructor(world: World) {
        this._world = world;
        this._root = new TransformNode("bullets", world.scene);
        this._world.collisions.register(this._bullets);
    }

    public add(owner: Entity, barrelMetadata: Readonly<BarrelMetadata>, bulletMetadata: Readonly<ProjectileMetadata>, createNode: (parent: TransformNode) => TransformNode): Bullet {
        const size = barrelMetadata.size * 0.75;

        const forward = TmpVectors.Vector3[0];
        barrelMetadata.forward.rotateByQuaternionToRef(owner.rotation, forward);

        const position = TmpVectors.Vector3[1];
        barrelMetadata.forward.scaleToRef(barrelMetadata.length + size * 0.5, position).addInPlace(barrelMetadata.offset);
        position.rotateByQuaternionToRef(owner.rotation, position).addInPlace(owner.position);

        const initialSpeed = Math.max(Vector3.Dot(owner.velocity, forward) + bulletMetadata.speed, 0.1);

        const node = createNode(this._root);
        node.scaling.setAll(size);

        const bullet = new BulletImpl(owner, node, bulletMetadata, this._world.sources, size);
        bullet.position.copyFrom(position);
        bullet.velocity.copyFrom(forward).scaleInPlace(initialSpeed);
        bullet.targetSpeed = bulletMetadata.speed;
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

class BulletImpl implements Bullet, Collider {
    private readonly _node: TransformNode;
    private readonly _metadata: Readonly<ProjectileMetadata>;
    private readonly _shadow: Shadow;
    private _health: number;

    public constructor(owner: Entity, node: TransformNode, metadata: Readonly<ProjectileMetadata>, sources: Sources, size: number) {
        this.owner = owner;
        this._node = node;
        this._metadata = metadata;
        this._shadow = new Shadow(sources, node);
        this._health = this._metadata.health;
        this.size = size;
    }

    // Bullet
    public get displayName() { return this.owner.displayName; }
    public readonly type = EntityType.Bullet;
    public get active() { return this._node.isEnabled(); }
    public readonly size: number;
    public get mass() { return this.size * this.size; }
    public get damage() { return this._metadata.damage; }
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

    public update(deltaTime: number, onDestroy: () => void): void {
        ApplyMovement(deltaTime, this._node.position, this.velocity);

        const oldSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        if (oldSpeed > 0) {
            const decayFactor = Math.exp(-deltaTime * 2);
            const newSpeed = this.targetSpeed - (this.targetSpeed - oldSpeed) * decayFactor;
            const speedFactor = newSpeed / oldSpeed;
            this.velocity.x *= speedFactor;
            this.velocity.z *= speedFactor;
        }

        this._shadow.update();

        if (this._health <= 0) {
            onDestroy();
            this._node.dispose();
        }

        this.time += deltaTime;
        if (this.time > MAX_DURATION) {
            onDestroy();
            this._node.dispose();
        }
    }

    public onCollide(other: Entity): number {
        if (this.owner.type === other.type || (other.owner && this.owner.type === other.owner.type)) {
            return 1;
        }

        ApplyCollisionForce(this, other);
        this._health -= other.damage;
        return 0.2;
    }
}
