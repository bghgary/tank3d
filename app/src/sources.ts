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

function createBarrel(name: string, size: { muzzle: number, base: number } | number, length: number, scene: Scene): Mesh {
    if (typeof size === "number") {
        size = { muzzle: size, base: size };
    }
 
    const barrel = MeshBuilder.CreateCylinder(name, {
        tessellation: Math.round(36 * Math.max(size.muzzle, size.base)),
        cap: Mesh.CAP_END,
        diameterTop: size.muzzle,
        diameterBottom: size.base,
        height: length
    }, scene);

    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = length / 2;
    barrel.bakeCurrentTransformIntoVertices();

    return barrel;
}

function createTetrahedronBody(name: string, size: number, scene: Scene): Mesh {
    const body = MeshBuilder.CreatePolyhedron(name, { type: 0, size: size / 3 }, scene);
    body.rotation.z = Math.PI / 6;
    body.bakeCurrentTransformIntoVertices();
    return body;
}

export interface SizeMetadata {
    readonly size: number;
}

export interface BarrelMetadata {
    readonly size: number;
    readonly length: number;
    readonly offset: Vector3;
    readonly forward: Vector3;
    readonly mesh: string;
}

interface BarrelsMetadata {
    readonly barrels: Array<BarrelMetadata>;
};

interface ShieldMetadata {
    readonly shieldSize: number;
}

export interface ShapeMetadata extends SizeMetadata { }
export interface CrasherMetadata extends SizeMetadata { }
export interface ShooterCrasherMetadata extends SizeMetadata, BarrelsMetadata { }
export interface TankMetadata extends SizeMetadata, BarrelsMetadata, ShieldMetadata { }

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
        readonly tankBullet: Mesh;
        readonly crasherBullet: Mesh;
        readonly tankDrone: Mesh;
        readonly cube: Mesh;
        readonly tetrahedron: Mesh;
        readonly dodecahedron: Mesh;
        readonly goldberg11: Mesh;
        readonly smallCrasher: Mesh;
        readonly bigCrasher: Mesh;
        readonly shooterCrasher: TransformNode;
        readonly megaCrasher: TransformNode;
        readonly baseTank: TransformNode;
        readonly sniperTank: TransformNode;
        readonly twinTank: TransformNode;
        readonly flankGuardTank: TransformNode;
        readonly pounderTank: TransformNode;
        readonly directorTank: TransformNode;
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
            tankBullet: this._createBulletSource(sources, "bulletTank", 8, this._materials.blue),
            crasherBullet: this._createBulletSource(sources, "bulletCrasher", 4, this._materials.pink),
            tankDrone: this._createDroneSource(sources, "droneTank", this._materials.blue),
            cube: this._createCubeSource(sources),
            tetrahedron: this._createTetrahedronSource(sources),
            dodecahedron: this._createDodecahedronSource(sources),
            goldberg11: this._createGoldberg11Source(sources),
            smallCrasher: this._createSmallCrasherSource(sources),
            bigCrasher: this._createBigCrasherSource(sources),
            shooterCrasher: this._createShooterCrasherSource(sources, "shooterCrasher", 1),
            megaCrasher: this._createShooterCrasherSource(sources, "megaCrasher", 2),
            baseTank: this._createBaseTankSource(sources),
            sniperTank: this._createSniperTankSource(sources),
            twinTank: this._createTwinTankSource(sources),
            flankGuardTank: this._createFlankGuardTankSource(sources),
            pounderTank: this._createPounderTankSource(sources),
            directorTank: this._createDirectorTankSource(sources),
        };
    }

    public createShield(parent?: TransformNode): Mesh {
        return this._createClone(this._meshes.shield, "shield", parent);
    }

    public createHealth(parent?: TransformNode): TransformNode {
        return this._createInstance(this._meshes.health, "health", parent);
    }

    public createShadow(parent?: TransformNode): TransformNode {
        return this._createInstance(this._meshes.shadow, "shadow", parent);
    }

    public createTankBullet(parent?: TransformNode): TransformNode {
        return this._createInstance(this._meshes.tankBullet, "tank", parent);
    }

    public createCrasherBullet(parent?: TransformNode): TransformNode {
        return this._createInstance(this._meshes.crasherBullet, "crasher", parent);
    }

    public createTankDrone(parent?: TransformNode): TransformNode {
        return this._createInstance(this._meshes.tankDrone, "tank", parent);
    }

    public createCubeShape(parent?: TransformNode): TransformNode {
        return this._createInstance(this._meshes.cube, "cube", parent);
    }

    public createTetrahedronShape(parent?: TransformNode): TransformNode {
        return this._createInstance(this._meshes.tetrahedron, "tetrahedron", parent);
    }

    public createDodecahedronShape(parent?: TransformNode): TransformNode {
        return this._createInstance(this._meshes.dodecahedron, "dodecahedron", parent);
    }

    public createGoldberg11Shape(parent?: TransformNode): TransformNode {
        return this._createInstance(this._meshes.goldberg11, "goldberg11", parent);
    }

    public createSmallCrasher(parent?: TransformNode): TransformNode {
        return this._createInstance(this._meshes.smallCrasher, "small", parent);
    }

    public createBigCrasher(parent?: TransformNode): TransformNode {
        return this._createInstance(this._meshes.bigCrasher, "big", parent);
    }

    public createShooterCrasher(parent?: TransformNode): TransformNode {
        return this._instantiateHeirarchy(this._meshes.shooterCrasher, "shooter", parent);
    }

    public createMegaCrasher(parent?: TransformNode): TransformNode {
        return this._instantiateHeirarchy(this._meshes.megaCrasher, "mega", parent);
    }

    public createBaseTank(parent?: TransformNode): TransformNode {
        return this._instantiateHeirarchy(this._meshes.baseTank, "base", parent);
    }

    public createSniperTank(parent?: TransformNode): TransformNode {
        return this._instantiateHeirarchy(this._meshes.sniperTank, "sniper", parent);
    }

    public createTwinTank(parent?: TransformNode): TransformNode {
        return this._instantiateHeirarchy(this._meshes.twinTank, "twin", parent);
    }

    public createFlankGuardTank(parent?: TransformNode): TransformNode {
        return this._instantiateHeirarchy(this._meshes.flankGuardTank, "flankGuard", parent);
    }

    public createPounderTank(parent?: TransformNode): TransformNode {
        return this._instantiateHeirarchy(this._meshes.pounderTank, "pounder", parent);
    }

    public createDirectorTank(parent?: TransformNode): TransformNode {
        return this._instantiateHeirarchy(this._meshes.directorTank, "director", parent);
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
        const metadata: SizeMetadata = {
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
            size: 0.75,
        };

        const source = MeshBuilder.CreatePolyhedron("shapeTetrahedron", { type: 0, size: metadata.size / 3 }, this._scene);
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

        const source = createTetrahedronBody("crasherSmall", metadata.size, this._scene);
        source.metadata = metadata;
        source.material = this._materials.pink;
        source.parent = sources;
        return source;
    }

    private _createBigCrasherSource(sources: TransformNode): Mesh {
        const metadata: CrasherMetadata = {
            size: 0.8,
        };

        const source = createTetrahedronBody("crasherBig", metadata.size, this._scene);
        source.metadata = metadata;
        source.material = this._materials.pink;
        source.parent = sources;
        return source;
    }

    private _createShooterCrasherSource(sources: TransformNode, name: string, size: number): TransformNode {
        const barrelSize = 0.2 * size;
        const barrelLength = 0.5 * size;

        const metadata: ShooterCrasherMetadata = {
            size: 0.8 * size,
            barrels: [{
                size: barrelSize,
                length: barrelLength,
                offset: new Vector3(0, 0, 0),
                forward: new Vector3(0, 0, 1),
                mesh: "barrel",
            }],
        };

        const source = new TransformNode(name, this._scene);
        source.metadata = metadata;
        source.parent = sources;

        const body = createTetrahedronBody("body", metadata.size, this._scene);
        body.material = this._materials.pink;
        body.parent = source;

        const barrel = createBarrel("barrel", barrelSize, barrelLength, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        return source;
    }

    private _createBaseTankSource(sources: TransformNode): TransformNode {
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
                mesh: "barrel",
            }],
        };

        const source = new TransformNode("tankBase", this._scene);
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
                mesh: "barrel",
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
                mesh: "barrelL",
            }, {
                size: barrelSize,
                length: barrelLength,
                offset: new Vector3(barrelOffset, 0, 0),
                forward: new Vector3(0, 0, 1),
                mesh: "barrelR",
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
                mesh: "barrelF",
            }, {
                size: barrelSize,
                length: barrelLengthB,
                offset: new Vector3(0, 0, 0),
                forward: new Vector3(0, 0, -1),
                mesh: "barrelR",
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
                mesh: "barrel",
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

    private _createDirectorTankSource(sources: TransformNode): TransformNode {
        const barrelSize = { muzzle: 0.8, base: 0.25 };
        const barrelLength = 0.70;

        const metadata: TankMetadata = {
            size: 1,
            shieldSize: 1.75,
            barrels: [{
                size: barrelSize.muzzle,
                length: barrelLength,
                offset: new Vector3(0, 0, 0),
                forward: new Vector3(0, 0, 1),
                mesh: "barrel",
            }],
        };

        const source = new TransformNode("tankDirector", this._scene);
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

    private _createDroneSource(sources: TransformNode, name: string, material: Material): Mesh {
        const metadata: SizeMetadata = {
            size: 1,
        };

        const source = createTetrahedronBody(name, 1, this._scene);
        source.metadata = metadata;
        source.material = material;
        source.parent = sources;
        return source;
    }
}
