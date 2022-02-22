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
import { BulletCrasherMetadata, CrasherMetadata, DroneCrasherMetadata, ShapeMetadata, SizeMetadata, PlayerTankMetadata, BossMetadata } from "./metadata";
import { World } from "./world";

const CRASHER_SPEED = 5;
const CRASHER_PROJECTILE_RELOAD = 0.5;
const CRASHER_PROJECTILE_SPEED = 5;
const CRASHER_PROJECTILE_DAMAGE = 5;
const CRASHER_PROJECTILE_HEALTH = 8;

const MEGA_CRASHER_HEALTH = 300;
const MEGA_CRASHER_DAMAGE = 50;
const MEGA_CRASHER_POINTS = 100;

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
    const body = MeshBuilder.CreatePolyhedron(name, { type: 0, size: size * 0.4 }, scene);
    body.rotation.z = Math.PI / 6;
    body.bakeCurrentTransformIntoVertices();
    return body;
}

function createSphereBody(name: string, size: number, scene: Scene): Mesh {
    return MeshBuilder.CreateSphere(name, { segments: 16 * size }, scene);
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

        const shapes = new TransformNode("shapes", this._scene);
        shapes.parent = sources;
        this.shape = {
            cube: this._createCubeSource(shapes),
            tetrahedron: this._createTetrahedronSource(shapes),
            dodecahedron: this._createDodecahedronSource(shapes),
            goldberg11: this._createGoldberg11Source(shapes),
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

    private _createClone(source: Mesh, parent?: TransformNode): Mesh {
        const clone = source.clone(source.name, parent);
        clone.rotationQuaternion = clone.rotationQuaternion || Quaternion.FromEulerVector(clone.rotation);
        this._initMesh(clone);
        return clone;
    }

    private _createInstance(source: Mesh, parent?: TransformNode): InstancedMesh {
        const instance = source.createInstance(source.name);
        instance.rotationQuaternion = instance.rotationQuaternion || Quaternion.FromEulerVector(instance.rotation);
        this._initMesh(instance);
        instance.metadata = source.metadata;
        instance.parent = parent || null;
        return instance;
    }

    private _instantiateHeirarchy(source: TransformNode, parent?: TransformNode): TransformNode {
        const instance = source.instantiateHierarchy(parent, undefined, (source, clone) => clone.name = source.name)!;
        instance.rotationQuaternion = instance.rotationQuaternion || Quaternion.FromEulerVector(instance.rotation);
        for (const mesh of instance.getChildMeshes()) {
            this._initMesh(mesh);
        }
        instance.name = source.name;
        instance.parent = parent || null;
        return instance;
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
        const metadata: Readonly<SizeMetadata> = {
            size: 1,
        };

        const source = MeshBuilder.CreateSphere(name, { segments: segments }, this._scene);
        source.metadata = metadata;
        source.material = material;
        source.parent = parent;
        return source;
    }

    private _createDroneSource(parent: TransformNode, name: string, material: Material): Mesh {
        const metadata: Readonly<SizeMetadata> = {
            size: 1,
        };

        const source = createTetrahedronBody(name, metadata.size, this._scene);
        source.metadata = metadata;
        source.material = material;
        source.parent = parent;
        return source;
    }

    private _createCubeSource(parent: TransformNode): Mesh {
        const metadata: Readonly<ShapeMetadata> = {
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

    private _createTetrahedronSource(parent: TransformNode): Mesh {
        const metadata: Readonly<ShapeMetadata> = {
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

    private _createDodecahedronSource(parent: TransformNode): Mesh {
        const metadata: Readonly<ShapeMetadata> = {
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

    private _createGoldberg11Source(parent: TransformNode): Mesh {
        const metadata: Readonly<ShapeMetadata> = {
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
        const metadata: Readonly<CrasherMetadata> = {
            displayName: "Small Crasher",
            size: 0.5,
            speed: CRASHER_SPEED,
            health: 10,
            damage: 20,
            points: 10,
        };

        const source = createTetrahedronBody("small", metadata.size, this._scene);
        source.metadata = metadata;
        source.material = this._materials.pink;
        source.parent = parent;
        return source;
    }

    private _createBigCrasherSource(parent: TransformNode): Mesh {
        const metadata: Readonly<CrasherMetadata> = {
            displayName: "Big Crasher",
            size: 0.7,
            speed: CRASHER_SPEED,
            health: 20,
            damage: 40,
            points: 25,
        };

        const source = createTetrahedronBody("big", metadata.size, this._scene);
        source.metadata = metadata;
        source.material = this._materials.pink;
        source.parent = parent;
        return source;
    }

    private _createShooterCrasherSource(parent: TransformNode): TransformNode {
        const metadata: Readonly<BulletCrasherMetadata> = {
            displayName: "Shooter Crasher",
            size: 0.7,
            speed: CRASHER_SPEED * 1.1,
            health: 20,
            damage: 30,
            points: 50,
            reload: CRASHER_PROJECTILE_RELOAD,
            barrels: [{
                nodeName: "barrel",
                diameter: 0.2,
                length: 0.5,
            }],
            bullet: {
                speed: CRASHER_PROJECTILE_SPEED,
                damage: CRASHER_PROJECTILE_DAMAGE,
                health: CRASHER_PROJECTILE_HEALTH,
            },
        };

        const source = new TransformNode("shooter", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createTetrahedronBody("body", metadata.size, this._scene);
        body.material = this._materials.pink;
        body.parent = source;

        const barrelMetadata = metadata.barrels[0]!;
        const barrel = createBarrel("barrel", barrelMetadata.diameter, barrelMetadata.length, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        return source;
    }

    private _createDestroyerCrasherSource(parent: TransformNode): TransformNode {
        const metadata: Readonly<BulletCrasherMetadata> = {
            displayName: "Destroyer Crasher",
            size: 1.4,
            speed: CRASHER_SPEED * 0.6,
            health: MEGA_CRASHER_HEALTH,
            damage: MEGA_CRASHER_DAMAGE,
            points: MEGA_CRASHER_POINTS,
            reload: CRASHER_PROJECTILE_RELOAD * 2,
            barrels: [{
                nodeName: "barrel",
                diameter: 0.4,
                length: 1.1,
            }],
            bullet: {
                speed: CRASHER_PROJECTILE_SPEED,
                damage: CRASHER_PROJECTILE_DAMAGE * 2,
                health: CRASHER_PROJECTILE_HEALTH,
            },
        };

        const source = new TransformNode("destroyer", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createTetrahedronBody("body", metadata.size, this._scene);
        body.material = this._materials.pink;
        body.parent = source;

        const barrelMetadata = metadata.barrels[0]!;
        const barrel = createBarrel("barrel", barrelMetadata.diameter, barrelMetadata.length, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        return source;
    }

    private _createTwinCrasherSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.4;
        const barrelLength = 1.1;
        const barrelOffset = barrelDiameter * 0.51;

        const metadata: Readonly<BulletCrasherMetadata> = {
            displayName: "Twin Crasher",
            size: 1.4,
            speed: CRASHER_SPEED * 0.7,
            health: MEGA_CRASHER_HEALTH,
            damage: MEGA_CRASHER_DAMAGE,
            points: MEGA_CRASHER_POINTS,
            reload: CRASHER_PROJECTILE_RELOAD * 0.5,
            barrels: [{
                nodeName: "barrelL",
                diameter: barrelDiameter,
                length: barrelLength,
            }, {
                nodeName: "barrelR",
                diameter: barrelDiameter,
                length: barrelLength,
            }],
            bullet: {
                speed: CRASHER_PROJECTILE_SPEED,
                damage: CRASHER_PROJECTILE_DAMAGE,
                health: CRASHER_PROJECTILE_HEALTH,
            },
        };

        const source = new TransformNode("twin", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createTetrahedronBody("body", metadata.size, this._scene);
        body.material = this._materials.pink;
        body.parent = source;

        const barrelL = createBarrel("barrelL", barrelDiameter, barrelLength, this._scene);
        barrelL.position.x = -barrelOffset;
        barrelL.material = this._materials.gray;
        barrelL.parent = source;

        const barrelR = createBarrel("barrelR", barrelDiameter, barrelLength, this._scene);
        barrelR.position.x = +barrelOffset;
        barrelR.material = this._materials.gray;
        barrelR.parent = source;

        return source;
    }

    private _createDroneCrasherSource(parent: TransformNode): TransformNode {
        const barrelDiameter = { muzzle: 0.8, base: 0.25 };
        const barrelLength = 0.70;

        const metadata: Readonly<DroneCrasherMetadata> = {
            displayName: "Drone Crasher",
            size: 1.4,
            speed: CRASHER_SPEED * 0.5,
            health: MEGA_CRASHER_HEALTH,
            damage: MEGA_CRASHER_DAMAGE,
            points: MEGA_CRASHER_POINTS,
            reload: CRASHER_PROJECTILE_RELOAD * 4,
            barrels: [{
                nodeName: "barrel",
                diameter: barrelDiameter.muzzle,
                length: barrelLength,
            }],
            drone: {
                speed: CRASHER_PROJECTILE_SPEED,
                damage: CRASHER_PROJECTILE_DAMAGE,
                health: CRASHER_PROJECTILE_HEALTH * 1.25,
            },
        };

        const source = new TransformNode("drone", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createTetrahedronBody("body", metadata.size, this._scene);
        body.material = this._materials.pink;
        body.parent = source;

        const barrel = createBarrel("barrel", barrelDiameter, barrelLength, this._scene);
        barrel.rotationQuaternion = Quaternion.RotationYawPitchRoll(Math.PI, 0, 0);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        return source;
    }

    private _createKeeperBossSource(parent: TransformNode): TransformNode {
        const bodyWidth = 3;
        const bodyHeight = 1.3;
        const bodyDepth = 3;

        const barrelDiameter = 0.55;
        const barrelLength = 0.75;

        const tank = {
            reload: 1,
            barrels: [{
                nodeName: "barrel",
                diameter: barrelDiameter,
                length: barrelLength,
            }],
            bullet: {
                speed: 5,
                damage: 20,
                health: 20,
            },
        };

        const metadata: Readonly<BossMetadata> = {
            displayName: "Keeper",
            size: 4,
            speed: 1,
            health: 1000,
            damage: 40,
            points: 500,
            tanks: [
                { nodeName: "tank0", ...tank },
                { nodeName: "tank1", ...tank },
                { nodeName: "tank2", ...tank },
                { nodeName: "tank3", ...tank },
            ],
        };

        const source = new TransformNode("keeper", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = MeshBuilder.CreateBox("body", { width: bodyWidth, height: bodyHeight, depth: bodyDepth }, this._scene);
        body.material = this._materials.orange;
        body.parent = source;

        const angle = Math.PI * 0.25;
        const tankTransforms = [{
            position: new Vector3(bodyWidth, 0, bodyDepth).scaleInPlace(0.5),
            rotation: Quaternion.FromEulerAngles(0, angle, 0),
        }, {
            position: new Vector3(bodyWidth, 0, -bodyDepth).scaleInPlace(0.5),
            rotation: Quaternion.FromEulerAngles(0, angle * 3, 0),
        }, {
            position: new Vector3(-bodyWidth, 0, -bodyDepth).scaleInPlace(0.5),
            rotation: Quaternion.FromEulerAngles(0, angle * 5, 0),
        }, {
            position: new Vector3(-bodyWidth, 0, bodyDepth).scaleInPlace(0.5),
            rotation: Quaternion.FromEulerAngles(0, angle * 7, 0),
        }];

        for (let index = 0; index < tankTransforms.length; ++index) {
            const tankMetadata = metadata.tanks[index]!;
            const tankTransform = tankTransforms[index]!;

            const offset = new TransformNode("offset");
            offset.position.copyFrom(tankTransform.position);
            offset.rotationQuaternion = tankTransform.rotation;
            offset.parent = body;

            const tank = new TransformNode(tankMetadata.nodeName);
            tank.rotationQuaternion = Quaternion.Identity();
            tank.parent = offset;

            const tankBody = createSphereBody("body", 1, this._scene);
            tankBody.material = this._materials.orange;
            tankBody.parent = tank;

            const barrel = createBarrel("barrel", barrelDiameter, barrelLength, this._scene);
            barrel.material = this._materials.gray;
            barrel.parent = tank;
        }

        return source;
    }

    private _createBaseTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.45;
        const barrelLength = 0.75;

        const metadata: Readonly<PlayerTankMetadata> = {
            displayName: "Tank",
            size: 1,
            shieldSize: 1.75,
            barrels: [{
                nodeName: "barrel",
                diameter: barrelDiameter,
                length: barrelLength,
            }],
            multiplier: {},
        };

        const source = new TransformNode("base", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createSphereBody("body", metadata.size, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrel = createBarrel("barrel", barrelDiameter, barrelLength, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        return source;
    }

    private _createSniperTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.4;
        const barrelLength = 0.9;

        const metadata: Readonly<PlayerTankMetadata> = {
            displayName: "Sniper",
            size: 1,
            shieldSize: 2,
            barrels: [{
                nodeName: "barrel",
                diameter: barrelDiameter,
                length: barrelLength,
            }],
            multiplier: {
                projectileSpeed: 2,
                reloadTime: 2,
            },
        };

        const source = new TransformNode("sniper", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createSphereBody("body", metadata.size, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrel = createBarrel("barrel", barrelDiameter, barrelLength, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        return source;
    }

    private _createTwinTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.4;
        const barrelLength = 0.75;
        const barrelOffset = barrelDiameter * 0.51;

        const metadata: Readonly<PlayerTankMetadata> = {
            displayName: "Twin",
            size: 1,
            shieldSize: 1.75,
            barrels: [{
                nodeName: "barrelL",
                diameter: barrelDiameter,
                length: barrelLength,
            }, {
                nodeName: "barrelR",
                diameter: barrelDiameter,
                length: barrelLength,
            }],
            multiplier: {
                reloadTime: 0.6,
            },
        };

        const source = new TransformNode("twin", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createSphereBody("body", metadata.size, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrelL = createBarrel("barrelL", barrelDiameter, barrelLength, this._scene);
        barrelL.position.x = -barrelOffset;
        barrelL.material = this._materials.gray;
        barrelL.parent = source;

        const barrelR = createBarrel("barrelR", barrelDiameter, barrelLength, this._scene);
        barrelR.position.x = +barrelOffset;
        barrelR.material = this._materials.gray;
        barrelR.parent = source;

        return source;
    }

    private _createFlankGuardTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.45;
        const barrelLengthF = 0.75;
        const barrelLengthB = 0.65;

        const metadata: Readonly<PlayerTankMetadata> = {
            displayName: "Flank Guard",
            size: 1,
            shieldSize: 1.75,
            barrels: [{
                nodeName: "barrelF",
                diameter: barrelDiameter,
                length: barrelLengthF,
            }, {
                nodeName: "barrelR",
                diameter: barrelDiameter,
                length: barrelLengthB,
            }],
            multiplier: {},
        };

        const source = new TransformNode("flankGuard", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createSphereBody("body", metadata.size, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrelF = createBarrel("barrelF", barrelDiameter, barrelLengthF, this._scene);
        barrelF.material = this._materials.gray;
        barrelF.parent = source;

        const barrelB = createBarrel("barrelR", barrelDiameter, barrelLengthB, this._scene);
        barrelB.rotationQuaternion = Quaternion.RotationYawPitchRoll(Math.PI, 0, 0);
        barrelB.material = this._materials.gray;
        barrelB.parent = source;

        return source;
    }

    private _createPounderTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.55;
        const barrelLength = 0.75;

        const metadata: Readonly<PlayerTankMetadata> = {
            displayName: "Pounder",
            size: 1,
            shieldSize: 1.75,
            barrels: [{
                nodeName: "barrel",
                diameter: barrelDiameter,
                length: barrelLength,
            }],
            multiplier: {
                projectileDamage: 2,
                projectileHealth: 2,
                reloadTime: 2,
            },
        };

        const source = new TransformNode("pounder", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createSphereBody("body", metadata.size, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrel = createBarrel("barrel", barrelDiameter, barrelLength, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        return source;
    }

    private _createDirectorTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = { muzzle: 0.8, base: 0.25 };
        const barrelLength = 0.70;

        const metadata: Readonly<PlayerTankMetadata> = {
            displayName: "Director",
            size: 1,
            shieldSize: 1.75,
            barrels: [{
                nodeName: "barrel",
                diameter: barrelDiameter.muzzle,
                length: barrelLength,
            }],
            multiplier: {
                projectileSpeed: 0.5,
                reloadTime: 3,
            },
        };

        const source = new TransformNode("director", this._scene);
        source.metadata = metadata;
        source.parent = parent;

        const body = createSphereBody("body", metadata.size, this._scene);
        body.material = this._materials.blue;
        body.parent = source;

        const barrel = createBarrel("barrel", barrelDiameter, barrelLength, this._scene);
        barrel.material = this._materials.gray;
        barrel.parent = source;

        return source;
    }
}
