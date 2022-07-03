import { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Tools } from "@babylonjs/core/Misc/tools";
import { Scene } from "@babylonjs/core/scene";
import { DeepImmutable } from "@babylonjs/core/types";
import { WeaponProperties } from "./components/weapon";
import { createShadowMaterial } from "./materials/shadowMaterial";
import { BarrelMetadata, BarrelProjectileMetadata, BombMetadata, BossMetadata, BossTankMetadata, BulletCrasherMetadata, CrasherMetadata, DroneCrasherMetadata, LanceMetadata, PlayerTankMetadata, ShapeMetadata, ShieldMetadata, SizeMetadata } from "./metadata";
import { Minimap } from "./minimap";
import { World } from "./worlds/world";

const CRASHER_SPEED = 5;
const CRASHER_PROJECTILE_RELOAD = 0.5;
const CRASHER_PROJECTILE_SPEED = 5;
const CRASHER_PROJECTILE_DAMAGE_VALUE = 5;
const CRASHER_PROJECTILE_DAMAGE_TIME = 0.2;
const CRASHER_PROJECTILE_HEALTH = 8;

const MEGA_CRASHER_HEALTH = 300;
const MEGA_CRASHER_DAMAGE = 50;
const MEGA_CRASHER_POINTS = 100;

const MARKER_SCALE = 3;

function initRotation(transformNode: TransformNode): void {
    transformNode.rotationQuaternion = transformNode.rotationQuaternion || Quaternion.FromEulerVector(transformNode.rotation);
}

function initMesh(mesh: AbstractMesh): void {
    mesh.doNotSyncBoundingInfo = true;
    mesh.alwaysSelectAsActiveMesh = true;
}

function instantiate(source: TransformNode, parent?: TransformNode): TransformNode {
    const instance = source.instantiateHierarchy(parent, undefined, (source, target) => {
        target.name = source.name;
        target.metadata = source.metadata;
        if ((source as AbstractMesh).layerMask) {
            (target as AbstractMesh).layerMask = (source as AbstractMesh).layerMask;
        }
        if ((source as AbstractMesh).instancedBuffers) {
            (target as AbstractMesh).instancedBuffers = {};
            Object.assign((target as AbstractMesh).instancedBuffers, (source as AbstractMesh).instancedBuffers);
        }
    })!;

    initRotation(instance);

    if (instance instanceof AbstractMesh) {
        initMesh(instance);
    }

    for (const mesh of instance.getChildMeshes()) {
        initMesh(mesh);
    }

    instance.id = source.id;
    instance.name = source.name;
    instance.parent = parent || null;

    return instance;
}

function createInstance(source: Mesh, name: string, parent: TransformNode, color?: Color3): AbstractMesh {
    const instance = source.createInstance(name);
    instance.metadata = source.metadata;
    instance.layerMask = source.layerMask;
    instance.parent = parent;

    if (color) {
        instance.instancedBuffers["color"] = color;
    }

    return instance;
}

interface BarrelParameters {
    readonly segments: Array<{
        readonly diameter: number;
        readonly length: number;
    }>;
    readonly baseCap?: boolean;
    readonly baseDiameter?: number;
    readonly diameter?: number;
    readonly angleVariance?: number;
    readonly speedVariance?: number;
    readonly multiplier?: Partial<DeepImmutable<WeaponProperties>>;
}

function createBarrel(name: string, parameters: BarrelParameters, scene: Scene): Mesh {
    const segments = parameters.segments;
    const baseCap = parameters.baseCap;
    const baseDiameter = parameters.baseDiameter ?? segments[0]!.diameter;
    const diameter = parameters.diameter ?? segments[segments.length - 1]!.diameter;

    const computeCap = (index: number): number => {
        if (segments.length === 1) {
            return baseCap ? Mesh.CAP_ALL : Mesh.CAP_END;
        } else if (index === 0) {
            return baseCap ? Mesh.CAP_START : Mesh.NO_CAP;
        } else {
            return (index === segments.length - 1) ? Mesh.CAP_END : Mesh.NO_CAP;
        }
    };

    let totalLength = 0;
    const meshes = segments.map((segment, index) => {
        const diameterBottom = (index === 0) ? baseDiameter : segments[index - 1]!.diameter;
        const diameterTop = segment.diameter;
        const mesh = MeshBuilder.CreateCylinder(`segment${index}`, {
            tessellation: 16,
            cap: computeCap(index),
            diameterBottom: diameterBottom,
            diameterTop: diameterTop,
            height: segment.length,
        }, scene);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.z = totalLength + segment.length / 2;
        totalLength += segment.length;
        return mesh;
    });

    const mesh = Mesh.MergeMeshes(meshes)!;
    mesh.name = name;
    mesh.metadata = {
        diameter: diameter,
        length: totalLength,
        angleVariance: parameters.angleVariance,
        speedVariance: parameters.speedVariance,
        multiplier: parameters.multiplier,
    } as BarrelMetadata;

    return mesh;
}

function createFakeBarrel(name: string, metadata: BarrelMetadata, scene: Scene): TransformNode {
    const node = new TransformNode(name, scene);
    node.metadata = metadata;
    return node;
}

function createCone(name: string, diameter: number, length: number, scene: Scene): Mesh {
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
    return mesh;
}

function createLance(name: string, diameter: number, length: number, scene: Scene): Mesh {
    const mesh = createCone(name, diameter, length, scene);
    mesh.position.z = 0.4;
    (mesh.metadata as LanceMetadata) = {
        colliders: ["collider0", "collider1", "collider2"],
    };

    const createCollider = (name: string, z: number): void => {
        const node = new TransformNode(name, scene);
        node.position.z = z;
        (node.metadata as SizeMetadata) = {
            size: diameter * (1 - z / length),
        };
        node.parent = mesh;
    };

    createCollider("collider0", 0);
    createCollider("collider1", length * 0.5);
    createCollider("collider2", length);

    return mesh;
}

function createShield(name: string, diameter: number, slice: number, scene: Scene): Mesh {
    const discRadius = diameter / 2;
    const theta = slice * Math.PI;
    const sphereRadius = discRadius / Math.sin(theta);
    const offset = Math.cos(theta) * sphereRadius;

    const segments = Math.round(16 * sphereRadius);
    const sphere = MeshBuilder.CreateSphere("sphere", {
        segments: segments,
        slice: slice,
        diameter: sphereRadius * 2,
    }, scene);
    sphere.position.z = -offset;
    sphere.rotation.x = Math.PI / 2;

    const disc = MeshBuilder.CreateDisc("disc", {
        tessellation: 6 + (segments - 1) * 2,
        radius: discRadius,
    }, scene);

    const mesh = Mesh.MergeMeshes([sphere, disc])!;
    mesh.name = name;
    (mesh.metadata as ShieldMetadata) = {
        colliders: ["collider0", "collider1", "collider2", "collider3", "collider4"],
    };

    const createCollider = (name: string, x: number): void => {
        const node = new TransformNode(name, scene);
        node.position.x = x;
        (node.metadata as SizeMetadata) = {
            size: (sphereRadius - Math.sqrt(x * x + offset * offset)) * 2
        };
        node.parent = mesh;
    };

    createCollider("collider0", discRadius * -1.0);
    createCollider("collider1", discRadius * -0.6);
    createCollider("collider2", discRadius * 0.0);
    createCollider("collider3", discRadius * 0.6);
    createCollider("collider4", discRadius * 1.0);

    return mesh;
}

export class Sources {
    private readonly _scene: Scene;

    private readonly _color: {
        readonly blue: Color3;
        readonly gray: Color3;
        readonly green: Color3;
        readonly orange: Color3;
        readonly pink: Color3;
        readonly purple: Color3;
        readonly yellow: Color3;
    }

    private readonly _material: {
        readonly gray: Material;
        readonly green: Material;
        readonly shadow: Material;
    };

    private readonly _component: {
        readonly barrel: {
            readonly simple: Mesh;
        };
        readonly box: Mesh;
        readonly dodecahedron: Mesh;
        readonly goldberg11: Mesh;
        readonly health: Mesh;
        readonly marker: {
            readonly circle: Mesh;
            readonly square: Mesh;
        };
        readonly shadow: Mesh;
        readonly sphere: Mesh;
        readonly star: {
            tri: Mesh;
            quad: Mesh;
        };
        readonly tetrahedron: Mesh;
    };

    public readonly bullet: {
        readonly tank: TransformNode;
        readonly crasher: TransformNode;
        readonly boss: TransformNode;
        readonly tankLauncher: TransformNode;
        readonly tankBomber: TransformNode;
        readonly tankPoison: TransformNode;
    };

    public readonly drone: {
        readonly tank: TransformNode;
        readonly crasher: TransformNode;
        readonly tankSpawner: TransformNode;
        readonly tankUnderseer: TransformNode;
    };

    public readonly trap: {
        readonly tankTri: TransformNode;
        readonly tankQuad: TransformNode;
    }

    public readonly shape: {
        readonly cube: TransformNode;
        readonly tetrahedron: TransformNode;
        readonly dodecahedron: TransformNode;
        readonly goldberg11: TransformNode;
    };

    public readonly crasher: {
        readonly small: TransformNode;
        readonly big: TransformNode;
        readonly shooter: TransformNode;
        readonly destroyer: TransformNode;
        readonly twin: TransformNode;
        readonly drone: TransformNode;
    };

    public readonly boss: {
        readonly keeper: TransformNode;
    };

    public readonly tank: {
        readonly base: TransformNode;

        // Level 1
        readonly sniper: TransformNode;
        readonly twin: TransformNode;
        readonly flankGuard: TransformNode;
        readonly pounder: TransformNode;
        readonly director: TransformNode;
        readonly trapper: TransformNode;
        readonly machineGun: TransformNode;
        readonly lancer: TransformNode;

        // Level 2
        readonly assassin: TransformNode;
        readonly twinSniper: TransformNode;
        readonly gatlingGun: TransformNode;
        readonly hunter: TransformNode;
        readonly launcher: TransformNode;
        readonly destroyer: TransformNode;
        readonly builder: TransformNode;
        readonly artillery: TransformNode;
        readonly blaster: TransformNode;
        readonly bomber: TransformNode;
        readonly poison: TransformNode;
        readonly searcher: TransformNode;
        readonly swarmer: TransformNode;
        readonly overseer: TransformNode;
        readonly spawner: TransformNode;
        readonly detector: TransformNode;
        readonly cruiser: TransformNode;
        readonly underseer: TransformNode;
        readonly shield: TransformNode;
        readonly spinner: TransformNode;
        readonly propeller: TransformNode;
        readonly doubleTwin: TransformNode;
        readonly autoTwo: TransformNode;
        readonly quad: TransformNode;
    };

    public constructor(world: World) {
        this._scene = world.scene;

        const sources = new TransformNode("sources", this._scene);
        sources.setEnabled(false);

        this._color = {
            blue: new Color3(0.3, 0.7, 1),
            gray: new Color3(0.5, 0.5, 0.5),
            green: new Color3(0, 0.8, 0),
            orange: new Color3(1, 0.5, 0.2),
            pink: new Color3(1, 0.5, 0.75),
            purple: new Color3(0.5, 0.2, 1),
            yellow: new Color3(0.9, 0.9, 0),
        }

        this._material = {
            gray: this._createMaterial("gray", this._color.gray),
            green: this._createMaterial("green", this._color.green),
            shadow: createShadowMaterial(this._scene),
        }

        const components = new TransformNode("components", this._scene);
        components.parent = sources;
        this._component = {
            barrel: {
                simple: this._createSimpleBarrelComponent(components),
            },
            box: this._createBoxComponent(components),
            dodecahedron: this._createDodecahedronComponent(components),
            goldberg11: this._createGoldberg11Component(components),
            health: this._createHealthComponent(components),
            marker: {
                circle: this._createCircleMarkerComponent(components),
                square: this._createSquareMarkerComponent(components),
            },
            shadow: this._createShadowComponent(components),
            sphere: this._createSphereComponent(components),
            star: {
                tri: this._createTriStarComponent(components),
                quad: this._createQuadStarComponent(components),
            },
            tetrahedron: this._createTetrahedronComponent(components),
        };

        const bullets = new TransformNode("bullets", this._scene);
        bullets.parent = sources;
        this.bullet = {
            tank: this._createBulletSource(bullets, "tank", this._color.blue),
            crasher: this._createBulletSource(bullets, "crasher", this._color.pink),
            boss: this._createBulletSource(bullets, "boss", this._color.orange),
            tankLauncher: this._createLauncherTankMissileSource(bullets),
            tankBomber: this._createBomberTankBombSource(bullets),
            tankPoison: this._createPoisonTankBulletSource(bullets),
        };

        const drones = new TransformNode("drones", this._scene);
        drones.parent = sources;
        this.drone = {
            tank: this._createDroneSource(drones, "tank", this._color.blue),
            crasher: this._createDroneSource(drones, "crasher", this._color.pink),
            tankSpawner: this._createSpawnerTankDroneSource(drones),
            tankUnderseer: this._createUnderseerTankDroneSource(drones),
        };

        const traps = new TransformNode("traps", this._scene);
        traps.parent = sources;
        this.trap = {
            tankTri: this._createTrapSource(traps, "tankTri", this._color.blue, this._component.star.tri),
            tankQuad: this._createTrapSource(traps, "tankQuad", this._color.blue, this._component.star.quad),
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

            // Level 1
            sniper: this._createSniperTankSource(tanks),
            twin: this._createTwinTankSource(tanks),
            flankGuard: this._createFlankGuardTankSource(tanks),
            pounder: this._createPounderTankSource(tanks),
            director: this._createDirectorTankSource(tanks),
            trapper: this._createTrapperTankSource(tanks),
            machineGun: this._createMachineGunTankSource(tanks),
            lancer: this._createLancerTankSource(tanks),

            // Level 2
            assassin: this._createAssassinTankSource(tanks),
            twinSniper: this._createTwinSniperTankSource(tanks),
            gatlingGun: this._createGatlingGunTankSource(tanks),
            hunter: this._createHunterTankSource(tanks),
            launcher: this._createLauncherTankSource(tanks),
            destroyer: this._createDestroyerTankSource(tanks),
            builder: this._createBuilderTankSource(tanks),
            artillery: this._createArtilleryTankSource(tanks),
            blaster: this._createBlasterTankSource(tanks),
            bomber: this._createBomberTankSource(tanks),
            poison: this._createPoisonTankSource(tanks),
            searcher: this._createSearcherTankSource(tanks),
            swarmer: this._createSwarmerTankSource(tanks),
            overseer: this._createOverseerTankSource(tanks),
            spawner: this._createSpawnerTankSource(tanks),
            detector: this._createDetectorTankSource(tanks),
            cruiser: this._createCruiserTankSource(tanks),
            underseer: this._createUnderseerTankSource(tanks),
            shield: this._createShieldTankSource(tanks),
            spinner: this._createSpinnerTankSource(tanks),
            propeller: this._createPropellerTankSource(tanks),
            doubleTwin: this._createDoubleTwinTankSource(tanks),
            autoTwo: this._createAutoTwoTankSource(tanks),
            quad: this._createQuadTankSource(tanks),
        };
    }

    public createHealth(parent?: TransformNode): TransformNode {
        return instantiate(this._component.health, parent);
    }

    public createShadow(parent?: TransformNode): TransformNode {
        return instantiate(this._component.shadow, parent);
    }

    public create(source: TransformNode, parent?: TransformNode): TransformNode {
        return instantiate(source, parent);
    }

    private _createMaterial(name: string, color: Color3): Material {
        const material = new StandardMaterial(name, this._scene);
        material.diffuseColor = color;
        return material;
    }

    private _createBarrel(parent: TransformNode, name: string, parameters: BarrelParameters): Mesh {
        const mesh = createBarrel(name, parameters, this._scene);
        mesh.material = this._material.gray;
        mesh.parent = parent;
        return mesh;
    }

    private _createSimpleBarrelComponent(parent: TransformNode): Mesh {
        return this._createBarrel(parent, "simpleBarrel", { segments: [{ diameter: 1, length: 1 }] });
    }

    private _createHealthComponent(parent: TransformNode): Mesh {
        const mesh = MeshBuilder.CreatePlane("health", { width: 1, height: 0.08 }, this._scene);
        mesh.material = this._material.green;
        mesh.parent = parent;
        return mesh;
    }

    private _createCircleMarkerComponent(parent: TransformNode): Mesh {
        const mesh = MeshBuilder.CreateDisc("circle", { tessellation: 16 }, this._scene);
        mesh.rotation.x = Math.PI / 2;
        mesh.scaling.scaleInPlace(MARKER_SCALE);
        mesh.bakeCurrentTransformIntoVertices();
        mesh.registerInstancedBuffer("color", 3);
        mesh.layerMask = Minimap.LayerMask;
        mesh.parent = parent;
        return mesh;
    }

    private _createSquareMarkerComponent(parent: TransformNode): Mesh {
        const mesh = MeshBuilder.CreateDisc("square", { tessellation: 4 }, this._scene);
        mesh.rotation.x = Math.PI / 2;
        mesh.rotation.z = Math.PI / 4;
        mesh.scaling.scaleInPlace(MARKER_SCALE);
        mesh.bakeCurrentTransformIntoVertices();
        mesh.registerInstancedBuffer("color", 3);
        mesh.layerMask = Minimap.LayerMask;
        mesh.parent = parent;
        return mesh;
    }

    private _createShadowComponent(parent: TransformNode): Mesh {
        const mesh = MeshBuilder.CreatePlane("shadow", { size: 2 }, this._scene);
        mesh.rotation.x = Math.PI / 2;
        mesh.bakeCurrentTransformIntoVertices();
        mesh.material = this._material.shadow;
        mesh.parent = parent;
        return mesh;
    }

    private _createBoxComponent(parent: TransformNode): Mesh {
        const mesh = MeshBuilder.CreateBox("box", {}, this._scene);
        mesh.registerInstancedBuffer("color", 3);
        mesh.parent = parent;
        return mesh;
    }

    private _createDodecahedronComponent(parent: TransformNode): Mesh {
        const mesh = MeshBuilder.CreatePolyhedron("dodecahedron", { type: 2 }, this._scene);
        mesh.rotation.x = Math.PI / 2;
        mesh.bakeCurrentTransformIntoVertices();
        mesh.registerInstancedBuffer("color", 3);
        mesh.parent = parent;
        return mesh;
    }

    private _createGoldberg11Component(parent: TransformNode): Mesh {
        const mesh = MeshBuilder.CreateGoldberg("goldberg11", { m: 1, n: 1 }, this._scene);
        mesh.registerInstancedBuffer("color", 3);
        mesh.parent = parent;
        return mesh;
    }

    private _createSphereComponent(parent: TransformNode): Mesh {
        const mesh = MeshBuilder.CreateSphere("sphere", { segments: 16 }, this._scene);
        mesh.registerInstancedBuffer("color", 3);
        mesh.parent = parent;
        return mesh;
    }

    private _createTetrahedronComponent(parent: TransformNode): Mesh {
        const mesh = MeshBuilder.CreatePolyhedron("tetrahedron", { type: 0 }, this._scene);
        mesh.rotation.z = Math.PI / 6;
        mesh.bakeCurrentTransformIntoVertices();
        mesh.registerInstancedBuffer("color", 3);
        mesh.parent = parent;
        return mesh;
    }

    private _createStarComponent(name: string, sides: number, parent: TransformNode): Mesh {
        const angle = Math.PI / sides;

        const outerRadius = 0.5;
        const innerRadius = 0.5 * Math.cos(angle) - 0.05;

        const points = new Array<Vector3>(sides * 2);
        const getPoint = (radius: number, angle: number) => new Vector3(-radius * Math.sin(angle), radius * Math.cos(angle), 0);
        for (let i = 0; i < points.length; ++i) {
            points[i] = getPoint((i % 2) === 0 ? outerRadius : innerRadius, angle * i);
        }

        const shape = new Array<Vector3>(points.length * 2);
        for (let i = 0; i < points.length; ++i) {
            shape[i * 2 + 0] = points[i]!;
            shape[i * 2 + 1] = points[(i + 1) % points.length]!;
        }

        const path = [new Vector3(0, 0, -0.3), new Vector3(0, 0, 0.3)];
        const mesh = MeshBuilder.ExtrudeShape(name, { shape: shape, path: path, cap: Mesh.CAP_ALL }, this._scene);
        mesh.registerInstancedBuffer("color", 3);
        mesh.rotation.x = Math.PI / 2;
        mesh.bakeCurrentTransformIntoVertices();
        mesh.parent = parent;
        return mesh;
    }

    private _createTriStarComponent(parent: TransformNode): Mesh {
        return this._createStarComponent("tristar", 3, parent);
    }

    private _createQuadStarComponent(parent: TransformNode): Mesh {
        return this._createStarComponent("quadstar", 4, parent);
    }

    private _createSimpleBarrel(parent: TransformNode, name: string, diameter: number, length: number, multiplier?: Partial<DeepImmutable<WeaponProperties>>): TransformNode {
        const source = createInstance(this._component.barrel.simple, name, parent);
        source.scaling.set(diameter, diameter, length);
        if (multiplier) {
            (source.metadata as BarrelMetadata) = {
                ...source.metadata,
                multiplier: multiplier,
            };
        }
        return source;
    }

    private _createSource(parent: TransformNode, name: string, metadata?: any): TransformNode {
        const source = new TransformNode(name, this._scene);
        source.parent = parent;

        if (metadata) {
            source.metadata = metadata;
        }

        return source;
    }

    private _createBulletSource(parent: TransformNode, name: string, color: Color3): TransformNode {
        return createInstance(this._component.sphere, name, parent, color);
    }

    private _createDroneSource(parent: TransformNode, name: string, color: Color3): TransformNode {
        const source = this._createSource(parent, name);
        const body = createInstance(this._component.tetrahedron, "body", source, color);
        body.scaling.setAll(0.4);
        return source;
    }

    private _createSpawnerTankDroneSource(parent: TransformNode): TransformNode {
        const metadata: BarrelProjectileMetadata = {
            barrels: ["barrel"],
            reloadMultiplier: 0.4,
        };

        const source = this._createSource(parent, "tankSpawner", metadata);

        const body = createInstance(this._component.tetrahedron, "body", source, this._color.blue);
        body.scaling.setAll(0.4);

        this._createSimpleBarrel(source, "barrel", 0.29, 0.79, {
            speed: 1.2,
            damage: { value: 0.1, time: 1 },
            health: 0.1,
        });

        return source;
    }

    private _createUnderseerTankDroneSource(parent: TransformNode): TransformNode {
        const metadata: SizeMetadata = {
            size: 0.9,
        };

        const source = this._createSource(parent, "tankUnderseer", metadata);

        const body = createInstance(this._component.box, "body", source, this._color.blue);
        body.scaling.setAll(0.7);

        return source;
    }

    private _createTrapSource(parent: TransformNode, name: string, color: Color3, component: Mesh): TransformNode {
        const source = this._createSource(parent, "name");

        const body = createInstance(component, name, source, color);
        body.scaling.setAll(1.2);

        return source;
    }

    private _createLauncherTankMissileSource(parent: TransformNode): TransformNode {
        const metadata: BarrelProjectileMetadata = {
            barrels: ["barrel"],
            reloadMultiplier: 0.5,
        };

        const source = createInstance(this._component.sphere, "tankLauncher", parent, this._color.blue);
        source.metadata = metadata;

        const barrel = this._createSimpleBarrel(source, "barrel", 0.45, 0.75, {
            damage: { value: 0.17, time: 1 },
            health: 0.17,
        });
        barrel.rotationQuaternion = Quaternion.FromEulerAngles(0, Math.PI, 0);

        return source;
    }

    private _createBomberTankBombSource(parent: TransformNode): TransformNode {
        const metadata: BombMetadata = {
            barrels: ["barrel0", "barrel1", "barrel2", "barrel3", "barrel4"],
            multiplier: {
                speed: 0.5,
                damage: { value: 0.5, time: 1 },
                health: 0.5,
            },
        };

        const source = createInstance(this._component.sphere, "tankBomber", parent, this._color.blue);
        source.metadata = metadata;

        const barrelMetadata: BarrelMetadata = {
            diameter: 0.3,
            length: 0.2,
            angleVariance: Tools.ToRadians(5),
            speedVariance: 0.1,
        };

        const length = metadata.barrels.length;
        for (let index = 0; index < length; ++index) {
            const barrel = createFakeBarrel(`barrel${index}`, barrelMetadata, this._scene);
            barrel.rotationQuaternion = Quaternion.FromEulerAngles(0, 2 * Math.PI * (index / length), 0);
            barrel.parent = source;
        }

        return source;
    }

    private _createPoisonTankBulletSource(parent: TransformNode): TransformNode {
        const source = this._createBulletSource(parent, "tankPoison", this._color.blue);

        const icosahedron = MeshBuilder.CreatePolyhedron("icosahedron", { type: 3, size: 0.4 }, this._scene);
        const positions = icosahedron.getPositionData(false, false)!;
        icosahedron.dispose();

        const diameter = 0.4;
        const spheres = new Array<Mesh>();
        for (let i = 0; i < positions.length; i += 3) {
            const sphere = MeshBuilder.CreateSphere("tankPoison", { segments: 4, diameter: diameter }, this._scene);
            sphere.position.set(positions[i]!, positions[i + 1]!, positions[i + 2]!);
            spheres.push(sphere);
        }

        const poison = Mesh.MergeMeshes(spheres, true)!;
        poison.name = "poison";
        poison.registerInstancedBuffer("color", 3);
        poison.instancedBuffers["color"] = this._color.green;
        poison.parent = source;

        return source;
    }

    private _createCubeShapeSource(parent: TransformNode): TransformNode {
        const metadata: ShapeMetadata = {
            displayName: "Cube",
            size: 0.6,
            health: 10,
            damage: { value: 10, time: 1 },
            points: 10,
        };

        const source = this._createSource(parent, "cube", metadata);
        const body = createInstance(this._component.box, "body", source, this._color.yellow);
        body.rotationQuaternion = Quaternion.FromEulerAngles(Math.atan(1 / Math.sqrt(2)), 0, Math.PI / 4);
        body.scaling.setAll(0.4);
        return source;
    }

    private _createTetrahedronShapeSource(parent: TransformNode): TransformNode {
        const metadata: ShapeMetadata = {
            displayName: "Tetrahedron",
            size: 0.75,
            health: 30,
            damage: { value: 20, time: 1 },
            points: 25,
        };

        const source = this._createSource(parent, "tetrahedron", metadata);
        const body = createInstance(this._component.tetrahedron, "body", source, this._color.orange);
        body.position.y = -0.1;
        body.rotationQuaternion = Quaternion.FromEulerAngles(-Math.PI / 2, 0, 0);
        body.scaling.setAll(0.25);
        return source;
    }

    private _createDodecahedronShapeSource(parent: TransformNode): TransformNode {
        const metadata: ShapeMetadata = {
            displayName: "Dodecahedron",
            size: 1,
            health: 125,
            damage: { value: 50, time: 1 },
            points: 120,
        };

        const source = this._createSource(parent, "dodecahedron", metadata);
        const body = createInstance(this._component.dodecahedron, "body", source, this._color.purple);
        body.scaling.setAll(0.5);
        return source;
    }

    private _createGoldberg11ShapeSource(parent: TransformNode): TransformNode {
        const metadata: ShapeMetadata = {
            displayName: "Truncated Isocahedron",
            size: 1.62,
            health: 250,
            damage: { value: 50, time: 1 },
            points: 200,
        };

        const source = this._createSource(parent, "goldberg11", metadata);
        const body = createInstance(this._component.goldberg11, "body", source, this._color.green);
        body.scaling.setAll(0.9);
        return source;
    }

    private _createCrasherSource(parent: TransformNode, name: string, metadata: CrasherMetadata): TransformNode {
        const source = this._createSource(parent, name, metadata);

        const body = createInstance(this._component.tetrahedron, "body", source, this._color.pink);
        body.scaling.setAll(metadata.size * 0.4);

        return source;
    }

    private _createSmallCrasherSource(parent: TransformNode): TransformNode {
        const metadata: CrasherMetadata = {
            displayName: "Small Crasher",
            size: 0.5,
            speed: CRASHER_SPEED,
            health: 10,
            damage: { value: 20, time: 1 },
            points: 10,
        };

        return this._createCrasherSource(parent, "small", metadata);
    }

    private _createBigCrasherSource(parent: TransformNode): TransformNode {
        const metadata: CrasherMetadata = {
            displayName: "Big Crasher",
            size: 0.7,
            speed: CRASHER_SPEED,
            health: 20,
            damage: { value: 40, time: 1 },
            points: 25,
        };

        return this._createCrasherSource(parent, "big", metadata);
    }

    private _createShooterCrasherSource(parent: TransformNode): TransformNode {
        const metadata: BulletCrasherMetadata = {
            displayName: "Shooter Crasher",
            size: 0.7,
            speed: CRASHER_SPEED * 1.1,
            health: 20,
            damage: { value: 30, time: 1 },
            points: 50,
            reload: CRASHER_PROJECTILE_RELOAD,
            barrels: ["barrel"],
            bullet: {
                speed: CRASHER_PROJECTILE_SPEED,
                damage: {
                    value: CRASHER_PROJECTILE_DAMAGE_VALUE,
                    time: CRASHER_PROJECTILE_DAMAGE_TIME,
                },
                health: CRASHER_PROJECTILE_HEALTH,
            },
        };

        const source = this._createCrasherSource(parent, "shooter", metadata);

        this._createSimpleBarrel(source, "barrel", 0.2, 0.55);

        return source;
    }

    private _createDestroyerCrasherSource(parent: TransformNode): TransformNode {
        const metadata: BulletCrasherMetadata = {
            displayName: "Destroyer Crasher",
            size: 1.4,
            speed: CRASHER_SPEED * 0.6,
            health: MEGA_CRASHER_HEALTH,
            damage: { value: MEGA_CRASHER_DAMAGE, time: 1 },
            points: MEGA_CRASHER_POINTS,
            reload: CRASHER_PROJECTILE_RELOAD * 2,
            barrels: ["barrel"],
            bullet: {
                speed: CRASHER_PROJECTILE_SPEED,
                damage: {
                    value: CRASHER_PROJECTILE_DAMAGE_VALUE * 2,
                    time: CRASHER_PROJECTILE_DAMAGE_TIME,
                },
                health: CRASHER_PROJECTILE_HEALTH,
            },
        };

        const source = this._createCrasherSource(parent, "destroyer", metadata);

        this._createSimpleBarrel(source, "barrel", 0.4, 1.1);

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
            damage: { value: MEGA_CRASHER_DAMAGE, time: 1 },
            points: MEGA_CRASHER_POINTS,
            reload: CRASHER_PROJECTILE_RELOAD * 0.5,
            barrels: ["barrelL", "barrelR"],
            bullet: {
                speed: CRASHER_PROJECTILE_SPEED,
                damage: {
                    value: CRASHER_PROJECTILE_DAMAGE_VALUE,
                    time: CRASHER_PROJECTILE_DAMAGE_TIME,
                },
                health: CRASHER_PROJECTILE_HEALTH,
            },
        };

        const source = this._createCrasherSource(parent, "twin", metadata);

        const barrelL = this._createSimpleBarrel(source, "barrelL", barrelDiameter, barrelLength);
        barrelL.position.x = -barrelOffset;

        const barrelR = this._createSimpleBarrel(source, "barrelR", barrelDiameter, barrelLength);
        barrelR.position.x = +barrelOffset;

        return source;
    }

    private _createDroneCrasherSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [{ diameter: 0.8, length: 0.7 }],
            baseDiameter: 0.25,
        };

        const metadata: DroneCrasherMetadata = {
            displayName: "Drone Crasher",
            size: 1.4,
            speed: CRASHER_SPEED * 0.5,
            health: MEGA_CRASHER_HEALTH,
            damage: { value: MEGA_CRASHER_DAMAGE, time: 1 },
            points: MEGA_CRASHER_POINTS,
            reload: CRASHER_PROJECTILE_RELOAD * 4,
            barrels: ["barrel"],
            drone: {
                speed: CRASHER_PROJECTILE_SPEED,
                damage: {
                    value: CRASHER_PROJECTILE_DAMAGE_VALUE,
                    time: CRASHER_PROJECTILE_DAMAGE_TIME,
                },
                health: CRASHER_PROJECTILE_HEALTH * 1.25,
            },
        };

        const source = this._createCrasherSource(parent, "drone", metadata);

        const barrel = this._createBarrel(source, "barrel", barrelParameters);
        barrel.rotationQuaternion = Quaternion.FromEulerAngles(0, Math.PI, 0);

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
            damage: { value: 40, time: 1 },
            points: 300,
            tanks: ["tank0", "tank1", "tank2", "tank3"],
        };

        const tankMetadata: BossTankMetadata = {
            reload: 1,
            barrels: ["barrel"],
            bullet: {
                speed: 8,
                damage: { value: 20, time: 0.2 },
                health: 100,
            },
        };

        const source = new TransformNode("keeper", this._scene);
        source.parent = parent;
        source.metadata = metadata;

        const body = createInstance(this._component.box, "body", source, this._color.orange);
        body.scaling.set(bodyWidth, bodyHeight, bodyWidth);

        const angle = Math.PI * 0.25;
        const tankTransforms = [{
            position: new Vector3(bodyWidth, 0, bodyWidth).scaleInPlace(0.5),
            rotation: angle,
        }, {
            position: new Vector3(bodyWidth, 0, -bodyWidth).scaleInPlace(0.5),
            rotation: angle * 3,
        }, {
            position: new Vector3(-bodyWidth, 0, -bodyWidth).scaleInPlace(0.5),
            rotation: angle * 5,
        }, {
            position: new Vector3(-bodyWidth, 0, bodyWidth).scaleInPlace(0.5),
            rotation: angle * 7,
        }];

        for (let index = 0; index < tankTransforms.length; ++index) {
            const tankNodeName = metadata.tanks[index]!;
            const tankTransform = tankTransforms[index]!;

            const offset = new TransformNode("offset");
            offset.position.copyFrom(tankTransform.position);
            offset.rotation.y = tankTransform.rotation;
            offset.parent = source;

            const tank = createInstance(this._component.sphere, tankNodeName, offset, this._color.orange);
            tank.metadata = tankMetadata;

            this._createSimpleBarrel(tank, "barrel", barrelDiameter, barrelLength);
        }

        createInstance(this._component.marker.square, "marker", body, this._color.orange);

        return source;
    }

    private _createTankBody(parent: TransformNode, name: string, metadata: any): AbstractMesh {
        const body = createInstance(this._component.sphere, name, parent, this._color.blue);
        body.scaling.setAll(metadata.size);
        body.metadata = metadata;

        createInstance(this._component.marker.circle, "marker", body, this._color.blue);

        return body;
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

        const source = this._createTankBody(parent, "base", metadata);

        this._createSimpleBarrel(source, "barrel", barrelDiameter, barrelLength);

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

        const source = this._createTankBody(parent, "sniper", metadata);

        this._createSimpleBarrel(source, "barrel", barrelDiameter, barrelLength);

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
            multiplier: {},
        };

        const source = this._createTankBody(parent, "twin", metadata);

        const barrelL = this._createSimpleBarrel(source, "barrelL", barrelDiameter, barrelLength);
        barrelL.position.x = -barrelOffset;

        const barrelR = this._createSimpleBarrel(source, "barrelR", barrelDiameter, barrelLength);
        barrelR.position.x = +barrelOffset;

        return source;
    }

    private _createFlankGuardTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.45;
        const barrelLengthF = 0.75;
        const barrelLengthB = 0.65;

        const metadata: PlayerTankMetadata = {
            displayName: "Flank Guard",
            size: 1,
            barrels: ["barrelF", "barrelB"],
            multiplier: {},
        };

        const source = this._createTankBody(parent, "flankGuard", metadata);

        const barrelF = this._createSimpleBarrel(source, "barrelF", barrelDiameter, barrelLengthF);
        barrelF.rotationQuaternion = Quaternion.Identity();

        const barrelB = this._createSimpleBarrel(source, "barrelB", barrelDiameter, barrelLengthB);
        barrelB.rotationQuaternion = Quaternion.FromEulerAngles(0, Math.PI, 0);

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

        const source = this._createTankBody(parent, "pounder", metadata);

        this._createSimpleBarrel(source, "barrel", barrelDiameter, barrelLength);

        return source;
    }

    private _createDirectorTankSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [{ diameter: 0.8, length: 0.7 }],
            baseDiameter: 0.25,
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

        const source = this._createTankBody(parent, "director", metadata);

        this._createBarrel(source, "barrel", barrelParameters);

        return source;
    }

    private _createTrapperTankSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [
                { diameter: 0.4, length: 0.52 },
                { diameter: 0.8, length: 0.18 },
            ],
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Trapper",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                reloadTime: 3,
                weaponSpeed: 0.8,
                weaponDamage: 2.5,
                weaponHealth: 2.5,
            },
        };

        const source = this._createTankBody(parent, "trapper", metadata);

        this._createBarrel(source, "barrel", barrelParameters);

        return source;
    }

    private _createMachineGunTankSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [
                { diameter: 0.45, length: 0.4 },
                { diameter: 0.6, length: 0.35 },
            ],
            diameter: 0.45,
            angleVariance: Tools.ToRadians(15),
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

        const source = this._createTankBody(parent, "machineGun", metadata);

        this._createBarrel(source, "barrel", barrelParameters);

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

        const source = this._createTankBody(parent, "lancer", metadata);

        const lance = createLance("lance", lanceDiameter, lanceLength, this._scene);
        lance.material = this._material.gray;
        lance.position.z = 0.4;
        lance.parent = source;

        return source;
    }

    private _createAssassinTankSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [
                { diameter: 0.4, length: 0.15 },
                { diameter: 0.4, length: 0.45 },
            ],
            baseCap: true,
            baseDiameter: 0.75,
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Assassin",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                weaponDamage: 1.2,
                weaponSpeed: 2.5,
                reloadTime: 2.5,
            },
        };

        const source = this._createTankBody(parent, "assassin", metadata);

        const barrel = this._createBarrel(source, "barrel", barrelParameters);
        barrel.position.z = 0.35;

        return source;
    }

    private _createTwinSniperTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.4;
        const barrelLength = 0.9;
        const barrelOffset = barrelDiameter * 0.51;

        const metadata: PlayerTankMetadata = {
            displayName: "Twin Sniper",
            size: 1,
            barrels: ["barrelL", "barrelR"],
            multiplier: {
                weaponSpeed: 2,
                reloadTime: 2,
            },
        };

        const source = this._createTankBody(parent, "twinSniper", metadata);

        const barrelL = this._createSimpleBarrel(source, "barrelL", barrelDiameter, barrelLength);
        barrelL.position.x = -barrelOffset;

        const barrelR = this._createSimpleBarrel(source, "barrelR", barrelDiameter, barrelLength);
        barrelR.position.x = +barrelOffset;

        return source;
    }

    private _createGatlingGunTankSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [
                { diameter: 0.45, length: 0.4 },
                { diameter: 0.6, length: 0.5 },
            ],
            diameter: 0.45,
            angleVariance: Tools.ToRadians(10),
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Gatling Gun",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                weaponSpeed: 2,
                weaponHealth: 0.8,
                reloadTime: 0.8,
            },
        };

        const source = this._createTankBody(parent, "gatlingGun", metadata);

        this._createBarrel(source, "barrel", barrelParameters);

        return source;
    }

    private _createHunterTankSource(parent: TransformNode): TransformNode {
        const smallBarrelParameters: BarrelParameters = {
            segments: [{ diameter: 0.25, length: 0.9 }]
        };

        const largeBarrelParameters: BarrelParameters = {
            segments: [{ diameter: 0.45, length: 0.8 }],
            multiplier: {
                damage: { value: 1.5, time: 1 },
            },
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Hunter",
            size: 1,
            barrels: ["barrelS", "barrelL"],
            multiplier: {
                weaponSpeed: 2,
                reloadTime: 3,
            },
        };

        const source = this._createTankBody(parent, "hunter", metadata);

        this._createBarrel(source, "barrelS", smallBarrelParameters);
        this._createBarrel(source, "barrelL", largeBarrelParameters);

        return source;
    }

    private _createLauncherTankSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [
                { diameter: 0.7, length: 0.7 },
                { diameter: 0.6, length: 0.1 },
            ]
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Launcher",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                weaponSpeed: 0.5,
                weaponDamage: 2,
                weaponHealth: 2,
                reloadTime: 4,
            },
        };

        const source = this._createTankBody(parent, "launcher", metadata);

        this._createBarrel(source, "barrel", barrelParameters);

        return source;
    }

    private _createDestroyerTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.7;
        const barrelLength = 0.75;

        const metadata: PlayerTankMetadata = {
            displayName: "Destroyer",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                weaponSpeed: 0.2,
                weaponDamage: 4,
                weaponHealth: 4,
                reloadTime: 5,
            },
        };

        const source = this._createTankBody(parent, "destroyer", metadata);

        this._createSimpleBarrel(source, "barrel", barrelDiameter, barrelLength);

        return source;
    }

    private _createBuilderTankSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [
                { diameter: 0.7, length: 0.6 },
                { diameter: 0.9, length: 0.2 },
            ]
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Builder",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                weaponSpeed: 0.8,
                weaponDamage: 3.5,
                weaponHealth: 3.5,
                reloadTime: 3,
            },
        };

        const source = this._createTankBody(parent, "builder", metadata);

        this._createBarrel(source, "barrel", barrelParameters);

        return source;
    }

    private _createArtilleryTankSource(parent: TransformNode): TransformNode {
        const mainBarrelDiameter = 0.55;
        const mainBarrelLength = 0.75;
        const sideBarrelDiameter = mainBarrelDiameter * 0.3;
        const sideBarrelLength = mainBarrelLength * 0.9;
        const sideBarrelAngle = 0.1;

        const sideBarrelParameters: BarrelParameters = {
            segments: [{ diameter: sideBarrelDiameter, length: sideBarrelLength }],
            multiplier: {
                damage: { value: 0.3, time: 1 },
                health: 0.3,
            },
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Artillery",
            size: 1,
            barrels: ["barrel", "barrelL", "barrelR"],
            multiplier: {
                weaponDamage: 2,
                weaponHealth: 2,
                reloadTime: 2,
            },
        };

        const source = this._createTankBody(parent, "builder", metadata);

        this._createSimpleBarrel(source, "barrel", mainBarrelDiameter, mainBarrelLength);

        const barrelL = this._createBarrel(source, "barrelL", sideBarrelParameters);
        barrelL.position.x = -mainBarrelDiameter * 0.5;
        barrelL.rotationQuaternion = Quaternion.FromEulerAngles(0, -sideBarrelAngle, 0);

        const barrelR = this._createBarrel(source, "barrelR", sideBarrelParameters);
        barrelR.position.x = mainBarrelDiameter * 0.5;
        barrelR.rotationQuaternion = Quaternion.FromEulerAngles(0, sideBarrelAngle, 0);

        return source;
    }

    private _createBlasterTankSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [
                { diameter: 0.5, length: 0.15 },
                { diameter: 0.65, length: 0.3 },
            ],
            baseCap: true,
            baseDiameter: 0.75,
            diameter: 0.3,
            angleVariance: Tools.ToRadians(8),
            speedVariance: 0.1,
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Blaster",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                weaponSpeed: 2,
                weaponDamage: 0.6,
                reloadTime: 5,
            },
        };

        const source = this._createTankBody(parent, "blaster", metadata);

        const barrel = this._createBarrel(source, "barrel", barrelParameters);
        barrel.position.z = 0.35;

        return source;
    }

    private _createBomberTankSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [
                { diameter: 0.6, length: 0.6 },
                { diameter: 0.75, length: 0.1 },
                { diameter: 0.6, length: 0.1 },
            ],
            multiplier: {
                health: 0.001,
            }
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Bomber",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                weaponDamage: 2,
                weaponHealth: 2,
                reloadTime: 3,
            },
        };

        const source = this._createTankBody(parent, "bomber", metadata);

        this._createBarrel(source, "barrel", barrelParameters);

        return source;
    }

    private _createPoisonTankSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [
                { diameter: 0.4, length: 0.9 },
            ],
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Poison",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                weaponSpeed: 2,
                reloadTime: 2,
            },
        };

        const source = this._createTankBody(parent, "poison", metadata);

        const barrel = this._createBarrel(source, "barrel", barrelParameters);
        barrel.material = this._material.green;

        return source;
    }

    private _createSearcherTankSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [
                { diameter: 0.4, length: 0.15 },
                { diameter: 0.4, length: 0.05 },
                { diameter: 0.5, length: 0.05 },
                { diameter: 0.5, length: 0.35 },
            ],
            baseCap: true,
            baseDiameter: 0.75,
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Searcher",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                weaponDamage: 1.2,
                weaponSpeed: 2.5,
                reloadTime: 2.5,
            },
        };

        const source = this._createTankBody(parent, "searcher", metadata);

        const barrel = this._createBarrel(source, "barrel", barrelParameters);
        barrel.position.z = 0.35;

        return source;
    }

    private _createSwarmerTankSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [
                { diameter: 0.25, length: 0.65 },
            ],
            baseDiameter: 0.55,
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Swarmer",
            size: 1,
            barrels: ["barrel0", "barrel1", "barrel2"],
            multiplier: {
                weaponSpeed: 0.5,
                weaponDamage: 0.5,
                weaponHealth: 0.5,
                reloadTime: 2.5,
            },
        };

        const source = this._createTankBody(parent, "base", metadata);

        const angle = Math.PI * 2 / 3;
        for (let index = 0; index < 3; ++index) {
            const barrel = this._createBarrel(source, `barrel${index}`, barrelParameters);
            barrel.rotationQuaternion = Quaternion.FromEulerAngles(0, angle * index, 0);
        }

        return source;
    }

    private _createOverseerTankSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [{ diameter: 0.8, length: 0.7 }],
            baseDiameter: 0.25,
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Overseer",
            size: 1,
            barrels: ["barrelL", "barrelR"],
            multiplier: {
                weaponSpeed: 0.5,
                reloadTime: 3,
            },
        };

        const source = this._createTankBody(parent, "overseer", metadata);

        const barrelL = this._createBarrel(source, "barrelL", barrelParameters);
        barrelL.rotationQuaternion = Quaternion.FromEulerAngles(0, -Math.PI / 2, 0);

        const barrelR = this._createBarrel(source, "barrelR", barrelParameters);
        barrelR.rotationQuaternion = Quaternion.FromEulerAngles(0, Math.PI / 2, 0);

        return source;
    }

    private _createSpawnerTankSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [
                { diameter: 0.7, length: 0.25 },
                { diameter: 0.7, length: 0.05 },
                { diameter: 0.6, length: 0.05 },
                { diameter: 0.7, length: 0.1 },
            ],
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Spawner",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                weaponSpeed: 0.5,
                weaponDamage: 3,
                weaponHealth: 3,
                reloadTime: 5,
            },
        };

        const source = this._createTankBody(parent, "spawner", metadata);

        const barrel = this._createBarrel(source, "barrel", barrelParameters);
        barrel.position.z = 0.35;

        return source;
    }

    private _createDetectorTankSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [
                { diameter: 0.6, length: 0.6 },
                { diameter: 0.75, length: 0.01 },
                { diameter: 0.6, length: 0.1 },
            ]
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Detector",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                weaponSpeed: 0.5,
                weaponDamage: 1.5,
                weaponHealth: 1.5,
                reloadTime: 3,
            },
        };

        const source = this._createTankBody(parent, "detector", metadata);

        this._createBarrel(source, "barrel", barrelParameters);

        return source;
    }

    private _createCruiserTankSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [
                { diameter: 0.3, length: 0.65 },
            ],
            baseDiameter: 0.6,
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Cruiser",
            size: 1,
            barrels: ["barrelL", "barrelR"],
            multiplier: {
                weaponSpeed: 0.5,
                weaponDamage: 0.6,
                weaponHealth: 0.6,
                reloadTime: 3,
            },
        };

        const source = this._createTankBody(parent, "cruiser", metadata);

        const barrelL = this._createBarrel(source, "barrelL", barrelParameters);
        barrelL.rotationQuaternion = Quaternion.FromEulerAngles(0, -Math.PI / 2, 0);

        const barrelR = this._createBarrel(source, "barrelR", barrelParameters);
        barrelR.rotationQuaternion = Quaternion.FromEulerAngles(0, Math.PI / 2, 0);

        return source;
    }

    private _createUnderseerTankSource(parent: TransformNode): TransformNode {
        const barrelParameters: BarrelParameters = {
            segments: [
                { diameter: 0.4, length: 0.15 },
                { diameter: 0.8, length: 0.25 },
            ],
            baseCap: true,
            baseDiameter: 0.75,
        };

        const metadata: PlayerTankMetadata = {
            displayName: "Underseer",
            size: 1,
            barrels: ["barrel"],
            multiplier: {
                weaponSpeed: 0.5,
                weaponHealth: 1.5,
            },
        };

        const source = this._createTankBody(parent, "underseer", metadata);

        const barrel = this._createBarrel(source, "barrel", barrelParameters);
        barrel.position.z = 0.35;

        return source;
    }

    private _createShieldTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.45;
        const barrelLength = 0.75;
        const shieldBarrelDiameter = 0.35;
        const shieldBarrelLength = 0.55;

        const metadata: PlayerTankMetadata = {
            displayName: "Shield",
            size: 1,
            barrels: ["barrel"],
            shields: ["shield"],
            multiplier: {},
        };

        const source = this._createTankBody(parent, "shield", metadata);

        this._createSimpleBarrel(source, "barrel", barrelDiameter, barrelLength);

        const sheildBarrel = this._createSimpleBarrel(source, "shieldBarrel", shieldBarrelDiameter, shieldBarrelLength);
        sheildBarrel.rotationQuaternion = Quaternion.FromEulerAngles(0, Math.PI, 0);

        const shield = createShield("shield", metadata.size, 0.3, this._scene);
        shield.material = this._material.gray;
        shield.position.z = -shieldBarrelLength;
        shield.rotationQuaternion = Quaternion.FromEulerAngles(0, Math.PI, 0);
        shield.parent = source;

        return source;
    }

    private _createSpinnerTankSource(parent: TransformNode): TransformNode {
        const coneDiameter = 0.4;
        const coneLength = 0.5;
        const sphereDiameter = 0.4;
        const barrelDiameter = 0.3;
        const barrelLength = 0.65;

        const metadata: PlayerTankMetadata = {
            displayName: "Spinner",
            size: 1,
            barrels: ["barrelL", "barrelR"],
            spinners: ["spinner"],
            multiplier: {},
        };

        const source = this._createTankBody(parent, "spinner", metadata);

        const cone = createCone("cone", coneDiameter, coneLength, this._scene);
        cone.position.z = 0.4;
        cone.material = this._material.gray;
        cone.parent = source;

        const sphere = createInstance(this._component.sphere, "spinner", source, this._color.gray);
        sphere.position.z = cone.position.z + coneLength;
        sphere.scaling.setAll(sphereDiameter);

        const barrelL = this._createSimpleBarrel(sphere, "barrelL", barrelDiameter, barrelLength);
        barrelL.rotation.y = -Math.PI / 2;

        const barrelR = this._createSimpleBarrel(sphere, "barrelR", barrelDiameter, barrelLength);
        barrelR.rotation.y = Math.PI / 2;

        return source;
    }

    private _createPropellerTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.45;
        const barrelLengthF = 0.75;
        const barrelLengthB = 0.65;

        const metadata: PlayerTankMetadata = {
            displayName: "Propeller",
            size: 1,
            barrels: ["barrelF", "barrelBL", "barrelBR"],
            multiplier: {},
        };

        const source = this._createTankBody(parent, "propeller", metadata);

        this._createSimpleBarrel(source, "barrelF", barrelDiameter, barrelLengthF, {
            damage: { value: 1.5, time: 1 },
            health: 1.5,
        });

        const multiplier = {
            damage: { value: 0.5, time: 1 },
            health: 0.5,
        };

        const barrelBL = this._createSimpleBarrel(source, "barrelBL", barrelDiameter, barrelLengthB, multiplier);
        barrelBL.rotation.y = -Tools.ToRadians(150);

        const barrelBR = this._createSimpleBarrel(source, "barrelBR", barrelDiameter, barrelLengthB, multiplier);
        barrelBR.rotation.y = Tools.ToRadians(150);

        return source;
    }

    private _createDoubleTwinTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.4;
        const barrelLengthF = 0.75;
        const barrelLengthB = 0.65;
        const barrelOffset = barrelDiameter * 0.51;

        const metadata: PlayerTankMetadata = {
            displayName: "Double Twin",
            size: 1,
            barrels: ["barrelFL", "barrelFR", "barrelBR", "barrelBL"],
            multiplier: {},
        };

        const source = this._createTankBody(parent, "doubleTwin", metadata);

        const barrelFL = this._createSimpleBarrel(source, "barrelFL", barrelDiameter, barrelLengthF);
        barrelFL.position.x = -barrelOffset;

        const barrelFR = this._createSimpleBarrel(source, "barrelFR", barrelDiameter, barrelLengthF);
        barrelFR.position.x = +barrelOffset;

        const barrelBR = this._createSimpleBarrel(source, "barrelBR", barrelDiameter, barrelLengthB);
        barrelBR.position.x = +barrelOffset;
        barrelBR.rotation.y = Math.PI;

        const barrelBL = this._createSimpleBarrel(source, "barrelBL", barrelDiameter, barrelLengthB);
        barrelBL.position.x = -barrelOffset;
        barrelBL.rotation.y = Math.PI;

        return source;
    }

    private _createAutoTwoTankSource(parent: TransformNode): TransformNode {
        const autoTankSize = 0.5;
        const barrelDiameter = 0.45;
        const barrelLength = 0.75;

        const metadata: PlayerTankMetadata = {
            displayName: "Auto-2",
            size: 1,
            barrels: ["barrelL", "barrelR"],
            tanks: ["tankL", "tankR"],
            multiplier: {},
        };

        const source = this._createTankBody(parent, "autoTwo", metadata);

        const offsetL = new TransformNode("offsetL", this._scene);
        offsetL.position.x = -0.55;
        offsetL.rotation.y = -Math.PI / 2;
        offsetL.parent = source;
        const tankL = this._createTankBody(offsetL, "tankL", { size: autoTankSize });
        tankL.rotation.y = Math.PI / 2;
        this._createSimpleBarrel(tankL, "barrelL", barrelDiameter, barrelLength);

        const offsetR = new TransformNode("offsetR", this._scene);
        offsetR.position.x = 0.55;
        offsetR.rotation.y = Math.PI / 2;
        offsetR.parent = source;
        const tankR = this._createTankBody(offsetR, "tankR", { size: autoTankSize });
        tankR.rotation.y = -Math.PI / 2;
        this._createSimpleBarrel(tankR, "barrelR", barrelDiameter, barrelLength);

        return source;
    }

    private _createQuadTankSource(parent: TransformNode): TransformNode {
        const barrelDiameter = 0.45;
        const barrelLength = 0.75;

        const metadata: PlayerTankMetadata = {
            displayName: "Quad",
            size: 1,
            barrels: ["barrelF", "barrelB", "barrelL", "barrelR"],
            multiplier: {},
        };

        const source = this._createTankBody(parent, "quad", metadata);

        const barrelF = this._createSimpleBarrel(source, "barrelF", barrelDiameter, barrelLength);
        barrelF.rotationQuaternion = Quaternion.Identity();

        const barrelB = this._createSimpleBarrel(source, "barrelB", barrelDiameter, barrelLength);
        barrelB.rotationQuaternion = Quaternion.FromEulerAngles(0, Math.PI, 0);

        const barrelL = this._createSimpleBarrel(source, "barrelL", barrelDiameter, barrelLength);
        barrelL.rotationQuaternion = Quaternion.FromEulerAngles(0, Math.PI * 0.5, 0);

        const barrelR = this._createSimpleBarrel(source, "barrelR", barrelDiameter, barrelLength);
        barrelR.rotationQuaternion = Quaternion.FromEulerAngles(0, Math.PI * 1.5, 0);

        return source;
    }
}
