import { AbstractMesh, Color3, InstancedMesh, Material, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode } from "@babylonjs/core";
import { World } from "./world";

export class Sources {
    private readonly _scene: Scene;

    private readonly _blue: Material;
    private readonly _gray: Material;
    private readonly _green: Material;
    private readonly _orange: Material;
    private readonly _pink: Material;
    private readonly _purple: Material;
    private readonly _yellow: Material;

    private readonly _playerTankBullet: Mesh;
    private readonly _shooterCrasherBullet: Mesh;
    private readonly _health: Mesh;
    private readonly _cube: Mesh;
    private readonly _tetrahedron: Mesh;
    private readonly _dodecahedron: Mesh;
    private readonly _goldberg11: Mesh;
    private readonly _smallCrasher: Mesh;
    private readonly _bigCrasher: Mesh;
    private readonly _shooterCrasher: TransformNode;

    public constructor(world: World) {
        this._scene = world.scene;

        const sources = new TransformNode("sources", this._scene);
        sources.setEnabled(false);

        this._blue = this._createMaterial("blue", 0.3, 0.7, 1);
        this._gray = this._createMaterial("gray", 0.5, 0.5, 0.5);
        this._green = this._createMaterial("green", 0, 0.8, 0);
        this._orange = this._createMaterial("orange", 1, 0.5, 0.2);
        this._pink = this._createMaterial("pink", 1, 0.5, 0.75);
        this._purple = this._createMaterial("purple", 0.5, 0.2, 1);
        this._yellow = this._createMaterial("yellow", 0.9, 0.9, 0);

        this._playerTankBullet = this._createBulletSource(sources, "playerTankBullet", 8, this._blue);
        this._shooterCrasherBullet = this._createBulletSource(sources, "shooterCrasherBullet", 4, this._pink);
        this._health = this._createHealthSource(sources);
        this._cube = this._createCubeSource(sources);
        this._tetrahedron = this._createTetrahedronSource(sources);
        this._dodecahedron = this._createDodecahedronSource(sources);
        this._goldberg11 = this._createGoldberg11Source(sources);
        this._smallCrasher = this._createSmallCrasherSource(sources);
        this._bigCrasher = this._createBigCrasherSource(sources);
        this._shooterCrasher = this._createShooterCrasherSource(sources);
    }

    public createPlayerTankBullet(name: string, parent: TransformNode): TransformNode {
        return this._createInstance(this._playerTankBullet, name, parent);
    }

    public createShooterCrasherBullet(name: string, parent: TransformNode): TransformNode {
        return this._createInstance(this._shooterCrasherBullet, name, parent);
    }

    public createHealth(name: string, parent: TransformNode, size: number, offset: number): TransformNode {
        const instance = this._createInstance(this._health, name, parent);
        instance.position.y = size * 0.5 + offset;
        instance.scaling.x = size;
        instance.billboardMode = Mesh.BILLBOARDMODE_Y;
        instance.setEnabled(false);
        return instance;
    }

    public createCube(name: string, parent: TransformNode): TransformNode {
        return this._createInstance(this._cube, name, parent);
    }

    public createTetrahedron(name: string, parent: TransformNode): TransformNode {
        return this._createInstance(this._tetrahedron, name, parent);
    }

    public createDodecahedron(name: string, parent: TransformNode): TransformNode {
        return this._createInstance(this._dodecahedron, name, parent);
    }

    public createGoldberg11(name: string, parent: TransformNode): TransformNode {
        return this._createInstance(this._goldberg11, name, parent);
    }

    public createSmallCrasher(name: string, parent: TransformNode): TransformNode {
        return this._createInstance(this._smallCrasher, name, parent);
    }

    public createBigCrasher(name: string, parent: TransformNode): TransformNode {
        return this._createInstance(this._bigCrasher, name, parent);
    }

    public createShooterCrasher(name: string, parent: TransformNode): TransformNode {
        return this._instantiateHeirarchy(this._shooterCrasher, name, parent);
    }

    private _createMaterial(name: string, r: number, g: number, b: number, unlit = false): Material {
        const material = new StandardMaterial(name, this._scene);
        if (unlit) {
            material.emissiveColor.set(r, g, b);
            material.disableLighting = true;
        } else {
            material.diffuseColor.set(r, g, b);
        }
        return material;
    }

    private _createInstance(source: Mesh, name: string, parent: TransformNode): InstancedMesh {
        const instance = source.createInstance(name);
        this._initMesh(instance);
        instance.parent = parent;
        return instance;
    }

    private _instantiateHeirarchy(source: TransformNode, name: string, parent: TransformNode): TransformNode {
        const instance = source.instantiateHierarchy(parent)!;
        for (const mesh of instance.getChildMeshes()) {
            this._initMesh(mesh);
        }
        instance.name = name;
        return instance;
    }

    private _initMesh(mesh: AbstractMesh): void {
        mesh.isPickable = false;
        mesh.doNotSyncBoundingInfo = true;
        mesh.alwaysSelectAsActiveMesh = true;
    }

    private _createBulletSource(sources: TransformNode, name: string, segments: number, material: Material): Mesh {
        const source = MeshBuilder.CreateSphere(name, { segments: segments }, this._scene);
        source.material = material;
        source.parent = sources;
        return source;
    }

    private _createHealthSource(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreatePlane("health", { width: 1, height: 0.08 }, this._scene);
        source.material = this._createMaterial("health", 0, 0.8, 0, true);
        source.parent = sources;
        return source;
    }

    private _createCubeSource(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreateBox("cube", { size: 0.4 }, this._scene);
        source.rotation.x = Math.atan(1 / Math.sqrt(2));
        source.rotation.z = Math.PI / 4;
        source.bakeCurrentTransformIntoVertices();
        source.material = this._yellow;
        source.parent = sources;
        return source;
    }

    private _createTetrahedronSource(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreatePolyhedron("tetrahedron", { type: 0, size: 0.25 }, this._scene);
        source.rotation.x = -Math.PI / 2;
        source.bakeCurrentTransformIntoVertices();
        source.material = this._orange;
        source.parent = sources;
        return source;
    }

    private _createDodecahedronSource(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreatePolyhedron("dodecahedron", { type: 2, size: 0.5 }, this._scene);
        source.rotation.x = Math.PI / 2;
        source.bakeCurrentTransformIntoVertices();
        source.material = this._purple;
        source.parent = sources;
        return source;
    }

    private _createGoldberg11Source(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreateGoldberg("goldberg11", { m: 1, n: 1, size: 0.9 }, this._scene);
        source.material = this._green;
        source.parent = sources;
        return source;
    }

    private _createSmallCrasherSource(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreatePolyhedron("smallCrasher", { type: 0, size: 0.2 }, this._scene);
        source.rotation.z = Math.PI / 6;
        source.bakeCurrentTransformIntoVertices();
        source.material = this._pink;
        source.parent = sources;
        return source;
    }

    private _createBigCrasherSource(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreatePolyhedron("bigCrasher", { type: 0, size: 0.3 }, this._scene);
        source.rotation.z = Math.PI / 6;
        source.bakeCurrentTransformIntoVertices();
        source.material = this._pink;
        source.parent = sources;
        return source;
    }

    private _createShooterCrasherSource(sources: TransformNode): TransformNode {
        const source = new TransformNode("shooterCrasher", this._scene);
        source.parent = sources;

        const body = MeshBuilder.CreatePolyhedron("body", { type: 0, size: 0.3 }, this._scene);
        body.rotation.z = Math.PI / 6;
        body.bakeCurrentTransformIntoVertices();
        body.material = this._pink;
        body.parent = source;

        const barrel = MeshBuilder.CreateCylinder("barrel", { tessellation: 16, cap: Mesh.CAP_END, diameter: 0.2, height: 0.4 }, this._scene);
        barrel.rotation.x = Math.PI / 2;
        barrel.bakeCurrentTransformIntoVertices();
        barrel.position.z = 0.35;
        barrel.material = this._gray;
        barrel.parent = source;

        return source;
    }
}
