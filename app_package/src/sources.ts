import { InstancedMesh, Mesh, MeshBuilder, StandardMaterial, TransformNode } from "@babylonjs/core";
import { World } from "./world";

export class Sources {
    public readonly bullet: Mesh;
    public readonly health: Mesh;
    public readonly cube: Mesh;
    public readonly tetrahedron: Mesh;
    public readonly dodecahedron: Mesh;
    public readonly goldberg11: Mesh;

    public constructor(world: World) {
        const sources = new TransformNode("sources", world.scene);
        sources.setEnabled(false);

        this.bullet = this._createBullet(sources);
        this.health = this._createHealth(sources);
        this.cube = this._createCube(sources);
        this.tetrahedron = this._createTetrahedron(sources);
        this.dodecahedron = this._createDodecahedron(sources);
        this.goldberg11 = this._createGoldberg11(sources);
    }

    public createInstance(source: Mesh, name: string, parent: TransformNode): InstancedMesh {
        const instance = source.createInstance(name);
        instance.parent = parent;
        instance.isPickable = false;
        instance.doNotSyncBoundingInfo = true;
        instance.alwaysSelectAsActiveMesh = true;
        return instance;
    }

    private _createBullet(sources: TransformNode): Mesh {
        const scene = sources.getScene();
        const source = MeshBuilder.CreateSphere("bullet", { segments: 4 }, scene);
        source.parent = sources;
        const material = new StandardMaterial("bullet", scene);
        material.diffuseColor.set(0.3, 0.7, 1);
        source.material = material;
        return source;
    }

    private _createHealth(sources: TransformNode): Mesh {
        const scene = sources.getScene();
        const source = MeshBuilder.CreatePlane("health", { width: 1, height: 0.08 }, scene);
        source.parent = sources;
        return source;
    }

    private _createCube(sources: TransformNode): Mesh {
        const scene = sources.getScene();
        const source = MeshBuilder.CreateBox("cube", { size: 0.4 }, scene);
        source.parent = sources;
        source.rotation.x = Math.atan(1 / Math.sqrt(2));
        source.rotation.z = Math.PI / 4;
        source.bakeCurrentTransformIntoVertices();
        return source;
    }

    private _createTetrahedron(sources: TransformNode): Mesh {
        const scene = sources.getScene();
        const source = MeshBuilder.CreatePolyhedron("tetrahedron", { type: 0, size: 0.25 }, scene);
        source.parent = sources;
        source.rotation.x = -Math.PI / 2;
        source.bakeCurrentTransformIntoVertices();
        return source;
    }

    private _createDodecahedron(sources: TransformNode): Mesh {
        const scene = sources.getScene();
        const source = MeshBuilder.CreatePolyhedron("dodecahedron", { type: 2, size: 0.5 }, scene);
        source.parent = sources;
        source.rotation.x = Math.PI / 2;
        source.bakeCurrentTransformIntoVertices();
        return source;
    }

    private _createGoldberg11(sources: TransformNode): Mesh {
        const scene = sources.getScene();
        const source = MeshBuilder.CreateGoldberg("goldberg11", { m: 1, n: 1, size: 0.9 }, scene);
        source.parent = sources;
        return source;
    }
}