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
    readonly bulletSpeed: number;
    readonly bulletDamage: number;
    readonly bulletHealth: number;
    readonly reloadTime: number;
    readonly healthRegen: number;
    readonly maxHealth: number;
    readonly moveSpeed: number;
    readonly bodyDamage: number;
}

export class Tank implements CollidableEntity {
    protected _node: TransformNode;
    protected _properties: TankProperties;
    protected _health: Health;
    protected _shadow: Shadow;

    private readonly _bullets: Bullets;
    private readonly _createBulletNode: (parent: TransformNode) => TransformNode;
    private _reloadTime = 0;

    protected get _metadata(): TankMetadata {
        return this._node.metadata;
    }

    public constructor(displayName: string, node: TransformNode, world: World, bullets: Bullets, properties: TankProperties) {
        this.displayName = displayName;

        this._node = node;
        this._properties = properties;

        this._bullets = bullets;
        this._createBulletNode = (parent) => world.sources.createPlayerTankBullet(parent);

        this._health = new Health(world.sources, this._node, this._properties.maxHealth, this._properties.healthRegen);
        this._shadow = new Shadow(world.sources, this._node);

        world.collisions.register([this]);
    }

    // Entity
    public readonly displayName: string;
    public readonly type = EntityType.Tank;
    public get size() { return this._metadata.size; }
    public readonly mass = 2;
    public get damage() { return this._properties.bodyDamage; }
    public get position() { return this._node.position; }
    public get rotation() { return this._node.rotationQuaternion!; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._node.position.x - this.size * 0.5; }
    public get y() { return this._node.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

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
            const moveFactor = this._properties.moveSpeed / Math.sqrt(x * x + z * z);
            x *= moveFactor;
            z *= moveFactor;
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
            const bulletProperties = {
                speed: this._properties.bulletSpeed,
                damage: this._properties.bulletDamage,
                health: this._properties.bulletHealth,
            };

            let knockBackX = 0, knockBackZ = 0;
            for (const barrelMetadata of this._metadata.barrels) {
                const bullet = this._bullets.add(this, barrelMetadata, this._createBulletNode, bulletProperties);

                const knockBackFactor = deltaTime * KNOCK_BACK;
                knockBackX += bullet.velocity.x * knockBackFactor;
                knockBackZ += bullet.velocity.z * knockBackFactor;
            }

            this.velocity.x -= knockBackX;
            this.velocity.z -= knockBackZ;

            this._reloadTime = this._properties.reloadTime;
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