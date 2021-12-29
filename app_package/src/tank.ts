import { MeshBuilder, StandardMaterial, Color3, Scene, Vector3, TransformNode, Mesh } from "@babylonjs/core";
import { Bullets } from "./bullets";
import { ApplyCollisionForce, CollidableEntity } from "./collisions";
import { Entity, EntityType } from "./entity";
import { Health } from "./health";
import { World } from "./world";

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
    private readonly _node: TransformNode;
    private readonly _health: Health;
    private readonly _bullets: Bullets;
    private _reloadTime = 0;

    public constructor(name: string, properties: TankProperties, world: World) {
        this._properties = properties;
        this._scene = world.scene;

        // Create parent node.
        this._node = new TransformNode(name, this._scene);

        // Create tank body.
        const bodyMesh = MeshBuilder.CreateSphere("body", { segments: 12 }, this._scene);
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
        const healthMesh = world.sources.createInstance(world.sources.health, "health", bodyMesh);
        healthMesh.position.y = this.size * 0.5 + 0.4;
        healthMesh.scaling.x = this.size;
        healthMesh.billboardMode = Mesh.BILLBOARDMODE_Y;
        healthMesh.setEnabled(false);
        this._health = new Health(healthMesh, 1, 500);

        // Create bullets.
        const bulletDiameter = this._properties.barrelDiameter * 0.75;
        this._bullets = new Bullets(world, bulletDiameter);

        // Register with collisions.
        world.collisions.register([this]);
    }

    // Entity
    public readonly type = EntityType.Tank;
    public readonly size = 1;
    public readonly mass = 5;
    public readonly damage = 15; // TODO
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

    public update(x: number, z: number, angularSpeed: number, shoot: boolean, deltaTime: number): boolean {
        const decayFactor = Math.exp(-deltaTime * 4);
        const sqrLength = x * x + z * z;
        if (sqrLength === 0) {
            this.velocity.x *= decayFactor;
            this.velocity.z *= decayFactor;
        } else {
            const movementFactor = this._properties.movementSpeed / Math.sqrt(sqrLength);
            x *= movementFactor;
            z *= movementFactor;
            this.velocity.x = x - (x - this.velocity.x) * decayFactor;
            this.velocity.z = z - (z - this.velocity.z) * decayFactor;
        }

        this._node.position.x += this.velocity.x * deltaTime;
        this._node.position.z += this.velocity.z * deltaTime;

        this._node.rotation.y += angularSpeed * deltaTime;

        this._reloadTime = Math.max(this._reloadTime - deltaTime, 0);
        if (shoot && this._reloadTime === 0) {
            const initialSpeed = Vector3.Dot(this.velocity, this._node.forward) + this._properties.bulletSpeed;
            const bulletDiameter = this._properties.barrelDiameter * 0.75;
            this._bullets.add(this._node.position, this._node.forward, initialSpeed, this._properties.bulletSpeed, this._properties.barrelLength + bulletDiameter * 0.5);
            this._reloadTime = this._properties.reloadTime;
        }

        if (!this._health.update(deltaTime)) {
            return false;
        }

        return true;
    }

    public onCollide(other: Entity): void {
        switch (other.type) {
            case EntityType.Bullet: {
                break;
            }
            case EntityType.Shape: {
                this._health.damage(other.damage);
                ApplyCollisionForce(this, other);
                break;
            }
            case EntityType.Tank: {
                // TODO
                break;
            }
        }
    }
}