import { MeshBuilder, StandardMaterial, Color3, Mesh, Scene, Vector3 } from "@babylonjs/core";

export interface TankOptions {
    barrelDiameter: number;
    barrelLength: number;
}

export class Tank {
    private readonly _mesh: Mesh;

    public constructor(name: string, options: TankOptions, scene: Scene) {
        // Create tank body.
        const body = MeshBuilder.CreateSphere("tankBody", { diameter: 1 }, scene);

        // Create tank material.
        const bodyMaterial = new StandardMaterial("tankBody", scene);
        bodyMaterial.diffuseColor = new Color3(0.3, 0.7, 1);
        body.material = bodyMaterial;

        // Create tank barrel.
        const barrel = MeshBuilder.CreateCylinder("tankBarrel", { diameter: options.barrelDiameter, height: options.barrelLength }, scene);
        barrel.rotation.x = Math.PI * 0.5;
        barrel.position.z = options.barrelLength * 0.5;

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

    public lookAt(targetPoint: Vector3): void {
        this._mesh.lookAt(targetPoint);
    }
}