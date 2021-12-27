import { InstancedMesh, Mesh, MeshBuilder, Scalar, Scene, SmartArray, TransformNode, Vector3 } from "@babylonjs/core";
import { Collidable, Collider } from "./collisions";
import { ObjectType, World } from "./world";

const FALL_SPEED = 5;
const IDLE_ROTATION_SPEED = 0.2;
const IDLE_MOVEMENT_SPEED = 0.1;

interface Shape extends InstancedMesh {
    metadata: {
        type: ObjectType;
        velocity: Vector3;
        rotationSpeed: number;
        collider: Collider;
    }
}

export const enum ShapeType {
    Cube,
    Tetrahedron,
    Dodecahedron,
    Goldberg11,
}

const ShapeSize = new Map<ShapeType, number>([
    [ShapeType.Cube, 0.6],
    [ShapeType.Tetrahedron, 0.6],
    [ShapeType.Dodecahedron, 1],
    [ShapeType.Goldberg11, 1.8],
]);

export class Shapes {
    private readonly _worldSize: number;
    private readonly _root: TransformNode;
    private readonly _sources = new Map<ShapeType, Mesh>();
    private readonly _instances = new SmartArray<Shape>(100);

    constructor(world: World) {
        this._worldSize = world.size;

        const scene = world.scene;

        this._root = new TransformNode("shapes", scene);

        this._createSources(scene);

        scene.onAfterAnimationsObservable.add(() => {
            this._update(scene);
        });

        const shapes = {
            [Symbol.iterator]: this._getIterator.bind(this)
        };

        world.collisions.register(shapes);
    }

    public add(type: ShapeType, x: number, y: number, z: number): void {
        const instance = this._sources.get(type)!.createInstance(this._instances.length.toString().padStart(2, "0")) as Shape;
        instance.parent = this._root;
        instance.isPickable = false;
        instance.doNotSyncBoundingInfo = true;
        instance.alwaysSelectAsActiveMesh = true;

        instance.position.set(x, y, z);
        instance.rotation.y = Scalar.RandomRange(-Math.PI, Math.PI);

        const size = ShapeSize.get(type)!;
        const randomAngle = Scalar.RandomRange(0, Scalar.TwoPi);
        instance.metadata = {
            type: ObjectType.Shape,
            velocity: new Vector3(Math.cos(randomAngle) * IDLE_MOVEMENT_SPEED / size, -FALL_SPEED, Math.sin(randomAngle) * IDLE_MOVEMENT_SPEED / size),
            rotationSpeed: IDLE_ROTATION_SPEED / size,
            collider: {
                size: size,
                onCollide: (other) => this._onCollide(instance, other),
            },
        };

        this._instances.push(instance);
    }

    private _createSources(scene: Scene): void {
        const sources = new TransformNode("sources", scene);
        sources.parent = this._root;
        sources.setEnabled(false);

        const addSource = (source: Mesh, type: ShapeType): void => {
            source.bakeCurrentTransformIntoVertices();
            source.parent = sources;
            this._sources.set(type, source);
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

        const goldberg11 = MeshBuilder.CreateGoldberg("goldberg11", { m: 1, n: 1, size: 1 }, scene);
        addSource(goldberg11, ShapeType.Goldberg11);
    }

    private _update(scene: Scene): void {
        const deltaTime = 0.001 * scene.deltaTime;

        for (let index = 0; index < this._instances.length; ++index) {
            const instance = this._instances.data[index];
            const position = instance.position;
            const rotation = instance.rotation;
            const velocity = instance.metadata.velocity;
            const shapeSize = instance.metadata.collider.size;
            const halfWorldSize = this._worldSize * 0.5;

            position.x += velocity.x * deltaTime;
            if (position.x > halfWorldSize - shapeSize) {
                position.x = halfWorldSize - shapeSize;
                velocity.x = -velocity.x;
            } else if (position.x < -halfWorldSize + shapeSize) {
                position.x = -halfWorldSize + shapeSize;
                velocity.x = -velocity.x;
            }

            position.z += velocity.z * deltaTime;
            if (position.z > halfWorldSize - shapeSize) {
                position.z = halfWorldSize - shapeSize;
                velocity.z = -velocity.z;
            } else if (position.z < -halfWorldSize + shapeSize) {
                position.z = -halfWorldSize + shapeSize;
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
            if (instance.position.y === 0) {
                yield instance;
            }
        }
    }

    private _onCollide(shape: Shape, other: Collidable): void {
        switch (other.metadata.type) {
            case ObjectType.Shape: {
                const otherShape = other as Shape;
                const position = shape.position;
                const velocity = shape.metadata.velocity;
                const dx = position.x - otherShape.position.x;
                const dz = position.z - otherShape.position.z;
                const invLength = 1 / Math.sqrt(dx * dx + dz * dz);
                const factor = otherShape.metadata.collider.size / (shape.metadata.collider.size + otherShape.metadata.collider.size);
                velocity.x += dx * invLength * factor;
                velocity.z += dz * invLength * factor;
                shape.metadata.rotationSpeed = -shape.metadata.rotationSpeed;
                break;
            }
            case ObjectType.Bullet: {
                shape.setEnabled(false);
                break;
            }
        }
    }
}