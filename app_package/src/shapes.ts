import { InstancedMesh, Mesh, MeshBuilder, Scalar, Scene, SmartArray, TransformNode, Vector3 } from "@babylonjs/core";
import { BulletData } from "./bullets";
import { Entity, EntityData, EntityType } from "./entity";
import { World } from "./world";

const FALL_SPEED = 5;
const IDLE_ROTATION_SPEED = 0.2;
const IDLE_MOVEMENT_SPEED = 0.1;

export const enum ShapeType {
    Cube,
    Tetrahedron,
    Dodecahedron,
    Goldberg11,
}

export interface ShapeData {
    readonly size: number;
    readonly health: number;
    readonly damage: number;
};

interface Shape extends InstancedMesh, Entity {
    metadata: EntityData & ShapeData & {
        velocity: Vector3;
        rotationSpeed: number;
        healthBar: InstancedMesh;
        bulletIds: Set<number>;
    };
}

const shapeDataMap = new Map<ShapeType, ShapeData>([
    [ShapeType.Cube,            { size: 0.60,   health: 10,     damage: 10  }],
    [ShapeType.Tetrahedron,     { size: 0.60,   health: 30,     damage: 20  }],
    [ShapeType.Dodecahedron,    { size: 1.00,   health: 125,    damage: 50  }],
    [ShapeType.Goldberg11,      { size: 1.62,   health: 250,    damage: 130 }],
]);

export class Shapes {
    private readonly _worldSize: number;
    private readonly _root: TransformNode;
    private readonly _shapeSources: Map<ShapeType, Mesh>;
    private readonly _healthBarSource: Mesh;
    private readonly _instances = new SmartArray<Shape>(0);

    constructor(world: World) {
        this._worldSize = world.size;

        const scene = world.scene;

        this._root = new TransformNode("shapes", scene);

        const sources = new TransformNode("sources", scene);
        sources.parent = this._root;
        sources.setEnabled(false);

        this._shapeSources = this._createShapeSources(sources);
        this._healthBarSource = this._createHealthSource(sources);

        scene.onAfterAnimationsObservable.add(() => {
            this._update(scene);
        });

        world.collisions.register({
            [Symbol.iterator]: this._getIterator.bind(this)
        });
    }

    public add(type: ShapeType, x: number, y: number, z: number): void {
        const instance = this._shapeSources.get(type)!.createInstance(this._instances.length.toString().padStart(2, "0")) as Shape;
        instance.parent = this._root;
        instance.isPickable = false;
        instance.doNotSyncBoundingInfo = true;
        instance.alwaysSelectAsActiveMesh = true;

        instance.position.set(x, y, z);
        instance.rotation.y = Scalar.RandomRange(-Math.PI, Math.PI);

        const shapeData = shapeDataMap.get(type)!;
        const randomAngle = Scalar.RandomRange(0, Scalar.TwoPi);

        const healthBar = this._healthBarSource.createInstance("health");
        healthBar.parent = instance;
        healthBar.position.y = shapeData.size * 0.5 + 0.2;
        healthBar.scaling.x = shapeData.size;
        healthBar.billboardMode = Mesh.BILLBOARDMODE_Y;
        healthBar.setEnabled(false);

        instance.metadata = {
            type: EntityType.Shape,
            size: shapeData.size,
            onCollide: (other) => this._onCollide(instance, other),
            velocity: new Vector3(Math.cos(randomAngle) * IDLE_MOVEMENT_SPEED / shapeData.size, -FALL_SPEED, Math.sin(randomAngle) * IDLE_MOVEMENT_SPEED / shapeData.size),
            rotationSpeed: IDLE_ROTATION_SPEED / shapeData.size,
            health: shapeData.health,
            damage: shapeData.damage,
            healthBar: healthBar,
            bulletIds: new Set(),
        };

        this._instances.push(instance);
    }

    private _createShapeSources(sources: TransformNode): Map<ShapeType, Mesh> {
        const scene = sources.getScene();

        const shapeSources = new Map<ShapeType, Mesh>();

        const addSource = (source: Mesh, type: ShapeType): void => {
            source.bakeCurrentTransformIntoVertices();
            source.parent = sources;
            shapeSources.set(type, source);
        };

        const cube = MeshBuilder.CreateBox("cube", { size: 0.4 }, scene);
        cube.rotation.x = Math.atan(1 / Math.sqrt(2));
        cube.rotation.z = Math.PI / 4;
        addSource(cube, ShapeType.Cube);

        const tetrahedron = MeshBuilder.CreatePolyhedron("tetrahedron", { type: 0, size: 0.25 }, scene);
        tetrahedron.rotation.x = -Math.PI / 2;
        tetrahedron.bakeCurrentTransformIntoVertices();
        addSource(tetrahedron, ShapeType.Tetrahedron);

        const dodecahedron = MeshBuilder.CreatePolyhedron("dodecahedron", { type: 2, size: 0.5 }, scene);
        dodecahedron.rotation.x = Math.PI / 2;
        dodecahedron.bakeCurrentTransformIntoVertices();
        addSource(dodecahedron, ShapeType.Dodecahedron);

        const goldberg11 = MeshBuilder.CreateGoldberg("goldberg11", { m: 1, n: 1, size: 0.9 }, scene);
        addSource(goldberg11, ShapeType.Goldberg11);

        return shapeSources;
    }

    private _createHealthSource(sources: TransformNode): Mesh {
        const scene = sources.getScene();
        const plane = MeshBuilder.CreatePlane("health", { width: 1, height: 0.08 }, scene);
        plane.parent = sources;
        return plane;
    }

    private _update(scene: Scene): void {
        const deltaTime = 0.001 * scene.deltaTime;

        for (let index = 0; index < this._instances.length; ++index) {
            const instance = this._instances.data[index];
            const position = instance.position;
            const rotation = instance.rotation;
            const velocity = instance.metadata.velocity;
            const halfSize = instance.metadata.size * 0.5;
            const halfWorldSize = this._worldSize * 0.5;

            position.x += velocity.x * deltaTime;
            if (position.x > halfWorldSize - halfSize) {
                position.x = halfWorldSize - halfSize;
                velocity.x = -velocity.x;
            } else if (position.x < -halfWorldSize + halfSize) {
                position.x = -halfWorldSize + halfSize;
                velocity.x = -velocity.x;
            }

            position.z += velocity.z * deltaTime;
            if (position.z > halfWorldSize - halfSize) {
                position.z = halfWorldSize - halfSize;
                velocity.z = -velocity.z;
            } else if (position.z < -halfWorldSize + halfSize) {
                position.z = -halfWorldSize + halfSize;
                velocity.z = -velocity.z;
            }

            if (position.y > 0) {
                position.y += velocity.y * deltaTime;
                position.y = 0;
            } else {
                const oldSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
                const decayFactor = Math.exp(-deltaTime * 1);
                const newSpeed = IDLE_MOVEMENT_SPEED - (IDLE_MOVEMENT_SPEED - oldSpeed) * decayFactor;
                const speedFactor = newSpeed / oldSpeed;
                velocity.x *= speedFactor;
                velocity.z *= speedFactor;
            }

            rotation.y += instance.metadata.rotationSpeed * deltaTime;
        }
   }

    private *_getIterator(): Iterator<Shape> {
        for (let index = 0; index < this._instances.length; ++index) {
            const instance = this._instances.data[index];
            if (instance.position.y === 0 && instance.isEnabled()) {
                yield instance;
            }
        }
    }

    private _onCollide(instance: Shape, other: Entity): void {
        switch (other.metadata.type) {
            case EntityType.Bullet: {
                const shapeData = instance.metadata;
                if (!shapeData.bulletIds.has(other.uniqueId)) {
                    shapeData.bulletIds.add(other.uniqueId);
                    const bulletData = other.metadata as unknown as BulletData;
                    const healthBar = shapeData.healthBar;
                    healthBar.scaling.x -= bulletData.damage * shapeData.size / shapeData.health;
                    if (healthBar.scaling.x < 0.001) {
                        instance.setEnabled(false);
                        // TODO: respawn logic
                    } else {
                        healthBar.setEnabled(true);
                    }
                }
                break;
            }
            case EntityType.Shape: {
                const data = instance.metadata;
                const otherData = other.metadata as unknown as ShapeData;
                const position = instance.position;
                const velocity = data.velocity;
                const dx = position.x - other.position.x;
                const dz = position.z - other.position.z;
                const invLength = 1 / Math.sqrt(dx * dx + dz * dz);
                const factor = otherData.size / (data.size + otherData.size);
                velocity.x += dx * invLength * factor;
                velocity.z += dz * invLength * factor;
                data.rotationSpeed = -data.rotationSpeed;
                break;
            }
        }
    }
}