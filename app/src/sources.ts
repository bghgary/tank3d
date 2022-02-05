import { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { CreateShadowMaterial } from "./materials/shadowMaterial";
import { World } from "./world";

function createBarrel(name: string, size: number, length: number, scene: Scene): Mesh {
    const barrel = MeshBuilder.CreateCylinder(name, { tessellation: Math.round(36 * size), cap: Mesh.CAP_END, diameter: size, height: length }, scene);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = length / 2;
    barrel.bakeCurrentTransformIntoVertices();
    return barrel;
}

export interface SizeMetadata {
    readonly size: number;
}

export interface BarrelMetadata {
    readonly size: number;
    readonly length: number;
    readonly offset: Vector3;
    readonly forward: Vector3;
}

interface BarrelsMetadata {
    readonly barrels: Array<BarrelMetadata>;
};

export interface ShapeMetadata extends SizeMetadata { }
export interface CrasherMetadata extends SizeMetadata { }
export interface BulletMetadata extends SizeMetadata { }
export interface ShooterCrasherMetadata extends SizeMetadata, BarrelsMetadata { }
export interface TankMetadata extends SizeMetadata, BarrelsMetadata {
    readonly shieldSize: number;
}

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
        readonly shield: Mesh;
        readonly health: Mesh;
        readonly shadow: Mesh;
        readonly playerTankBullet: Mesh;
        readonly shooterCrasherBullet: Mesh;
        readonly cube: Mesh;
        readonly tetrahedron: Mesh;
        readonly dodecahedron: Mesh;
        readonly goldberg11: Mesh;
        readonly smallCrasher: Mesh;
        readonly bigCrasher: Mesh;
        readonly shooterCrasher: TransformNode;
        readonly baseTank: TransformNode;
        readonly sniperTank: TransformNode;
        readonly twinTank: TransformNode;
        readonly flankGuardTank: TransformNode;
        readonly pounderTank: TransformNode;
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
            shield: this._createShieldSource(sources),
            health: this._createHealthSource(sources),
            shadow: this._createShadowSource(sources),
            playerTankBullet: this._createBulletSource(sources, "bulletPlayerTank", 8, this._materials.blue),
            shooterCrasherBullet: this._createBulletSource(sources, "bulletShooterCrasher", 4, this._materials.pink),
            cube: this._createCubeSource(sources),
            tetrahedron: this._createTetrahedronSource(sources),
            dodecahedron: this._createDodecahedronSource(sources),
            goldberg11: this._createGoldberg11Source(sources),
            smallCrasher: this._createSmallCrasherSource(sources),
            bigCrasher: this._createBigCrasherSource(sources),
            shooterCrasher: this._createShooterCrasherSource(sources),
            baseTank: this._createTankSource(sources),
            sniperTank: this._createSniperTankSource(sources),
            twinTank: this._createTwinTankSource(sources),
            flankGuardTank: this._createFlankGuardTankSource(sources),
            pounderTank: this._createPounderTankSource(sources),
        };
    }

    public createShield(parent?: TransformNode, name?: string): Mesh {
        return this._createClone(this._meshes.shield, name || "shield", parent);
    }

    public createHealth(parent?: TransformNode, name?: string): TransformNode {
        return this._createInstance(this._meshes.health, name || "health", parent);
    }

    public createShadow(parent?: TransformNode, name?: string): TransformNode {
        return this._createInstance(this._meshes.shadow, name || "shadow", parent);
    }

    public createPlayerTankBullet(parent?: TransformNode, name?: string): TransformNode {
        return this._createInstance(this._meshes.playerTankBullet, name || "playerTank", parent);
    }

    public createShooterCrasherBullet(parent?: TransformNode, name?: string): TransformNode {
        return this._createInstance(this._meshes.shooterCrasherBullet, name || "shooterCrasher", parent);
    }

    public createCubeShape(parent?: TransformNode, name?: string): TransformNode {
        return this._createInstance(this._meshes.cube, name || "cube", parent);
    }

    public createTetrahedronShape(parent?: TransformNode, name?: string): TransformNode {
        return this._createInstance(this._meshes.tetrahedron, name || "tetrahedron", parent);
    }

    public createDodecahedronShape(parent?: TransformNode, name?: string): TransformNode {
        return this._createInstance(this._meshes.dodecahedron, name || "dodecahedron", parent);
    }

    public createGoldberg11Shape(parent?: TransformNode, name?: string): TransformNode {
        return this._createInstance(this._meshes.goldberg11, name || "goldberg11", parent);
    }

    public createSmallCrasher(parent?: TransformNode, name?: string): TransformNode {
        return this._createInstance(this._meshes.smallCrasher, name || "small", parent);
    }

    public createBigCrasher(parent?: TransformNode, name?: string): TransformNode {
        return this._createInstance(this._meshes.bigCrasher, name || "big", parent);
    }

    public createShooterCrasher(parent?: TransformNode, name?: string): TransformNode {
        return this._instantiateHeirarchy(this._meshes.shooterCrasher, name || "shooter", parent);
    }

    public createBaseTank(parent?: TransformNode, name?: string): TransformNode {
        return this._instantiateHeirarchy(this._meshes.baseTank, name || "base", parent);
    }

    public createSniperTank(parent?: TransformNode, name?: string): TransformNode {
        return this._instantiateHeirarchy(this._meshes.sniperTank, name || "sniper", parent);
    }

    public createTwinTank(parent?: TransformNode, name?: string): TransformNode {
        return this._instantiateHeirarchy(this._meshes.twinTank, name || "twin", parent);
    }

    public createFlankGuardTank(parent?: TransformNode, name?: string): TransformNode {
        return this._instantiateHeirarchy(this._meshes.flankGuardTank, name || "flankGuard", parent);
    }

    public createPounderTank(parent?: TransformNode, name?: string): TransformNode {
        return this._instantiateHeirarchy(this._meshes.pounderTank, name || "pounder", parent);
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

    private _createClone(source: Mesh, name: string, parent?: TransformNode): Mesh {
        const clone = source.clone(name, parent);
        clone.rotationQuaternion = clone.rotationQuaternion || Quaternion.FromEulerVector(clone.rotation);
        this._initMesh(clone);
        return clone;
    }

    private _createInstance(source: Mesh, name: string, parent?: TransformNode): InstancedMesh {
        const instance = source.createInstance(name);
        instance.rotationQuaternion = instance.rotationQuaternion || Quaternion.FromEulerVector(instance.rotation);
        this._initMesh(instance);
        instance.metadata = source.metadata;
        instance.parent = parent || null;
        return instance;
    }

    private _instantiateHeirarchy(source: TransformNode, name: string, parent?: TransformNode): TransformNode {
        const instance = source.instantiateHierarchy(parent, undefined, (source, clone) => clone.name = source.name)!;
        instance.rotationQuaternion = instance.rotationQuaternion || Quaternion.FromEulerVector(instance.rotation);
        for (const mesh of instance.getChildMeshes()) {
            this._initMesh(mesh);
        }
        instance.name = name;
        instance.parent = parent || null;
        return instance;
    }

    private _initMesh(mesh: AbstractMesh): void {
        mesh.isPickable = false;
        mesh.doNotSyncBoundingInfo = true;
        mesh.alwaysSelectAsActiveMesh = true;
    }

    private _createShieldSource(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreateSphere("shield", { segments: 16 }, this._scene);
        source.parent = sources;
        return source;
    }

    private _createHealthSource(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreatePlane("health", { width: 1, height: 0.08 }, this._scene);
        source.material = this._materials.green;
        source.parent = sources;
        return source;
    }

    private _createShadowSource(sources: TransformNode): Mesh {
        const source = MeshBuilder.CreatePlane("shadow", { size: 1 }, this._scene);
        source.rotation.x = Math.PI / 2;
        source.bakeCurrentTransformIntoVertices();
        source.material = this._materials.shadow;
        source.parent = sources;
        return source;
    }

    private _createBulletSource(sources: TransformNode, name: string, segments: number, material: Material): Mesh {
        const metadata: BulletMetadata = {
            size: 1,
        };

        const source = MeshBuilder.CreateSphere(name, { segments: segments }, this._scene);
        source.metadata = metadata;
        source.material = material;
        source.parent = sources;
        return source;
    }

    private _createCubeSource(sources: TransformNode): Mesh {
        const metadata: ShapeMetadata = {
            size: 0.6,
        };

        const source = MeshBuilder.CreateBox("shapeCube", { size: 0.4 }, this._scene);
        source.rotation.x = Math.atan(1 / Math.sqrt(2));
        source.rotation.z = Math.PI / 4;
        source.bakeCurrentTransformIntoVertices();
        source.metadata = metadata;
        source.material = this._materials.yellow;
        source.parent = sources;
        return source;
    }

    private _createTetrahedronSource(sources: TransformNode): Mesh {
        const metadata: ShapeMetadata = {
            size: 0.6,
        };

        const source = MeshBuilder.CreatePolyhedron("shapeTetrahedron", { type: 0, size: 0.25 }, this._scene);
        source.position.y = -0.1;
        source.rotation.x = -Math.PI / 2;
        source.bakeCurrentTransformIntoVertices();
        source.metadata = metadata;
        source.material = this._materials.orange;
        source.parent = sources;
        return source;
    }

    private _createDodecahedronSource(sources: TransformNode): Mesh {
        const metadata: ShapeMetadata = {
            size: 1,
        };

        const source = MeshBuilder.CreatePolyhedron("shapeDodecahedron", { type: 2, size: 0.5 }, this._scene);
        source.rotation.x = Math.PI / 2;
        source.bakeCurrentTransformIntoVertices();
        source.metadata = metadata;
        source.material = this._materials.purple;
        source.parent = sources;
        return source;
    }

    private _createGoldberg11Source(sources: TransformNode): Mesh {
        const metadata: ShapeMetadata = {
            size: 1.62,
        };

        const source = MeshBuilder.CreateGoldberg("shapeGoldberg11", { m: 1, n: 1, size: 0.9 }, this._scene);
        source.material = this._materials.green;
        source.metadata = metadata;
        source.parent = sources;
        return source;
    }

    private _createSmallCrasherSource(sources: TransformNode): Mesh {
        const metadata: CrasherMetadata = {
            size: 0.6,
        };

        const source = MeshBuilder.CreatePolyhedron("crasherSmall", { type: 0, size: 0.2 }, this._scene);
        source.rotation.z = Math.PI / 6;
        source.bakeCurrentTransformIntoVertices();
        source.metadata = metadata;
        source.material = this._materials.pink;
        source.parent = sources;
        return source;
    }

    private _createBigCrasherSource(sources: TransformNode): Mesh {
        const metadata: CrasherMetadata = {
            size: 0.8,
        };

        const source = MeshBuilder.CreatePolyhedron("crasherBig", { type: 0, size: 0.3 }, this._scene);
        source.rotation.z = Math.PI / 6;
        source.bakeCurrentTransformIntoVertices();
        source.metadata = metadata;
        source.material = this._materials.pink;
        source.parent = sources;
        return source;
    }

    private _createShooterCrasherSource(sources: TransformNode): TransformNode {
        const barrelSize = 0.2;
        const barrelLength = 0.6;

        const metadata: ShooterCrasherMetadata = {
            size: 0.8,
            barrels: [{
                size: barrelSize,
                length: barrelLength,
                offset: new Vector3(0, 0, 0),
                forward: new Vector3(0, 0, 1),
            }],
        };

        const source = new TransformNode("crasherShooter", this._scene);
        source.metadata = metadata;
        source.parent = sources;

        const body = MeshBuilder.CreatePolyhedron("body", { type: 0, size: 0.3 }, this._scene);
        body.rotation.z = Math.PI / 6;
        body.bakeCurrentTransformIntoVertices();
        body.material = this._materials.pink;
        body.parent = source;

        const barrel = createBarrel("barrel", barrelSize, barrelLength, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        return source;
    }

    private _createTankSource(sources: TransformNode): TransformNode {
        const barrelSize = 0.45;
        const barrelLength = 0.75;

        const metadata: TankMetadata = {
            size: 1,
            shieldSize: 1.75,
            barrels: [{
                size: barrelSize,
                length: barrelLength,
                offset: new Vector3(0, 0, 0),
                forward: new Vector3(0, 0, 1),
            }],
        };

        const source = new TransformNode("tank", this._scene);
        source.metadata = metadata;
        source.parent = sources;

        const body = MeshBuilder.CreateSphere("body", { segments: 16 }, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrel = createBarrel("barrel", barrelSize, barrelLength, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        return source;
    }

    private _createSniperTankSource(sources: TransformNode): TransformNode {
        const barrelSize = 0.4;
        const barrelLength = 0.9;

        const metadata: TankMetadata = {
            size: 1,
            shieldSize: 2,
            barrels: [{
                size: barrelSize,
                length: barrelLength,
                offset: new Vector3(0, 0, 0),
                forward: new Vector3(0, 0, 1),
            }],
        };

        const source = new TransformNode("tankSniper", this._scene);
        source.metadata = metadata;
        source.parent = sources;

        const body = MeshBuilder.CreateSphere("body", { segments: 16 }, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrel = createBarrel("barrel", barrelSize, barrelLength, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        return source;
    }

    private _createTwinTankSource(sources: TransformNode): TransformNode {
        const barrelSize = 0.4;
        const barrelLength = 0.75;
        const barrelOffset = barrelSize * 0.51;

        const metadata: TankMetadata = {
            size: 1,
            shieldSize: 1.75,
            barrels: [{
                size: barrelSize,
                length: barrelLength,
                offset: new Vector3(-barrelOffset, 0, 0),
                forward: new Vector3(0, 0, 1),
            }, {
                size: barrelSize,
                length: barrelLength,
                offset: new Vector3(barrelOffset, 0, 0),
                forward: new Vector3(0, 0, 1),
            }],
        };

        const source = new TransformNode("tankTwin", this._scene);
        source.metadata = metadata;
        source.parent = sources;

        const body = MeshBuilder.CreateSphere("body", { segments: 16 }, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrelL = createBarrel("barrelL", barrelSize, barrelLength, this._scene);
        barrelL.position.x = -barrelOffset;
        barrelL.material = this._materials.gray;
        barrelL.parent = source;

        const barrelR = createBarrel("barrelR", barrelSize, barrelLength, this._scene);
        barrelR.position.x = +barrelOffset;
        barrelR.material = this._materials.gray;
        barrelR.parent = source;

        return source;
    }

    private _createFlankGuardTankSource(sources: TransformNode): TransformNode {
        const barrelSize = 0.45;
        const barrelLengthF = 0.75;
        const barrelLengthB = 0.65;

        const metadata: TankMetadata = {
            size: 1,
            shieldSize: 1.75,
            barrels: [{
                size: barrelSize,
                length: barrelLengthF,
                offset: new Vector3(0, 0, 0),
                forward: new Vector3(0, 0, 1),
            }, {
                size: barrelSize,
                length: barrelLengthB,
                offset: new Vector3(0, 0, 0),
                forward: new Vector3(0, 0, -1),
            }],
        };

        const source = new TransformNode("tankFlankGuard", this._scene);
        source.metadata = metadata;
        source.parent = sources;

        const body = MeshBuilder.CreateSphere("body", { segments: 16 }, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrelF = createBarrel("barrelF", barrelSize, barrelLengthF, this._scene);
        barrelF.material = this._materials.gray;
        barrelF.parent = source;

        const barrelB = createBarrel("barrelR", barrelSize, barrelLengthB, this._scene);
        barrelB.rotationQuaternion = Quaternion.RotationYawPitchRoll(Math.PI, 0, 0);
        barrelB.material = this._materials.gray;
        barrelB.parent = source;

        return source;
    }

    private _createPounderTankSource(sources: TransformNode): TransformNode {
        const barrelSize = 0.55;
        const barrelLength = 0.75;

        const metadata: TankMetadata = {
            size: 1,
            shieldSize: 1.75,
            barrels: [{
                size: barrelSize,
                length: barrelLength,
                offset: new Vector3(0, 0, 0),
                forward: new Vector3(0, 0, 1),
            }],
        };

        const source = new TransformNode("tankPounder", this._scene);
        source.metadata = metadata;
        source.parent = sources;

        const body = MeshBuilder.CreateSphere("body", { segments: 16 }, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrel = createBarrel("barrel", barrelSize, barrelLength, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        return source;
    }
}
