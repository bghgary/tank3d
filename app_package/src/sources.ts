import { AbstractMesh, InstancedMesh, Mesh, MeshBuilder, StandardMaterial, TransformNode } from "@babylonjs/core";
import { World } from "./world";

export class Sources {
    private readonly _bullet: Mesh;
    private readonly _health: Mesh;
    private readonly _cube: Mesh;
    private readonly _tetrahedron: Mesh;
    private readonly _dodecahedron: Mesh;
    private readonly _goldberg11: Mesh;
    private readonly _smallCrasher: Mesh;
    private readonly _bigCrasher: Mesh;
    private readonly _shooterCrasher: TransformNode;

    public constructor(world: World) {
        const sources = new TransformNode("sources", world.scene);
        sources.setEnabled(false);

        this._bullet = this._createBulletSource(sources);
        this._health = this._createHealthSource(sources);
        this._cube = this._createCubeSource(sources);
        this._tetrahedron = this._createTetrahedronSource(sources);
        this._dodecahedron = this._createDodecahedronSource(sources);
        this._goldberg11 = this._createGoldberg11Source(sources);
        this._smallCrasher = this._createSmallCrasherSource(sources);
        this._bigCrasher = this._createBigCrasherSource(sources);
        this._shooterCrasher = this._createShooterCrasherSource(sources);
    }

    public createBullet(name: string, parent: TransformNode): TransformNode {
        return this._createInstance(this._bullet, name, parent);
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

    private _createBulletSource(sources: TransformNode): Mesh {
        const scene = sources.getScene();
        const source = MeshBuilder.CreateSphere("bullet", { segments: 6 }, scene);
        source.parent = sources;
        const material = new StandardMaterial("bullet", scene);
        material.diffuseColor.set(0.3, 0.7, 1);
        source.material = material;
        return source;
    }

    private _createHealthSource(sources: TransformNode): Mesh {
        const scene = sources.getScene();
        const source = MeshBuilder.CreatePlane("health", { width: 1, height: 0.08 }, scene);
        source.parent = sources;
        return source;
    }

    private _createCubeSource(sources: TransformNode): Mesh {
        const scene = sources.getScene();
        const source = MeshBuilder.CreateBox("cube", { size: 0.4 }, scene);
        source.parent = sources;
        source.rotation.x = Math.atan(1 / Math.sqrt(2));
        source.rotation.z = Math.PI / 4;
        source.bakeCurrentTransformIntoVertices();
        return source;
    }

    private _createTetrahedronSource(sources: TransformNode): Mesh {
        const scene = sources.getScene();
        const source = MeshBuilder.CreatePolyhedron("tetrahedron", { type: 0, size: 0.25 }, scene);
        source.parent = sources;
        source.rotation.x = -Math.PI / 2;
        source.bakeCurrentTransformIntoVertices();
        return source;
    }

    private _createDodecahedronSource(sources: TransformNode): Mesh {
        const scene = sources.getScene();
        const source = MeshBuilder.CreatePolyhedron("dodecahedron", { type: 2, size: 0.5 }, scene);
        source.parent = sources;
        source.rotation.x = Math.PI / 2;
        source.bakeCurrentTransformIntoVertices();
        return source;
    }

    private _createGoldberg11Source(sources: TransformNode): Mesh {
        const scene = sources.getScene();
        const source = MeshBuilder.CreateGoldberg("goldberg11", { m: 1, n: 1, size: 0.9 }, scene);
        source.parent = sources;
        return source;
    }

    private _createSmallCrasherSource(sources: TransformNode): Mesh {
        const scene = sources.getScene();
        const source = MeshBuilder.CreatePolyhedron("smallCrasher", { type: 0, size: 0.2 }, scene);
        source.rotation.z = Math.PI / 6;
        source.bakeCurrentTransformIntoVertices();
        source.parent = sources;
        return source;
    }

    private _createBigCrasherSource(sources: TransformNode): Mesh {
        const scene = sources.getScene();
        const source = MeshBuilder.CreatePolyhedron("bigCrasher", { type: 0, size: 0.3 }, scene);
        source.rotation.z = Math.PI / 6;
        source.bakeCurrentTransformIntoVertices();
        source.parent = sources;
        return source;
    }

    private _createShooterCrasherSource(sources: TransformNode): TransformNode {
        const scene = sources.getScene();

        const source = new TransformNode("shooterCrasher", scene);
        source.parent = sources;

        const body = MeshBuilder.CreatePolyhedron("body", { type: 0, size: 0.3 }, scene);
        body.rotation.z = Math.PI / 6;
        body.bakeCurrentTransformIntoVertices();
        body.parent = source;

        const barrel = MeshBuilder.CreateCylinder("barrel", { tessellation: 16, cap: Mesh.CAP_END, diameter: 0.2, height: 0.4 }, scene);
        barrel.rotation.x = Math.PI / 2;
        barrel.bakeCurrentTransformIntoVertices();
        barrel.position.z = 0.35;
        barrel.parent = source;

        return source;
    }
}
