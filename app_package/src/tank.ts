import { MeshBuilder, StandardMaterial, Color3, Scene, Vector3, TransformNode, Mesh } from "@babylonjs/core";
import { Bullet, Bullets } from "./bullets";
import { CollidableEntity } from "./collisions";
import { ApplyCollisionForce, ApplyWallClamp } from "./common";
import { Entity, EntityType } from "./entity";
import { Health } from "./health";
import { Shadow } from "./shadow";
import { World } from "./world";

const KNOCK_BACK = 5;

export interface TankProperties {
    barrelDiameter: number;
    barrelLength: number;
    reloadTime: number;
    bulletSpeed: number;
    movementSpeed: number;
}

export class Tank implements CollidableEntity {
    private readonly _properties: TankProperties;
    private readonly _scene: Scene;
    private readonly _bullets: Bullets;
    private readonly _createBulletNode: (parent: TransformNode) => TransformNode;
    private readonly _node: TransformNode;
    private readonly _health: Health;
    private _reloadTime = 0;

    public constructor(name: string, properties: TankProperties, world: World, bullets: Bullets) {
        this._properties = properties;
        this._scene = world.scene;
        this._bullets = bullets;
        this._createBulletNode = (parent) => world.sources.createPlayerTankBullet(parent);

        // Create parent node.
        this._node = new TransformNode(name, this._scene);

        // Create tank body.
        const bodyMesh = MeshBuilder.CreateSphere("body", { segments: 16 }, this._scene);
        bodyMesh.parent = this._node;
        bodyMesh.isPickable = false;
        bodyMesh.doNotSyncBoundingInfo = true;
        bodyMesh.alwaysSelectAsActiveMesh = true;

        // Create tank material.
        const bodyMaterial = new StandardMaterial("body", this._scene);
        bodyMaterial.diffuseColor = new Color3(0.3, 0.7, 1);
        bodyMesh.material = bodyMaterial;

        // Create tank barrel.
        const barrelMesh = MeshBuilder.CreateCylinder("barrel", { tessellation: 16, cap: Mesh.CAP_END, diameter: properties.barrelDiameter, height: properties.barrelLength }, this._scene);
        barrelMesh.parent = this._node;
        barrelMesh.rotation.x = Math.PI * 0.5;
        barrelMesh.position.z = properties.barrelLength * 0.5;
        barrelMesh.isPickable = false;
        barrelMesh.doNotSyncBoundingInfo = true;
        barrelMesh.alwaysSelectAsActiveMesh = true;

        // Create tank barrel material.
        const barrelMaterial = new StandardMaterial("barrel", this._scene);
        barrelMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
        barrelMesh.material = barrelMaterial;

        // Create health.
        this._health = new Health(world.sources, this._node, this.size, 0.4, 100);

        // Create shadow.
        new Shadow(world.sources, this._node, this.size);

        // Register with collisions.
        world.collisions.register([this]);
    }

    // Entity
    public readonly type = EntityType.Tank;
    public readonly size = 1;
    public readonly mass = 2;
    public readonly damage = 30; // TODO
    public readonly collisionRepeatRate = 1;
    public get position(): Vector3 { return this._node.position; }
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
            const bulletDiameter = this._properties.barrelDiameter * 0.75;
            const bulletProperties = { size: bulletDiameter, damage: 6, health: 10 };
            const bulletOffset = this._properties.barrelLength + bulletDiameter * 0.5;
            this._bullets.add(this, this._createBulletNode, bulletProperties, this._node.position, this._node.forward, bulletInitialSpeed, this._properties.bulletSpeed, bulletOffset);
            this._reloadTime = this._properties.reloadTime;

            const knockBackFactor = bulletInitialSpeed * deltaTime * KNOCK_BACK;
            this.velocity.x -= this._node.forward.x * knockBackFactor;
            this.velocity.z -= this._node.forward.z * knockBackFactor;
        }

        // Health
        this._health.update(deltaTime, onDestroyed);
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