import { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Tools } from "@babylonjs/core/Misc/tools";
import { Scene } from "@babylonjs/core/scene";
import { createShadowMaterial } from "./materials/shadowMaterial";
import { BulletCrasherMetadata, CrasherMetadata, DroneCrasherMetadata, ShapeMetadata, SizeMetadata, PlayerTankMetadata, BossMetadata, BarrelMetadata, BossTankMetadata, LanceMetadata } from "./metadata";
import { Minimap } from "./minimap";
import { World } from "./worlds/world";

const CRASHER_SPEED = 5;
const CRASHER_PROJECTILE_RELOAD = 0.5;
const CRASHER_PROJECTILE_SPEED = 5;
const CRASHER_PROJECTILE_DAMAGE = 5;
const CRASHER_PROJECTILE_HEALTH = 8;

const MEGA_CRASHER_HEALTH = 300;
const MEGA_CRASHER_DAMAGE = 50;
const MEGA_CRASHER_POINTS = 100;

const MARKER_MAGNIFICATION = 3;

interface BarrelProperties {
    base: {
        diameter: number;
        length: number
    };
    muzzle?: {
        diameter: number;
        length: number;
    };
    variance?: number;
}

function createBarrel(name: string, properties: BarrelProperties, scene: Scene): Mesh {
    const base = properties.base;
    const muzzle = properties.muzzle;

    const metadata: BarrelMetadata = {
        diameter: muzzle ? muzzle.diameter : base.diameter,
        length: muzzle ? muzzle.length + base.length : base.length,
        variance: properties.variance,
    };

    const barrelBase = base.length ? (() => {
        const mesh = MeshBuilder.CreateCylinder(name, {
            tessellation: Math.round(36 * base.diameter),
            cap: muzzle ? Mesh.NO_CAP : Mesh.CAP_END,
            diameter: base.diameter,
            height: base.length,
        }, scene);

        mesh.rotation.x = Math.PI / 2;
        mesh.position.z = base.length / 2;
        mesh.bakeCurrentTransformIntoVertices();
        return mesh;
    })() : null;

    const barrelMuzzle = muzzle ? (() => {
        const mesh = MeshBuilder.CreateCylinder(name, {
            tessellation: Math.round(36 * Math.max(base.diameter, muzzle.diameter)),
            cap: Mesh.CAP_END,
            diameterBottom: base.diameter,
            diameterTop: muzzle.diameter,
            height: muzzle.length,
        }, scene);

        mesh.rotation.x = Math.PI / 2;
        mesh.position.z = base.length + muzzle.length / 2;
        mesh.bakeCurrentTransformIntoVertices();
        return mesh;
    })() : null;

    if (barrelBase && barrelMuzzle) {
        const barrel = Mesh.MergeMeshes([barrelBase, barrelMuzzle], true)!;
        barrel.name = name;
        barrel.metadata = metadata;
        return barrel;
    } else if (barrelBase) {
        barrelBase.metadata = metadata;
        return barrelBase;
    } else {
        barrelMuzzle!.metadata = metadata;
        return barrelMuzzle!;
    }
}

function createSimpleBarrel(name: string, diameter: number, length: number, scene: Scene): Mesh {
    return createBarrel(name, { base: { diameter: diameter, length: length } }, scene);
}

function createLance(name: string, diameter: number, length: number, scene: Scene): Mesh {
    const metadata: LanceMetadata = {
        diameter: diameter
    };

    const mesh = MeshBuilder.CreateCylinder(name, {
        tessellation: Math.round(36 * diameter),
        cap: Mesh.NO_CAP,
        height: length,
        diameterBottom: diameter,
        diameterTop: 0,
    }, scene);
    mesh.position.z = length / 2;
    mesh.rotation.x = Math.PI / 2;
    mesh.bakeCurrentTransformIntoVertices();
    mesh.position.z = 0.4;
    mesh.metadata = metadata;

    const midpoint = new TransformNode("midpoint", scene);
    midpoint.position.z = length / 2;
    midpoint.parent = mesh;

    const endpoint = new TransformNode("endpoint", scene);
    endpoint.position.z = length;
    endpoint.parent = mesh;

    return mesh;
}

function createTetrahedron(name: string, size: number, scene: Scene): Mesh {
    const mesh = MeshBuilder.CreatePolyhedron(name, { type: 0, size: size * 0.4 }, scene);
    mesh.rotation.z = Math.PI / 6;
    mesh.bakeCurrentTransformIntoVertices();
    return mesh;
}

function createSphere(name: string, size: number, scene: Scene): Mesh {
    return MeshBuilder.CreateSphere(name, { segments: 16 * size }, scene);
}

function createPrism(name: string, size: number, scene: Scene): Mesh {
    const outerRadius = 0.5;
    const innerRadius = 0.2;
    const angle = Math.PI / 3;
    const getPoint = (radius: number, angle: number) => new Vector3(-radius * Math.sin(angle), radius * Math.cos(angle), 0);
    const p0 = getPoint(outerRadius, angle * 0);
    const p1 = getPoint(innerRadius, angle * 1);
    const p2 = getPoint(outerRadius, angle * 2);
    const p3 = getPoint(innerRadius, angle * 3);
    const p4 = getPoint(outerRadius, angle * 4);
    const p5 = getPoint(innerRadius, angle * 5);
    const shape = [ p0, p1, p1, p2, p2, p3, p3, p4, p4, p5, p5, p0, ];
    const path = [ new Vector3(0, 0, -0.3), new Vector3(0, 0, 0.3) ];
    const mesh = MeshBuilder.ExtrudeShape(name, { shape: shape, path: path, cap: Mesh.CAP_ALL }, scene);
    mesh.rotation.x = Math.PI / 2;
    mesh.scaling.scaleInPlace(size * 1.2);
    mesh.bakeCurrentTransformIntoVertices();
    return mesh;
}

// function createTriangleMarker(name: string, size: number, scene: Scene): Mesh {
//     const marker = MeshBuilder.CreateDisc(name, { tessellation: 3 }, scene);
//     marker.rotation.x = Math.PI / 2;
//     marker.rotation.z = Math.PI / 2;
//     marker.scaling.scaleInPlace(size * MARKER_MAGNIFICATION);
//     marker.bakeCurrentTransformIntoVertices();
//     marker.layerMask = Minimap.LayerMask;
//     return marker;
// }

function createSquareMarker(name: string, size: number, scene: Scene): Mesh {
    const marker = MeshBuilder.CreateDisc(name, { tessellation: 4 }, scene);
    marker.rotation.x = Math.PI / 2;
    marker.rotation.z = Math.PI / 4;
    marker.scaling.scaleInPlace(size * MARKER_MAGNIFICATION);
    marker.bakeCurrentTransformIntoVertices();
    marker.layerMask = Minimap.LayerMask;
    return marker;
}

function createCircleMarker(name: string, size: number, scene: Scene): Mesh {
    const marker = MeshBuilder.CreateDisc(name, { tessellation: 16 * size }, scene);
    marker.rotation.x = Math.PI / 2;
    marker.scaling.scaleInPlace(size * MARKER_MAGNIFICATION);
    marker.bakeCurrentTransformIntoVertices();
    marker.layerMask = Minimap.LayerMask;
    return marker;
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
    };

    private readonly _adornment: {
        readonly shield: Mesh;
        readonly health: Mesh;
        readonly shadow: Mesh;
    };

    public readonly bullet: {
        readonly tank: Mesh;
        readonly crasher: Mesh;
        readonly boss: Mesh;
    };

    public readonly drone: {
        readonly tank: Mesh;
        readonly crasher: Mesh;
    };

    public readonly trap: {
        readonly tank: Mesh;
    }

    public readonly shape: {
        readonly cube: Mesh;
        readonly tetrahedron: Mesh;
        readonly dodecahedron: Mesh;
        readonly goldberg11: Mesh;
    };

    public readonly crasher: {
        readonly small: Mesh;
        readonly big: Mesh;
        readonly shooter: TransformNode;
        readonly destroyer: TransformNode;
        readonly twin: TransformNode;
        readonly drone: TransformNode;
    };

    public readonly boss: {
        readonly keeper: TransformNode;
    }

    public readonly tank: {
        readonly base: TransformNode;
        readonly sniper: TransformNode;
        readonly twin: TransformNode;
        readonly flankGuard: TransformNode;
        readonly pounder: TransformNode;
        readonly director: TransformNode;
        readonly trapper: TransformNode;
        readonly machineGun: TransformNode;
        readonly lancer: TransformNode;
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
            shadow: createShadowMaterial(this._scene),
        }

        const adornments = new TransformNode("adornments", this._scene);
        adornments.parent = sources;
        this._adornment = {
            shield: this._createShieldSource(adornments),
            health: this._createHealthSource(adornments),
            shadow: this._createShadowSource(adornments),
        };

        const bullets = new TransformNode("bullets", this._scene);
        bullets.parent = sources;
        this.bullet = {
            tank: this._createBulletSource(bullets, "tank", 8, this._materials.blue),
            crasher: this._createBulletSource(bullets, "crasher", 4, this._materials.pink),
            boss: this._createBulletSource(bullets, "boss", 8, this._materials.orange),
        };

        const drones = new TransformNode("drones", this._scene);
        drones.parent = sources;
        this.drone = {
            tank: this._createDroneSource(drones, "tank", this._materials.blue),
            crasher: this._createDroneSource(drones, "crasher", this._materials.pink),
        };

        const traps = new TransformNode("traps", this._scene);
        traps.parent = sources;
        this.trap = {
            tank: this._createTrapSource(traps, "tank", this._materials.blue),
        }

        const shapes = new TransformNode("shapes", this._scene);
        shapes.parent = sources;
        this.shape = {
            cube: this._createCubeShapeSource(shapes),
            tetrahedron: this._createTetrahedronShapeSource(shapes),
            dodecahedron: this._createDodecahedronShapeSource(shapes),
            goldberg11: this._createGoldberg11ShapeSource(shapes),
        };

        const crashers = new TransformNode("crashers", this._scene);
        crashers.parent = sources;
        this.crasher = {
            small: this._createSmallCrasherSource(crashers),
            big: this._createBigCrasherSource(crashers),
            shooter: this._createShooterCrasherSource(crashers),
            destroyer: this._createDestroyerCrasherSource(crashers),
            twin: this._createTwinCrasherSource(crashers),
            drone: this._createDroneCrasherSource(crashers),
        }

        const bosses = new TransformNode("bosses", this._scene);
        bosses.parent = sources;
        this.boss = {
            keeper: this._createKeeperBossSource(bosses),
        };

        const tanks = new TransformNode("tanks", this._scene);
        tanks.parent = sources;
        this.tank = {
            base: this._createBaseTankSource(tanks),
            sniper: this._createSniperTankSource(tanks),
            twin: this._createTwinTankSource(tanks),
            flankGuard: this._createFlankGuardTankSource(tanks),
            pounder: this._createPounderTankSource(tanks),
            director: this._createDirectorTankSource(tanks),
            trapper: this._createTrapperTankSource(tanks),
            machineGun: this._createMachineGunTankSource(tanks),
            lancer: this._createLancerTankSource(tanks),
        };
    }

    public createShield(parent?: TransformNode): Mesh {
        return this._createClone(this._adornment.shield, parent);
    }

    public createHealth(parent?: TransformNode): TransformNode {
        return this._createInstance(this._adornment.health, parent);
    }

    public createShadow(parent?: TransformNode): TransformNode {
        return this._createInstance(this._adornment.shadow, parent);
    }

    public create(source: TransformNode, parent?: TransformNode): TransformNode {
        if ((source as Mesh).getClassName() === "Mesh") {
            return this._createInstance(source as Mesh, parent);
        } else {
            return this._instantiateHeirarchy(source, parent);
        }
    }

    private _createMaterial(name: string, r: number, g: number, b: number): Material {
        const material = new StandardMaterial(name, this._scene);
        material.diffuseColor.set(r, g, b);
        return material;
    }

    private _createClone(source: Mesh, parent?: TransformNode): Mesh {
        const clone = source.clone(source.name, parent);
        this._initRotation(clone);
        this._initMesh(clone);
        clone.id = source.id;
        return clone;
    }

    private _createInstance(source: Mesh, parent?: TransformNode): InstancedMesh {
        const instance = source.createInstance(source.name);
        this._initRotation(instance);
        this._initMesh(instance);
        instance.id = source.id;
        instance.layerMask = source.layerMask;
        instance.metadata = source.metadata;
        instance.parent = parent || null;
        return instance;
    }

    private _instantiateHeirarchy(source: TransformNode, parent?: TransformNode): TransformNode {
        const instance = source.instantiateHierarchy(parent, undefined, (source, target) => {
            target.id = source.id;
            target.name = source.name;
            target.metadata = source.metadata;
            if ((target as AbstractMesh).layerMask && (source as AbstractMesh).layerMask) {
                (target as AbstractMesh).layerMask = (source as AbstractMesh).layerMask;
            }
        })!;
        this._initRotation(instance);
        for (const mesh of instance.getChildMeshes()) {
            this._initMesh(mesh);
        }
        instance.id = source.id;
        instance.name = source.name;
        instance.parent = parent || null;
        return instance;
    }

    private _initRotation(transformNode: TransformNode): void {
        transformNode.rotationQuaternion = transformNode.rotationQuaternion || Quaternion.FromEulerVector(transformNode.rotation);
    }

    private _initMesh(mesh: AbstractMesh): void {
        mesh.doNotSyncBoundingInfo = true;
        mesh.alwaysSelectAsActiveMesh = true;
    }

    private _createShieldSource(parent: TransformNode): Mesh {
        const source = MeshBuilder.CreateSphere("shield", { segments: 16 }, this._scene);
        source.parent = parent;
        return source;
    }

    private _createHealthSource(parent: TransformNode): Mesh {
        const source = MeshBuilder.CreatePlane("health", { width: 1, height: 0.08 }, this._scene);
        source.material = this._materials.green;
        source.parent = parent;
        return source;
    }

    private _createShadowSource(parent: TransformNode): Mesh {
        const source = MeshBuilder.CreatePlane("shadow", { size: 1 }, this._scene);
        source.rotation.x = Math.PI / 2;
        source.bakeCurrentTransformIntoVertices();
        source.material = this._materials.shadow;
        source.parent = parent;
        return source;
    }

    private _createBulletSource(parent: TransformNode, name: string, segments: number, material: Material): Mesh {
        const metadata: SizeMetadata = {
            size: 1,
        };

        const source = MeshBuilder.CreateSphere(name, { segments: segments }, this._scene);
        source.metadata = metadata;
        source.material = material;
        source.parent = parent;
        return source;
    }

    private _createDroneSource(parent: TransformNode, name: string, material: Material): Mesh {
        const metadata: SizeMetadata = {
            size: 1,
        };

        const source = createTetrahedron(name, metadata.size, this._scene);
        source.metadata = metadata;
        source.material = material;
        source.parent = parent;
        return source;
    }

    private _createTrapSource(parent: TransformNode, name: string, material: Material): Mesh {
        const metadata: SizeMetadata = {
            size: 1,
        };

        const source = createPrism(name, metadata.size, this._scene);
        source.metadata = metadata;
        source.material = material;
        source.parent = parent;
        return source;
    }

    private _createCubeShapeSource(parent: TransformNode): Mesh {
        const metadata: ShapeMetadata = {
            displayName: "Cube",
            size: 0.6,
            health: 10,
            damage: 10,
            points: 10,
        };

        const source = MeshBuilder.CreateBox("cube", { size: 0.4 }, this._scene);
        source.rotation.x = Math.atan(1 / Math.sqrt(2));
        source.rotation.z = Math.PI / 4;
        source.bakeCurrentTransformIntoVertices();
        source.metadata = metadata;
        source.material = this._materials.yellow;
        source.parent = parent;
        return source;
    }

    private _createTetrahedronShapeSource(parent: TransformNode): Mesh {
        const metadata: ShapeMetadata = {
            displayName: "Tetrahedron",
            size: 0.75,
            health: 30,
            damage: 20,
            points: 25,
        };

        const source = MeshBuilder.CreatePolyhedron("tetrahedron", { type: 0, size: metadata.size / 3 }, this._scene);
        source.position.y = -0.1;
        source.rotation.x = -Math.PI / 2;
        source.bakeCurrentTransformIntoVertices();
        source.metadata = metadata;
        source.material = this._materials.orange;
        source.parent = parent;
        return source;
    }

    private _createDodecahedronShapeSource(parent: TransformNode): Mesh {
        const metadata: ShapeMetadata = {
            displayName: "Dodecahedron",
            size: 1,
            health: 125,
            damage: 50,
            points: 120,
        };

        const source = MeshBuilder.CreatePolyhedron("dodecahedron", { type: 2, size: 0.5 }, this._scene);
        source.rotation.x = Math.PI / 2;
        source.bakeCurrentTransformIntoVertices();
        source.metadata = metadata;
        source.material = this._materials.purple;
        source.parent = parent;
        return source;
    }

    private _createGoldberg11ShapeSource(parent: TransformNode): Mesh {
        const metadata: ShapeMetadata = {
            displayName: "Truncated Isocahedron",
            size: 1.62,
            health: 250,
            damage: 50,
            points: 200,
        };

        const source = MeshBuilder.CreateGoldberg("goldberg11", { m: 1, n: 1, size: 0.9 }, this._scene);
        source.material = this._materials.green;
        source.metadata = metadata;
        source.parent = parent;
        return source;
    }

    private _createSmallCrasherSource(parent: TransformNode): Mesh {
        const metadata: CrasherMetadata = {
            displayName: "Small Crasher",
            size: 0.5,
            speed: CRASHER_SPEED,
            health: 10,
            damage: 20,
            points: 10,
        };

        const source = createTetrahedron("small", metadata.size, this._scene);
        source.metadata = metadata;
        source.material = this._materials.pink;
        source.parent = parent;
        return source;
    }

    private _createBigCrasherSource(parent: TransformNode): Mesh {
        const metadata: CrasherMetadata = {
            displayName: "Big Crasher",
            size: 0.7,
            speed: CRASHER_SPEED,
            health: 20,
            damage: 40,
            points: 25,
        };

        const source = createTetrahedron("big", metadata.size, this._scene);
        source.metadata = metadata;
        source.material = this._materials.pink;
        source.parent = parent;
        return source;
    }

    private _createShooterCrasherSource(parent: TransformNode): TransformNode {
        const metadata: BulletCrasherMetadata = {
            displayName: "Shooter Crasher",
            size: 0.7,
            speed: CRASHER_SPEED * 1.1,
            health: 20,
            damage: 30,
            points: 50,
            reload: CRASHER_PROJECTILE_RELOAD,
            barrels: ["barrel"],
            bullet: {
                speed: CRASHER_PROJECTILE_SPEED,
                damage: CRASHER_PROJECTILE_DAMAGE,
                damageTime: 0.2,
                health: CRASHER_PROJECTILE_HEALTH,
            },
        };

        const source = new TransformNode("shooter", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createTetrahedron("body", metadata.size, this._scene);
        body.material = this._materials.pink;
        body.parent = source;

        const barrel = createSimpleBarrel("barrel", 0.2, 0.5, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        return source;
    }

    private _createDestroyerCrasherSource(parent: TransformNode): TransformNode {
        const metadata: BulletCrasherMetadata = {
            displayName: "Destroyer Crasher",
            size: 1.4,
            speed: CRASHER_SPEED * 0.6,
            health: MEGA_CRASHER_HEALTH,
            damage: MEGA_CRASHER_DAMAGE,
            points: MEGA_CRASHER_POINTS,
            reload: CRASHER_PROJECTILE_RELOAD * 2,
            barrels: ["barrel"],
            bullet: {
                speed: CRASHER_PROJECTILE_SPEED,
                damage: CRASHER_PROJECTILE_DAMAGE * 2,
                damageTime: 0.2,
                health: CRASHER_PROJECTILE_HEALTH,
            },
        };

        const source = new TransformNode("destroyer", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createTetrahedron("body", metadata.size, this._scene);
        body.material = this._materials.pink;
        body.parent = source;

        const barrel = createSimpleBarrel("barrel", 0.4, 1.1, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        return source;
    }

    private _createTwinCrasherSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.4;
        const barrelLength = 1.1;
        const barrelOffset = barrelDiameter * 0.51;

        const metadata: BulletCrasherMetadata = {
            displayName: "Twin Crasher",
            size: 1.4,
            speed: CRASHER_SPEED * 0.7,
            health: MEGA_CRASHER_HEALTH,
            damage: MEGA_CRASHER_DAMAGE,
            points: MEGA_CRASHER_POINTS,
            reload: CRASHER_PROJECTILE_RELOAD * 0.5,
            barrels: ["barrelL", "barrelR"],
            bullet: {
                speed: CRASHER_PROJECTILE_SPEED,
                damage: CRASHER_PROJECTILE_DAMAGE,
                damageTime: 0.2,
                health: CRASHER_PROJECTILE_HEALTH,
            },
        };

        const source = new TransformNode("twin", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createTetrahedron("body", metadata.size, this._scene);
        body.material = this._materials.pink;
        body.parent = source;

        const barrelL = createSimpleBarrel("barrelL", barrelDiameter, barrelLength, this._scene);
        barrelL.position.x = -barrelOffset;
        barrelL.material = this._materials.gray;
        barrelL.parent = source;

        const barrelR = createSimpleBarrel("barrelR", barrelDiameter, barrelLength, this._scene);
        barrelR.position.x = +barrelOffset;
        barrelR.material = this._materials.gray;
        barrelR.parent = source;

        return source;
    }

    private _createDroneCrasherSource(parent: TransformNode): TransformNode {
        const barrelProperties = {
            base: { diameter: 0.25, length: 0 },
            muzzle: { diameter: 0.8, length: 0.7 },
        };

        const metadata: DroneCrasherMetadata = {
            displayName: "Drone Crasher",
            size: 1.4,
            speed: CRASHER_SPEED * 0.5,
            health: MEGA_CRASHER_HEALTH,
            damage: MEGA_CRASHER_DAMAGE,
            points: MEGA_CRASHER_POINTS,
            reload: CRASHER_PROJECTILE_RELOAD * 4,
            barrels: ["barrel"],
            drone: {
                speed: CRASHER_PROJECTILE_SPEED,
                damage: CRASHER_PROJECTILE_DAMAGE,
                damageTime: 0.2,
                health: CRASHER_PROJECTILE_HEALTH * 1.25,
            },
        };

        const source = new TransformNode("drone", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createTetrahedron("body", metadata.size, this._scene);
        body.material = this._materials.pink;
        body.parent = source;

        const barrel = createBarrel("barrel", barrelProperties, this._scene);
        barrel.rotationQuaternion = Quaternion.RotationYawPitchRoll(Math.PI, 0, 0);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        return source;
    }

    private _createKeeperBossSource(parent: TransformNode): TransformNode {
        const bodyWidth = 3;
        const bodyHeight = 1.3;

        const barrelDiameter = 0.55;
        const barrelLength = 0.75;

        const metadata: BossMetadata = {
            displayName: "Keeper",
            size: 4,
            height: 2,
            speed: 1,
            health: 2000,
            damage: 40,
            points: 300,
            tanks: ["tank0", "tank1", "tank2", "tank3"],
        };

        const tankMetadata: BossTankMetadata = {
            reload: 1,
            barrels: ["barrel"],
            bullet: {
                speed: 8,
                damage: 20,
                damageTime: 0.2,
                health: 100,
            },
        };

        const source = new TransformNode("keeper", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = MeshBuilder.CreateBox("body", { width: bodyWidth, height: bodyHeight, depth: bodyWidth }, this._scene);
        body.material = this._materials.orange;
        body.parent = source;

        const angle = Math.PI * 0.25;
        const tankTransforms = [{
            position: new Vector3(bodyWidth, 0, bodyWidth).scaleInPlace(0.5),
            rotation: Quaternion.FromEulerAngles(0, angle, 0),
        }, {
            position: new Vector3(bodyWidth, 0, -bodyWidth).scaleInPlace(0.5),
            rotation: Quaternion.FromEulerAngles(0, angle * 3, 0),
        }, {
            position: new Vector3(-bodyWidth, 0, -bodyWidth).scaleInPlace(0.5),
            rotation: Quaternion.FromEulerAngles(0, angle * 5, 0),
        }, {
            position: new Vector3(-bodyWidth, 0, bodyWidth).scaleInPlace(0.5),
            rotation: Quaternion.FromEulerAngles(0, angle * 7, 0),
        }];

        for (let index = 0; index < tankTransforms.length; ++index) {
            const tankNodeName = metadata.tanks[index]!;
            const tankTransform = tankTransforms[index]!;

            const offset = new TransformNode("offset");
            offset.position.copyFrom(tankTransform.position);
            offset.rotationQuaternion = tankTransform.rotation;
            offset.parent = body;

            const tank = new TransformNode(tankNodeName);
            tank.rotationQuaternion = Quaternion.Identity();
            tank.metadata = tankMetadata;
            tank.parent = offset;

            const tankBody = createSphere("body", 1, this._scene);
            tankBody.material = this._materials.orange;
            tankBody.parent = tank;

            const barrel = createSimpleBarrel("barrel", barrelDiameter, barrelLength, this._scene);
            barrel.material = this._materials.gray;
            barrel.parent = tank;
        }

        const marker = createSquareMarker("marker", bodyWidth, this._scene);
        marker.material = this._materials.orange;
        marker.parent = source;

        return source;
    }

    private _createBaseTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.45;
        const barrelLength = 0.75;

        const metadata: PlayerTankMetadata = {
            displayName: "Tank",
            size: 1,
            barrels: ["barrel"],
            multiplier: {},
        };

        const source = new TransformNode("base", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createSphere("body", metadata.size, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrel = createSimpleBarrel("barrel", barrelDiameter, barrelLength, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        const marker = createCircleMarker("marker", metadata.size, this._scene);
        marker.material = this._materials.blue;
        marker.parent = source;

        return source;
    }

    private _createSniperTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.4;
        const barrelLength = 0.9;

        const metadata: PlayerTankMetadata = {
            displayName: "Sniper",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                weaponSpeed: 2,
                reloadTime: 2,
            },
        };

        const source = new TransformNode("sniper", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createSphere("body", metadata.size, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrel = createSimpleBarrel("barrel", barrelDiameter, barrelLength, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        const marker = createCircleMarker("marker", metadata.size, this._scene);
        marker.material = this._materials.blue;
        marker.parent = source;

        return source;
    }

    private _createTwinTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.4;
        const barrelLength = 0.75;
        const barrelOffset = barrelDiameter * 0.51;

        const metadata: PlayerTankMetadata = {
            displayName: "Twin",
            size: 1,
            barrels: ["barrelL", "barrelR"],
            multiplier: {
                reloadTime: 0.6,
            },
        };

        const source = new TransformNode("twin", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createSphere("body", metadata.size, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrelL = createSimpleBarrel("barrelL", barrelDiameter, barrelLength, this._scene);
        barrelL.position.x = -barrelOffset;
        barrelL.material = this._materials.gray;
        barrelL.parent = source;

        const barrelR = createSimpleBarrel("barrelR", barrelDiameter, barrelLength, this._scene);
        barrelR.position.x = +barrelOffset;
        barrelR.material = this._materials.gray;
        barrelR.parent = source;

        const marker = createCircleMarker("marker", metadata.size, this._scene);
        marker.material = this._materials.blue;
        marker.parent = source;

        return source;
    }

    private _createFlankGuardTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.45;
        const barrelLengthF = 0.75;
        const barrelLengthB = 0.65;

        const metadata: PlayerTankMetadata = {
            displayName: "Flank Guard",
            size: 1,
            barrels: ["barrelF", "barrelR"],
            multiplier: {},
        };

        const source = new TransformNode("flankGuard", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createSphere("body", metadata.size, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrelF = createSimpleBarrel("barrelF", barrelDiameter, barrelLengthF, this._scene);
        barrelF.material = this._materials.gray;
        barrelF.parent = source;

        const barrelB = createSimpleBarrel("barrelR", barrelDiameter, barrelLengthB, this._scene);
        barrelB.rotationQuaternion = Quaternion.RotationYawPitchRoll(Math.PI, 0, 0);
        barrelB.material = this._materials.gray;
        barrelB.parent = source;

        const marker = createCircleMarker("marker", metadata.size, this._scene);
        marker.material = this._materials.blue;
        marker.parent = source;

        return source;
    }

    private _createPounderTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.55;
        const barrelLength = 0.75;

        const metadata: PlayerTankMetadata = {
            displayName: "Pounder",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                weaponDamage: 2,
                weaponHealth: 2,
                reloadTime: 2,
            },
        };

        const source = new TransformNode("pounder", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createSphere("body", metadata.size, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrel = createSimpleBarrel("barrel", barrelDiameter, barrelLength, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        const marker = createCircleMarker("marker", metadata.size, this._scene);
        marker.material = this._materials.blue;
        marker.parent = source;

        return source;
    }

    private _createDirectorTankSource(parent: TransformNode): TransformNode {
        const barrelProperties = {
            base: { diameter: 0.25, length: 0 },
            muzzle: { diameter: 0.8, length: 0.7 },
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Director",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                weaponSpeed: 0.5,
                reloadTime: 3,
            },
        };

        const source = new TransformNode("director", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createSphere("body", metadata.size, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrel = createBarrel("barrel", barrelProperties, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        const marker = createCircleMarker("marker", metadata.size, this._scene);
        marker.material = this._materials.blue;
        marker.parent = source;

        return source;
    }

    private _createTrapperTankSource(parent: TransformNode): TransformNode {
        const barrelProperties = {
            base: { diameter: 0.4, length: 0.52 },
            muzzle: { diameter: 0.8, length: 0.18 },
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Trapper",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                reloadTime: 2,
                weaponSpeed: 0.8,
                weaponDamage: 3,
                weaponHealth: 3,
            },
        };

        const source = new TransformNode("trapper", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createSphere("body", metadata.size, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrel = createBarrel("barrel", barrelProperties, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        const marker = createCircleMarker("marker", metadata.size, this._scene);
        marker.material = this._materials.blue;
        marker.parent = source;

        return source;
    }

    private _createMachineGunTankSource(parent: TransformNode): TransformNode {
        const barrelProperties = {
            base: { diameter: 0.45, length: 0.4 },
            muzzle: { diameter: 0.6, length: 0.35 },
            variance: Tools.ToRadians(15),
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Machine Gun",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                weaponHealth: 0.5,
                reloadTime: 0.6,
            },
        };

        const source = new TransformNode("machineGun", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createSphere("body", metadata.size, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrel = createBarrel("barrel", barrelProperties, this._scene);
        barrel.metadata.diameter = barrelProperties.base.diameter;
        barrel.material = this._materials.gray;
        barrel.parent = source;

        const marker = createCircleMarker("marker", metadata.size, this._scene);
        marker.material = this._materials.blue;
        marker.parent = source;

        return source;
    }

    private _createLancerTankSource(parent: TransformNode): TransformNode {
        const lanceDiameter = 0.6;
        const lanceLength = 0.6;

        const metadata: PlayerTankMetadata = {
            displayName: "Lancer",
            size: 1,
            lances: ["lance"],
            multiplier: {
                weaponDamage: 4,
                weaponHealth: 2,
            },
        };

        const source = new TransformNode("lancer", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createSphere("body", metadata.size, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const lance = createLance("lance", lanceDiameter, lanceLength, this._scene);
        lance.position.z = 0.4;
        lance.material = this._materials.gray;
        lance.parent = source;

        const marker = createCircleMarker("marker", metadata.size, this._scene);
        marker.material = this._materials.blue;
        marker.parent = source;

        return source;
    }
}
