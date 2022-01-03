import { Material } from "@babylonjs/core/Materials/material";
import { NodeMaterial } from "@babylonjs/core/Materials/Node";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { CreateShadowMaterial } from "./shadowMaterial";
import { RenderingGroupId, World } from "./world";

export class Sources {
    private readonly _scene: Scene;

    private readonly _materials: {
        readonly blue: Material;
        readonly gray: Material;
        readonly green: Material;
        readonly orange: Material;
        readonly pink: Material;
        readonly purple: Material;
        readonly yellow: Material;
        readonly shadow: Material;
    }

    private readonly _meshes: {
        readonly playerTankBullet: Mesh;
        readonly shooterCrasherBullet: Mesh;
        readonly health: Mesh;
        readonly shadow: Mesh;
        readonly cube: Mesh;
        readonly tetrahedron: Mesh;
        readonly dodecahedron: Mesh;
        readonly goldberg11: Mesh;
        readonly smallCrasher: Mesh;
        readonly bigCrasher: Mesh;
        readonly shooterCrasher: TransformNode;
    };

    public constructor(world: World) {
        this._scene = world.scene;

        const sources = new TransformNode("sources", this._scene);
        sources.setEnabled(false);

        this._materials = {
            blue: this._createMaterial("blue", 0.3, 0.7, 1),
            gray: this._createMaterial("gray", 0.5, 0.5, 0.5),
            green: this._createMaterial("green", 0, 0.8, 0),
            orange: this._createMaterial("orange", 1, 0.5, 0.2),
            pink: this._createMaterial("pink", 1, 0.5, 0.75),
            purple: this._createMaterial("purple", 0.5, 0.2, 1),
            yellow: this._createMaterial("yellow", 0.9, 0.9, 0),
            shadow: CreateShadowMaterial(this._scene),
        }

        this._meshes = {
            playerTankBullet: this._createBulletSource(sources, "bulletPlayerTank", 8, this._materials.blue),
            shooterCrasherBullet: this._createBulletSource(sources, "bulletShooterCrasher", 4, this._materials.pink),
            health: this._createHealthSource(sources),
            shadow: this._createShadowSource(sources),
            cube: this._createCubeSource(sources),
            tetrahedron: this._createTetrahedronSource(sources),
            dodecahedron: this._createDodecahedronSource(sources),
            goldberg11: this._createGoldberg11Source(sources),
            smallCrasher: this._createSmallCrasherSource(sources),
            bigCrasher: this._createBigCrasherSource(sources),
            shooterCrasher: this._createShooterCrasherSource(sources),
        };
    }

    public createPlayerTankBullet(parent: TransformNode): TransformNode {
        return this._createInstance(this._meshes.playerTankBullet, "playerTank", parent);
    }

    public createShooterCrasherBullet(parent: TransformNode): TransformNode {
        return this._createInstance(this._meshes.shooterCrasherBullet, "shooterCrasher", parent);
    }

    public createHealth(parent: TransformNode): TransformNode {
        return this._createInstance(this._meshes.health, "health", parent);
    }

    public createShadow(parent: TransformNode): TransformNode {
        return this._createInstance(this._meshes.shadow, "shadow", parent);
    }

    public createCubeShape(parent: TransformNode): TransformNode {
        return this._createInstance(this._meshes.cube, "cube", parent);
    }

    public createTetrahedronShape(parent: TransformNode): TransformNode {
        return this._createInstance(this._meshes.tetrahedron, "tetrahedron", parent);
    }

    public createDodecahedronShape(parent: TransformNode): TransformNode {
        return this._createInstance(this._meshes.dodecahedron, "dodecahedron", parent);
    }

    public createGoldberg11Shape(parent: TransformNode): TransformNode {
        return this._createInstance(this._meshes.goldberg11, "goldberg11", parent);
    }

    public createSmallCrasher(parent: TransformNode): TransformNode {
        return this._createInstance(this._meshes.smallCrasher, "small", parent);
    }

    public createBigCrasher(parent: TransformNode): TransformNode {
        return this._createInstance(this._meshes.bigCrasher, "big", parent);
    }

    public createShooterCrasher(parent: TransformNode): TransformNode {
        return this._instantiateHeirarchy(this._meshes.shooterCrasher, "shooter", parent);
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
        source.renderingGroupId = RenderingGroupId.Entity;
        source.material = material;
        source.parent = sources;
        return source;
    }

    private _createHealthSource(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreatePlane("health", { width: 1, height: 0.08 }, this._scene);
        source.renderingGroupId = RenderingGroupId.Entity;
        source.material = this._createMaterial("health", 0, 0.8, 0, true);
        source.parent = sources;
        return source;
    }

    private _createShadowSource(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreatePlane("shadow", { size: 1 }, this._scene);
        source.renderingGroupId = RenderingGroupId.Entity;
        source.rotation.x = Math.PI / 2;
        source.bakeCurrentTransformIntoVertices();
        source.material = this._materials.shadow;
        source.parent = sources;
        return source;
    }

    private _createCubeSource(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreateBox("shapeCube", { size: 0.4 }, this._scene);
        source.renderingGroupId = RenderingGroupId.Entity;
        source.rotation.x = Math.atan(1 / Math.sqrt(2));
        source.rotation.z = Math.PI / 4;
        source.bakeCurrentTransformIntoVertices();
        source.material = this._materials.yellow;
        source.parent = sources;
        return source;
    }

    private _createTetrahedronSource(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreatePolyhedron("shapeTetrahedron", { type: 0, size: 0.25 }, this._scene);
        source.renderingGroupId = RenderingGroupId.Entity;
        source.position.y = -0.1;
        source.rotation.x = -Math.PI / 2;
        source.bakeCurrentTransformIntoVertices();
        source.material = this._materials.orange;
        source.parent = sources;
        return source;
    }

    private _createDodecahedronSource(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreatePolyhedron("shapeDodecahedron", { type: 2, size: 0.5 }, this._scene);
        source.renderingGroupId = RenderingGroupId.Entity;
        source.rotation.x = Math.PI / 2;
        source.bakeCurrentTransformIntoVertices();
        source.material = this._materials.purple;
        source.parent = sources;
        return source;
    }

    private _createGoldberg11Source(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreateGoldberg("shapeGoldberg11", { m: 1, n: 1, size: 0.9 }, this._scene);
        source.renderingGroupId = RenderingGroupId.Entity;
        source.material = this._materials.green;
        source.parent = sources;
        return source;
    }

    private _createSmallCrasherSource(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreatePolyhedron("crasherSmall", { type: 0, size: 0.2 }, this._scene);
        source.renderingGroupId = RenderingGroupId.Entity;
        source.rotation.z = Math.PI / 6;
        source.bakeCurrentTransformIntoVertices();
        source.material = this._materials.pink;
        source.parent = sources;
        return source;
    }

    private _createBigCrasherSource(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreatePolyhedron("crasherBig", { type: 0, size: 0.3 }, this._scene);
        source.renderingGroupId = RenderingGroupId.Entity;
        source.rotation.z = Math.PI / 6;
        source.bakeCurrentTransformIntoVertices();
        source.material = this._materials.pink;
        source.parent = sources;
        return source;
    }

    private _createShooterCrasherSource(sources: TransformNode): TransformNode {
        const source = new TransformNode("crasherShooter", this._scene);
        source.parent = sources;

        const body = MeshBuilder.CreatePolyhedron("body", { type: 0, size: 0.3 }, this._scene);
        body.renderingGroupId = RenderingGroupId.Entity;
        body.rotation.z = Math.PI / 6;
        body.bakeCurrentTransformIntoVertices();
        body.material = this._materials.pink;
        body.parent = source;

        const barrel = MeshBuilder.CreateCylinder("barrel", { tessellation: 16, cap: Mesh.CAP_END, diameter: 0.2, height: 0.4 }, this._scene);
        barrel.renderingGroupId = RenderingGroupId.Entity;
        barrel.rotation.x = Math.PI / 2;
        barrel.bakeCurrentTransformIntoVertices();
        barrel.position.z = 0.35;
        barrel.material = this._materials.gray;
        barrel.parent = source;

        return source;
    }
}
