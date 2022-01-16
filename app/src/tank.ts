import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Bullet, Bullets } from "./bullets";
import { CollidableEntity } from "./collisions";
import { ApplyCollisionForce, ApplyWallClamp } from "./common";
import { Entity, EntityType } from "./entity";
import { Health } from "./health";
import { Shadow } from "./shadow";
import { TankMetadata } from "./sources";
import { World } from "./world";

const KNOCK_BACK = 5;

export interface TankProperties {
    reloadTime: number;
    bulletSpeed: number;
    movementSpeed: number;
}

export class Tank implements CollidableEntity {
    private readonly _node: TransformNode;
    private readonly _metadata: TankMetadata;
    private readonly _properties: TankProperties;
    private readonly _bullets: Bullets;
    private readonly _createBulletNode: (parent: TransformNode) => TransformNode;
    private readonly _health: Health;
    private _reloadTime = 0;

    public constructor(displayName: string, node: TransformNode, properties: TankProperties, world: World, bullets: Bullets) {
        this.displayName = displayName;

        this._node = node;
        this._metadata = node.metadata;
        this._properties = properties;

        this._bullets = bullets;
        this._createBulletNode = (parent) => world.sources.createPlayerTankBullet(parent);

        this._health = new Health(world.sources, this._node, this.size, 0.4, 100);

        new Shadow(world.sources, this._node, this.size);

        world.collisions.register([this]);
    }

    // Entity
    public readonly displayName: string;
    public readonly type = EntityType.Tank;
    public get size() { return this._metadata.size; }
    public readonly mass = 2;
    public readonly damage = 30; // TODO
    public readonly collisionRepeatRate = 1;
    public get position() { return this._node.position; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._node.position.x - this.size * 0.5; }
    public get y() { return this._node.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public reset(): void {
        this._health.reset();
        this.position.setAll(0);
        this.velocity.setAll(0);
        this._node.setEnabled(true);
    }

    public lookAt(targetPoint: Vector3): void {
        this._node.lookAt(targetPoint);
    }

    public rotate(value: number): void {
        this._node.rotation.y += value;
    }

    public update(deltaTime: number, x: number, z: number, shoot: boolean, worldSize: number, onDestroyed: (entity: Entity) => void): void {
        // Movement
        const decayFactor = Math.exp(-deltaTime * 2);
        if (x !== 0 || z !== 0) {
            const movementFactor = this._properties.movementSpeed / Math.sqrt(x * x + z * z);
            x *= movementFactor;
            z *= movementFactor;
            this.velocity.x = x - (x - this.velocity.x) * decayFactor;
            this.velocity.z = z - (z - this.velocity.z) * decayFactor;
        } else {
            this.velocity.x *= decayFactor;
            this.velocity.z *= decayFactor;
        }

        // Position
        this._node.position.x += this.velocity.x * deltaTime;
        this._node.position.z += this.velocity.z * deltaTime;
        ApplyWallClamp(this._node.position, this.size, worldSize);

        // Bullets
        this._reloadTime = Math.max(this._reloadTime - deltaTime, 0);
        if (shoot && this._reloadTime === 0) {
            const bulletInitialSpeed = Vector3.Dot(this.velocity, this._node.forward) + this._properties.bulletSpeed;
            const bulletProperties = { damage: 6, health: 10 };
            this._bullets.add(this, this._createBulletNode, this._metadata, bulletProperties, this._node.position, this._node.forward, bulletInitialSpeed, this._properties.bulletSpeed);
            this._reloadTime = this._properties.reloadTime;

            const knockBackFactor = bulletInitialSpeed * deltaTime * KNOCK_BACK;
            this.velocity.x -= this._node.forward.x * knockBackFactor;
            this.velocity.z -= this._node.forward.z * knockBackFactor;
        }

        // Health
        this._health.update(deltaTime, (entity) => {
            this._node.setEnabled(false);
            onDestroyed(entity);
        });
    }

    public getCollisionRepeatRate(): number {
        return 1;
    }

    public onCollide(other: Entity): void {
        if (other.type === EntityType.Bullet && (other as Bullet).owner === this) {
            return;
        }

        this._health.takeDamage(other);
        ApplyCollisionForce(this, other);
    }
}