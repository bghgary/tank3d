import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Observable } from "@babylonjs/core/Misc/observable";
import { Collider } from "./collisions";
import { ApplyCollisionForce, ApplyGravity, ApplyMovement, ApplyWallBounce } from "./common";
import { Entity, EntityType } from "./entity";
import { Health } from "./health";
import { Shadow } from "./shadow";
import { ShapeMetadata, Sources } from "./sources";
import { World } from "./world";

const IDLE_ROTATION_SPEED = 0.15;
const IDLE_MOVEMENT_SPEED = 0.05;
const SPAWN_TIME = 1;
const SPAWN_DROP_HEIGHT = 5;

export interface Shape extends Entity {
    readonly points: number;
}

export class Shapes {
    private readonly _sources: Sources;
    private readonly _worldSize: number;
    private readonly _root: TransformNode;
    private readonly _shapes = new Set<ShapeImpl>();
    private readonly _spawns = new Set<{ time: number }>();

    public constructor(world: World, maxCount: number) {
        this._sources = world.sources;
        this._worldSize = world.size;

        this._root = new TransformNode("shapes", world.scene);

        for (let index = 0; index < maxCount; ++index) {
            this._shapes.add(this._createShape(0));
        }

        world.collisions.register({
            [Symbol.iterator]: this._getCollidableEntities.bind(this)
        });
    }

    public onShapeDestroyedObservable = new Observable<{ shape: Shape, other: Entity }>();

    public update(deltaTime: number): void {
        for (const shape of this._shapes) {
            shape.update(deltaTime, this._worldSize, (entity) => {
                this._shapes.delete(shape);
                this.onShapeDestroyedObservable.notifyObservers({ shape: shape, other: entity });
                this._spawns.add({ time: SPAWN_TIME });
            });
        }

        for (const spawn of this._spawns) {
            spawn.time -= deltaTime;
            if (spawn.time <= 0) {
                this._shapes.add(this._createShape(SPAWN_DROP_HEIGHT));
                this._spawns.delete(spawn);
            }
        }
    }

    private _createShape(dropHeight: number): ShapeImpl {
        const create = (node: TransformNode, displayName: string, health: number, damage: number, points: number): ShapeImpl => {
            const shape = new ShapeImpl(this._sources, node, displayName, health, damage, points);

            const limit = (this._worldSize - shape.size) * 0.5;
            const x = Scalar.RandomRange(-limit, limit);
            const z = Scalar.RandomRange(-limit, limit);
            shape.position.set(x, dropHeight, z);

            const randomAngle = Scalar.RandomRange(0, Scalar.TwoPi);
            const speed = IDLE_MOVEMENT_SPEED / shape.mass;
            shape.velocity.x = Math.cos(randomAngle) * speed;
            shape.velocity.y = Math.sin(randomAngle) * speed;

            Quaternion.RotationYawPitchRollToRef(Scalar.RandomRange(0, Scalar.TwoPi), 0, 0, shape.rotation);

            const rotationSpeed = IDLE_ROTATION_SPEED / shape.mass;
            shape.rotationVelocity = Math.sign(Math.random() - 0.5) * rotationSpeed;

            return shape;
        };

        const entries = [
            { createNode: () => this._sources.createCubeShape(this._root),         displayName: "Cube",                  health: 10,  damage: 10,  points: 10  },
            { createNode: () => this._sources.createTetrahedronShape(this._root),  displayName: "Tetrahedron",           health: 30,  damage: 20,  points: 25  },
            { createNode: () => this._sources.createDodecahedronShape(this._root), displayName: "Dodecahedron",          health: 125, damage: 50,  points: 120 },
            { createNode: () => this._sources.createGoldberg11Shape(this._root),   displayName: "Truncated Isocahedron", health: 250, damage: 130, points: 200 },
        ];

        const n = Math.random();
        const entry = entries[n < 0.6 ? 0 : n < 0.95 ? 1 : n < 0.99 ? 2 : 3]!;
        return create(entry.createNode(), entry.displayName, entry.health, entry.damage, entry.points);
    }

    private *_getCollidableEntities(): Iterator<ShapeImpl> {
        for (const shape of this._shapes) {
            if (shape.position.y === 0) {
                yield shape;
            }
        }
    }
}

class ShapeImpl implements Shape, Collider {
    private readonly _node: TransformNode;
    private readonly _health: Health;
    private readonly _shadow: Shadow;

    private get _metadata(): ShapeMetadata {
        return this._node.metadata;
    }

    public constructor(sources: Sources, node: TransformNode, displayName: string, health: number, damage: number, points: number) {
        this._node = node;
        this._health = new Health(sources, node, health);
        this._shadow = new Shadow(sources, node);
        this.displayName = displayName;
        this.mass = this.size * this.size;
        this.damage = damage;
        this.points = points;
    }

    public dispose(): void {
        this._node.dispose();
    }

    // Entity
    public readonly displayName: string;
    public readonly type = EntityType.Shape;
    public get size() { return this._metadata.size; }
    public readonly mass: number;
    public readonly damage: number;
    public readonly points: number;
    public get position() { return this._node.position; }
    public get rotation() { return this._node.rotationQuaternion!; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._node.position.x - this.size * 0.5; }
    public get y() { return this._node.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public rotationVelocity = 0;

    public get name(): string { return this._node.name; }
    public get enabled(): boolean { return this._node.isEnabled(); }

    public update(deltaTime: number, worldSize: number, onDestroyed: (entity: Entity) => void): void {
        if (ApplyGravity(deltaTime, this._node.position, this.velocity)) {
            this._shadow.update();
        }

        if (this._node.position.y === 0) {
            ApplyMovement(deltaTime, this._node.position, this.velocity);
            ApplyWallBounce(this._node.position, this.velocity, this.size, worldSize);

            const oldSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
            if (oldSpeed > 0) {
                const decayFactor = Math.exp(-deltaTime * 2);
                const targetSpeed = IDLE_MOVEMENT_SPEED / this.mass;
                const newSpeed = targetSpeed - (targetSpeed - oldSpeed) * decayFactor;
                const speedFactor = newSpeed / oldSpeed;
                this.velocity.x *= speedFactor;
                this.velocity.z *= speedFactor;
            }
        }

        this._node.addRotation(0, this.rotationVelocity * deltaTime, 0);

        this._health.update(deltaTime, (entity) => {
            this._node.dispose();
            onDestroyed(entity);
        });
    }

    public onCollide(other: Entity): number {
        if (other.type === EntityType.Shape) {
            ApplyCollisionForce(this, other);
            return 0;
        }

        this._health.takeDamage(other);
        ApplyCollisionForce(this, other);
        return 1;
    }
}
