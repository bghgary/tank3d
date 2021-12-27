import { InstancedMesh, Mesh, MeshBuilder, Scalar, Scene, SmartArray, TransformNode, Vector3 } from "@babylonjs/core";
import { Collider } from "./collisions";
import { ObjectType, World } from "./world";

const FALL_SPEED = 5;
const IDLE_ROTATION_SPEED = 0.2;
const IDLE_MOVEMENT_SPEED = 0.1;

interface Shape extends InstancedMesh {
    metadata: {
        velocity: Vector3;
        type: ObjectType;
        collider: Collider;
    }
}

export const enum ShapeType {
    Cube,
    Tetrahedron,
    Dodecahedron,
    Goldberg11,
}

export class Shapes {
    private readonly _worldSize: number;
    private readonly _root: TransformNode;
    private readonly _sources = new Map<ShapeType, Mesh>();
    private readonly _instances = new SmartArray<Shape>(100);

    constructor(world: World) {
        this._worldSize = world.size;

        const scene = world.scene;

        this._root = new TransformNode("shapes", scene);

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

        scene.onAfterAnimationsObservable.add(() => {
            const deltaTime = 0.001 * scene.deltaTime;

            for (let index = 0; index < this._instances.length; ++index) {
                const instance = this._instances.data[index];
                const position = instance.position;
                const rotation = instance.rotation;
                const velocity = instance.metadata.velocity;
                const halfWorldSize = this._worldSize * 0.5;

                position.x += velocity.x * deltaTime;
                if (Math.abs(position.x) >= halfWorldSize) {
                    velocity.x = -velocity.x;
                }

                position.z += velocity.z * deltaTime;
                if (Math.abs(position.z) >= halfWorldSize) {
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

                rotation.y = (instance.rotation.y + Math.sign(instance.rotation.y) * IDLE_ROTATION_SPEED * deltaTime) % Scalar.TwoPi;
            }
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

        const angle = Scalar.RandomRange(0, Scalar.TwoPi);
        instance.metadata = {
            velocity: new Vector3(Math.cos(angle) * IDLE_MOVEMENT_SPEED, -FALL_SPEED, Math.sin(angle) * IDLE_MOVEMENT_SPEED),
            type: ObjectType.Shape,
            collider: {
                size: 0.5,
                onCollide: (other) => {
                    switch (other.metadata.type) {
                        case ObjectType.Shape: {
                            const position = instance.position;
                            const rotation = instance.rotation;
                            const velocity = instance.metadata.velocity;
                            const dx = position.x - (other as Shape).position.x;
                            const dz = position.z - (other as Shape).position.z;
                            const invLength = 1 / Math.sqrt(dx * dx + dz * dz);
                            velocity.x += dx * invLength;
                            velocity.z += dz * invLength;
                            rotation.y -= Math.sign(rotation.y) * Scalar.TwoPi;
                            break;
                        }
                        case ObjectType.Bullet: {
                            instance.setEnabled(false);
                            break;
                        }
                    }
                },
            },
        };

        this._instances.push(instance);
    }

    private *_getIterator(): Iterator<Shape> {
        for (let index = 0; index < this._instances.length; ++index) {
            const instance = this._instances.data[index];
            if (instance.position.y === 0) {
                yield instance;
            }
        }
    }
}