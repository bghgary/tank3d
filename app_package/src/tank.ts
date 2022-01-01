import { MeshBuilder, StandardMaterial, Color3, Scene, Vector3, TransformNode, Mesh } from "@babylonjs/core";
import { Bullet, Bullets } from "./bullets";
import { CollidableEntity } from "./collisions";
import { ApplyCollisionForce } from "./common";
import { Entity, EntityType } from "./entity";
import { Health } from "./health";
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
    private readonly _root: TransformNode;
    private readonly _health: Health;
    private readonly _bullets: Bullets;
    private _reloadTime = 0;

    public constructor(name: string, properties: TankProperties, world: World) {
        this._properties = properties;
        this._scene = world.scene;

        // Create parent node.
        this._root = new TransformNode(name, this._scene);

        // Create tank body.
        const bodyMesh = MeshBuilder.CreateSphere("body", { segments: 12 }, this._scene);
        bodyMesh.parent = this._root;
        bodyMesh.isPickable = false;
        bodyMesh.doNotSyncBoundingInfo = true;
        bodyMesh.alwaysSelectAsActiveMesh = true;

        // Create tank material.
        const bodyMaterial = new StandardMaterial("body", this._scene);
        bodyMaterial.diffuseColor = new Color3(0.3, 0.7, 1);
        bodyMesh.material = bodyMaterial;

        // Create tank barrel.
        const barrelMesh = MeshBuilder.CreateCylinder("barrel", { tessellation: 16, cap: Mesh.CAP_END, diameter: properties.barrelDiameter, height: properties.barrelLength }, this._scene);
        barrelMesh.parent = this._root;
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
        const healthMesh = world.sources.createHealth("health", this._root, this.size, 0.4);
        this._health = new Health(healthMesh, 1, 100);

        // Create bullets.
        const bulletDiameter = this._properties.barrelDiameter * 0.75;
        this._bullets = new Bullets(this, world, bulletDiameter);

        // Register with collisions.
        world.collisions.register([this]);
    }

    // Entity
    public readonly type = EntityType.Tank;
    public readonly size = 1;
    public readonly mass = 2;
    public readonly damage = 30; // TODO
    public readonly collisionRepeatRate = 1;
    public get position(): Vector3 { return this._root.position; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._root.position.x - this.size * 0.5; }
    public get y() { return this._root.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public lookAt(targetPoint: Vector3): void {
        this._root.lookAt(targetPoint);
    }

    public rotate(value: number): void {
        this._root.rotation.y += value;
    }

    public update(deltaTime: number, x: number, z: number, shoot: boolean, onDestroyed: (entity: Entity) => void): void {
        // Movement
        const move = x !== 0 || z !== 0;
        const decayFactor = Math.exp(-deltaTime * 2);
        if (move) {
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
        this._root.position.x += this.velocity.x * deltaTime;
        this._root.position.z += this.velocity.z * deltaTime;

        // Bullets
        this._bullets.update(deltaTime);
        this._reloadTime = Math.max(this._reloadTime - deltaTime, 0);
        if (shoot && this._reloadTime === 0) {
            const initialSpeed = Vector3.Dot(this.velocity, this._root.forward) + this._properties.bulletSpeed;
            const bulletDiameter = this._properties.barrelDiameter * 0.75;
            this._bullets.add(this._root.position, this._root.forward, initialSpeed, this._properties.bulletSpeed, this._properties.barrelLength + bulletDiameter * 0.5);
            this._reloadTime = this._properties.reloadTime;

            if (!move) {
                const knockBackFactor = initialSpeed * deltaTime * KNOCK_BACK;
                this.velocity.x -= this._root.forward.x * knockBackFactor;
                this.velocity.z -= this._root.forward.z * knockBackFactor;
            }
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