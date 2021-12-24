import { MeshBuilder, StandardMaterial, Color3, Mesh, Scene, Vector3, TmpVectors } from "@babylonjs/core";
import { Bullets } from "./bullets";

export interface TankProperties {
    moveSpeed: number;
    barrelDiameter: number;
    barrelLength: number;
    bulletRepeatRate: number;
    bulletSpeed: number;
}

export class Tank {
    private readonly _scene: Scene;
    private readonly _mesh: Mesh;
    private readonly _properties: TankProperties;
    private readonly _bullets: Bullets;
    private _lastBulletShotTime = 0;

    public constructor(name: string, properties: TankProperties, bullets: Bullets, scene: Scene) {
        this._properties = properties;
        this._bullets = bullets;
        this._scene = scene;

        // Create tank body.
        const body = MeshBuilder.CreateSphere("tankBody", {}, scene);

        // Create tank material.
        const bodyMaterial = new StandardMaterial("tankBody", scene);
        bodyMaterial.diffuseColor = new Color3(0.3, 0.7, 1);
        body.material = bodyMaterial;

        // Create tank barrel.
        const barrel = MeshBuilder.CreateCylinder("tankBarrel", { diameter: properties.barrelDiameter, height: properties.barrelLength }, scene);
        barrel.rotation.x = Math.PI * 0.5;
        barrel.position.z = properties.barrelLength * 0.5;

        // Create tank barrel material.
        const barrelMaterial = new StandardMaterial("tankBarrel", scene);
        barrelMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
        barrel.material = barrelMaterial;

        // Merge meshes for efficiency.
        this._mesh = Mesh.MergeMeshes([body, barrel], true, undefined, undefined, undefined, true)!;
        this._mesh.name = name;
        this._mesh.material!.name = name;
        this._mesh.isPickable = false;
    }

    public get position(): Vector3 {
        return this._mesh.position;
    }

    public moveUp(): void {
        this._mesh.position.z += this._properties.moveSpeed * this._scene.getAnimationRatio();
    }

    public moveDown(): void {
        this._mesh.position.z -= this._properties.moveSpeed * this._scene.getAnimationRatio();
    }

    public moveLeft(): void {
        this._mesh.position.x -= this._properties.moveSpeed * this._scene.getAnimationRatio();
    }

    public moveRight(): void {
        this._mesh.position.x += this._properties.moveSpeed * this._scene.getAnimationRatio();
    }

    public lookAt(targetPoint: Vector3): void {
        this._mesh.lookAt(targetPoint);
    }

    public shoot(): void {
        const currentTime = Date.now();
        if (currentTime - this._lastBulletShotTime > this._properties.bulletRepeatRate) {
            this._lastBulletShotTime = currentTime;
            const bulletDiameter = this._properties.barrelDiameter * 0.75;
            this._bullets.add(this._mesh.position, this._mesh.forward, this._properties.bulletSpeed, this._properties.barrelLength + bulletDiameter * 0.5, bulletDiameter);
        }
    }
}