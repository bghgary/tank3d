import { InstancedMesh, Mesh, MeshBuilder, Scalar, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { BulletData } from "./bullets";
import { ApplyCollisionForce, Entity, EntityData, EntityType } from "./entity";
import { World } from "./world";

const IDLE_ROTATION_SPEED = 0.2;
const IDLE_MOVEMENT_SPEED = 0.1;
const REGEN_TIME = 30;
const REGEN_SPEED = 5;
const RESPAWN_TIME = 1;
const RESPAWN_DROP_HEIGHT = 5;
const GRAVITY = 9.8;

export const enum ShapeType {
    Cube,
    Tetrahedron,
    Dodecahedron,
    Goldberg11,
}

export interface ShapeData {
    readonly size: number;
    readonly mass: number;
    readonly health: number;
    readonly damage: number;
};

interface HealthBar extends InstancedMesh {
    current: number;
    target: number;
    speed: number;
}

interface Shape extends InstancedMesh, Entity {
    metadata: EntityData & ShapeData & {
        velocity: Vector3;
        rotationVelocity: number;
        healthBar: HealthBar;
        bulletIds: Set<number>;
        regenTime: number;
        respawnTime: number;
    };
}

const shapeDataMap = new Map<ShapeType, ShapeData>([
    [ShapeType.Cube,            { size: 0.60,   mass: 0.36,     health: 10,     damage: 10  }],
    [ShapeType.Tetrahedron,     { size: 0.60,   mass: 0.36,     health: 30,     damage: 20  }],
    [ShapeType.Dodecahedron,    { size: 1.00,   mass: 1.00,     health: 125,    damage: 50  }],
    [ShapeType.Goldberg11,      { size: 1.62,   mass: 2.62,     health: 250,    damage: 130 }],
]);

export class Shapes {
    private readonly _halfWorldSize: number;
    private readonly _root: TransformNode;
    private readonly _shapeSources: Map<ShapeType, Mesh>;
    private readonly _healthBarSource: Mesh;
    private readonly _shapes: Array<Shape>;

    constructor(world: World, numShapes: number) {
        this._halfWorldSize = world.size * 0.5;

        const scene = world.scene;

        this._root = new TransformNode("shapes", scene);

        const sources = new TransformNode("sources", scene);
        sources.parent = this._root;
        sources.setEnabled(false);

        this._shapeSources = this._createShapeSources(sources);
        this._healthBarSource = this._createHealthSource(sources);

        this._shapes = new Array(numShapes);
        for (let index = 0; index < this._shapes.length; ++index) {
            this._shapes[index] = this._createShape(index, 0);
        }

        scene.onAfterAnimationsObservable.add(() => {
            this._update(scene);
        });

        world.collisions.register({
            [Symbol.iterator]: this._getIterator.bind(this)
        });
    }

    private _createShape(index: number, dropHeight: number): Shape {
        const n = Math.random();
        const shapeType = (n < 0.6) ? ShapeType.Cube : (n < 0.95) ? ShapeType.Tetrahedron : (n < 0.99) ? ShapeType.Dodecahedron : ShapeType.Goldberg11;
        const shapeSource = this._shapeSources.get(shapeType)!;
        const shapeData = shapeDataMap.get(shapeType)!;

        const shape = shapeSource.createInstance(index.toString().padStart(2, "0")) as Shape;
        shape.parent = this._root;
        shape.isPickable = false;
        shape.doNotSyncBoundingInfo = true;
        shape.alwaysSelectAsActiveMesh = true;

        const x = Scalar.RandomRange(-this._halfWorldSize + shapeData.size, this._halfWorldSize - shapeData.size);
        const z = Scalar.RandomRange(-this._halfWorldSize + shapeData.size, this._halfWorldSize - shapeData.size);
        shape.position.set(x, dropHeight, z);
        shape.rotation.y = Scalar.RandomRange(0, Scalar.TwoPi);

        const mass = shapeData.size * shapeData.size;
        const randomAngle = Scalar.RandomRange(0, Scalar.TwoPi);
        const velocity = new Vector3(Math.cos(randomAngle) * IDLE_MOVEMENT_SPEED / mass, 0, Math.sin(randomAngle) * IDLE_MOVEMENT_SPEED / mass);
        const rotationVelocity = Math.sign(Math.random() - 0.5) * IDLE_ROTATION_SPEED / mass;

        const healthBar = this._healthBarSource.createInstance("health") as HealthBar;
        healthBar.parent = shape;
        healthBar.isPickable = false;
        healthBar.doNotSyncBoundingInfo = true;
        healthBar.alwaysSelectAsActiveMesh = true;
        healthBar.position.y = shapeData.size * 0.5 + 0.2;
        healthBar.scaling.x = shapeData.size;
        healthBar.billboardMode = Mesh.BILLBOARDMODE_Y;
        healthBar.current = shapeData.health;
        healthBar.target = shapeData.health;
        healthBar.setEnabled(false);

        shape.metadata = {
            type: EntityType.Shape,
            size: shapeData.size,
            onCollide: (other) => this._onCollide(shape, other),
            mass: mass,
            health: shapeData.health,
            damage: shapeData.damage,
            velocity: velocity,
            rotationVelocity: rotationVelocity,
            healthBar: healthBar,
            bulletIds: new Set(),
            regenTime: 0,
            respawnTime: 0,
        };

        return shape;
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

        for (let index = 0; index < this._shapes.length; ++index) {
            const shape = this._shapes[index];
            const shapeData = shape.metadata;

            if (shape.isEnabled()) {
                const healthBar = shapeData.healthBar;
                if (healthBar.current > healthBar.target) {
                    healthBar.current = Math.max(healthBar.current - healthBar.speed * deltaTime, healthBar.target);
                    healthBar.scaling.x = healthBar.current / shapeData.health * shapeData.size;
                    if (healthBar.current === 0) {
                        shape.setEnabled(false);
                        shapeData.respawnTime = RESPAWN_TIME;
                    }
                } else if (healthBar.target > healthBar.current) {
                    healthBar.current = Math.min(healthBar.current + healthBar.speed * deltaTime, healthBar.target);
                    healthBar.scaling.x = healthBar.current / shapeData.health * shapeData.size;
                    if (healthBar.current === shapeData.health) {
                        healthBar.setEnabled(false);
                    }
                } else if (shapeData.regenTime > 0) {
                    shapeData.regenTime = Math.max(shapeData.regenTime - deltaTime, 0);
                    if (shapeData.regenTime === 0) {
                        healthBar.target = shapeData.health;
                        healthBar.speed = REGEN_SPEED;
                    }
                }

                const position = shape.position;
                const rotation = shape.rotation;
                const velocity = shapeData.velocity;
                const halfSize = shapeData.size * 0.5;

                position.x += velocity.x * deltaTime;
                if (position.x > this._halfWorldSize - halfSize) {
                    position.x = this._halfWorldSize - halfSize;
                    velocity.x = -velocity.x;
                } else if (position.x < -this._halfWorldSize + halfSize) {
                    position.x = -this._halfWorldSize + halfSize;
                    velocity.x = -velocity.x;
                }

                position.z += velocity.z * deltaTime;
                if (position.z > this._halfWorldSize - halfSize) {
                    position.z = this._halfWorldSize - halfSize;
                    velocity.z = -velocity.z;
                } else if (position.z < -this._halfWorldSize + halfSize) {
                    position.z = -this._halfWorldSize + halfSize;
                    velocity.z = -velocity.z;
                }

                if (position.y > 0) {
                    velocity.y -= GRAVITY * deltaTime;
                    position.y = Math.max(position.y + velocity.y * deltaTime, 0);
                } else {
                    const oldSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
                    const decayFactor = Math.exp(-deltaTime * 2);
                    const newSpeed = IDLE_MOVEMENT_SPEED - (IDLE_MOVEMENT_SPEED - oldSpeed) * decayFactor;
                    const speedFactor = newSpeed / oldSpeed;
                    velocity.x *= speedFactor;
                    velocity.z *= speedFactor;
                }

                rotation.y = (rotation.y + shapeData.rotationVelocity * deltaTime) % Scalar.TwoPi;
            } else {
                shapeData.respawnTime = Math.max(shapeData.respawnTime - deltaTime, 0);
                if (shapeData.respawnTime === 0) {
                    this._shapes[index].dispose();
                    this._shapes[index] = this._createShape(index, RESPAWN_DROP_HEIGHT);
                }
            }
        }
   }

    private _onCollide(shape: Shape, other: Entity): void {
        switch (other.metadata.type) {
            case EntityType.Bullet: {
                const shapeData = shape.metadata;
                shapeData.regenTime = REGEN_TIME;
                if (!shapeData.bulletIds.has(other.uniqueId)) {
                    shapeData.bulletIds.add(other.uniqueId);

                    const bulletData = other.metadata as unknown as BulletData;
                    const healthBar = shapeData.healthBar;
                    healthBar.target = Math.max(Math.min(healthBar.current, healthBar.target) - bulletData.damage, 0);
                    healthBar.speed = (healthBar.current - healthBar.target) * 10;
                    healthBar.setEnabled(true);

                    ApplyCollisionForce(shape, other);
                }
                break;
            }
            case EntityType.Shape: {
                ApplyCollisionForce(shape, other);
                break;
            }
        }
    }

    private *_getIterator(): Iterator<Shape> {
        for (const shape of this._shapes) {
            if (shape.position.y === 0 && shape.isEnabled()) {
                yield shape;
            }
        }
    }
}