import { MeshBuilder, StandardMaterial, Color3, Scene, Vector3, TransformNode, Mesh } from "@babylonjs/core";
import { Bullets } from "./bullets";

export interface TankProperties {
    barrelDiameter: number;
    barrelLength: number;
    reloadSpeed: number;
    bulletSpeed: number;
    movementSpeed: number;
}

export class Tank {
    private readonly _scene: Scene;
    private readonly _node: TransformNode;
    private readonly _properties: TankProperties;
    private readonly _bullets: Bullets;
    private _lastBulletShotTime = 0;
    private _velocity = Vector3.Zero();

    public constructor(name: string, properties: TankProperties, bullets: Bullets, scene: Scene) {
        this._properties = properties;
        this._bullets = bullets;
        this._scene = scene;

        // Create parent node.
        this._node = new TransformNode(name, scene);

        // Create tank body.
        const body = MeshBuilder.CreateSphere("body", { segments: 12 }, scene);
        body.parent = this._node;
        body.isPickable = false;

        // Create tank material.
        const bodyMaterial = new StandardMaterial("body", scene);
        bodyMaterial.diffuseColor = new Color3(0.3, 0.7, 1);
        body.material = bodyMaterial;

        // Create tank barrel.
        const barrel = MeshBuilder.CreateCylinder("barrel", { tessellation: 16, cap: Mesh.CAP_END, diameter: properties.barrelDiameter, height: properties.barrelLength }, scene);
        barrel.parent = this._node;
        barrel.rotation.x = Math.PI * 0.5;
        barrel.position.z = properties.barrelLength * 0.5;
        barrel.isPickable = false;

        // Create tank barrel material.
        const barrelMaterial = new StandardMaterial("barrel", scene);
        barrelMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
        barrel.material = barrelMaterial;
    }

    public get position(): Vector3 {
        return this._node.position;
    }

    public lookAt(targetPoint: Vector3): void {
        this._node.lookAt(targetPoint);
    }

    public rotate(angularSpeed: number): void {
        const deltaTime = this._scene.deltaTime * 0.001;
        this._node.rotation.y += angularSpeed * deltaTime;
    }

    public move(x: number, z: number): void {
        const deltaTime = this._scene.deltaTime * 0.001;

        const decayFactor = Math.exp(-deltaTime * 4);
        const sqrLength = x * x + z * z;
        if (sqrLength === 0) {
            this._velocity.x = this._velocity.x * decayFactor;
            this._velocity.z = this._velocity.z * decayFactor;
        } else {
            const movementFactor = this._properties.movementSpeed / Math.sqrt(sqrLength);
            x *= movementFactor;
            z *= movementFactor;
            this._velocity.x = x - (x - this._velocity.x) * decayFactor;
            this._velocity.z = z - (z - this._velocity.z) * decayFactor;
        }

        //console.log(`${this._properties.movementSpeed} ${this._velocity.length()}`);

        this._node.position.x += this._velocity.x * deltaTime;
        this._node.position.z += this._velocity.z * deltaTime;
    }

    public shoot(): void {
        const currentTime = Date.now();
        if (currentTime - this._lastBulletShotTime > this._properties.reloadSpeed * 1000) {
            this._lastBulletShotTime = currentTime;
            const bulletDiameter = this._properties.barrelDiameter * 0.75;

            const initialSpeed = Vector3.Dot(this._velocity, this._node.forward) + this._properties.bulletSpeed;
            this._bullets.add(this._node.position, this._node.forward, initialSpeed, this._properties.bulletSpeed, this._properties.barrelLength + bulletDiameter * 0.5, bulletDiameter);
        }
    }
}