import { Observable, Scalar, TransformNode, Vector3 } from "@babylonjs/core";
import { CollidableEntity } from "./collisions";
import { ApplyCollisionForce, ApplyGravity, ApplyMovement, ApplyWallBounce } from "./common";
import { Entity, EntityType } from "./entity";
import { Health } from "./health";
import { Sources } from "./sources";
import { World } from "./world";

const IDLE_ROTATION_SPEED = 0.15;
const IDLE_MOVEMENT_SPEED = 0.05;
const RESPAWN_TIME = 1;
const RESPAWN_DROP_HEIGHT = 5;

export interface Shape extends Entity {
    readonly points: number;
}

export class Shapes {
    private readonly _sources: Sources;
    private readonly _worldSize: number;
    private readonly _root: TransformNode;
    private readonly _shapes: Array<ShapeImpl>;

    constructor(world: World, count: number) {
        this._sources = world.sources;
        this._worldSize = world.size;

        this._root = new TransformNode("shapes", world.scene);

        this._shapes = new Array(count);
        const padLength = (this._shapes.length - 1).toString().length;
        for (let index = 0; index < this._shapes.length; ++index) {
            const name = index.toString().padStart(padLength, "0");
            this._shapes[index] = this._createShape(name, 0);
        }

        world.collisions.register({
            [Symbol.iterator]: this._getIterator.bind(this)
        });
    }

    public onShapeDestroyedObservable = new Observable<{ shape: Shape, other: Entity }>();

    public update(deltaTime: number): void {
        for (let index = 0; index < this._shapes.length; ++index) {
            const shape = this._shapes[index];
            if (shape.enabled) {
                shape.update(deltaTime, this._worldSize, (entity) => {
                    this.onShapeDestroyedObservable.notifyObservers({ shape: shape, other: entity });
                });
            } else {
                shape.respawnTime = Math.max(shape.respawnTime - deltaTime, 0);
                if (shape.respawnTime === 0) {
                    const name = shape.name;
                    shape.dispose();
                    this._shapes[index] = this._createShape(name, RESPAWN_DROP_HEIGHT);
                }
            }
        }
    }

    private _createShape(name: string, dropHeight: number): ShapeImpl {
        const create = (createInstance: (name: string, parent: TransformNode) => TransformNode, size: number, health: number, damage: number, points: number): ShapeImpl => {
            const node = createInstance(name, this._root);
            const healthNode = this._sources.createHealth("health", node, size, 0.2);
            const shape = new ShapeImpl(node, healthNode, size, health, damage, points);

            const limit = (this._worldSize - size) * 0.5;
            const x = Scalar.RandomRange(-limit, limit);
            const z = Scalar.RandomRange(-limit, limit);
            shape.position.set(x, dropHeight, z);

            const randomAngle = Scalar.RandomRange(0, Scalar.TwoPi);
            const speed = IDLE_MOVEMENT_SPEED / shape.mass;
            shape.velocity.x = Math.cos(randomAngle) * speed;
            shape.velocity.y = Math.sin(randomAngle) * speed;

            shape.rotation = Scalar.RandomRange(0, Scalar.TwoPi);

            const rotationSpeed = IDLE_ROTATION_SPEED / shape.mass;
            shape.rotationVelocity = Math.sign(Math.random() - 0.5) * rotationSpeed;

            return shape;
        };

        const entries = [
            { createInstance: this._sources.createCube,         size: 0.60, health: 10,  damage: 10,  points: 10  },
            { createInstance: this._sources.createTetrahedron,  size: 0.60, health: 30,  damage: 20,  points: 25  },
            { createInstance: this._sources.createDodecahedron, size: 1.00, health: 125, damage: 50,  points: 120 },
            { createInstance: this._sources.createGoldberg11,   size: 1.62, health: 250, damage: 130, points: 200 },
        ];

        const n = Math.random();
        const entry = entries[n < 0.6 ? 0 : n < 0.95 ? 1 : n < 0.99 ? 2 : 3];
        return create(entry.createInstance.bind(this._sources), entry.size, entry.health, entry.damage, entry.points);
    }

    private *_getIterator(): Iterator<ShapeImpl> {
        for (const shape of this._shapes) {
            if (shape.position.y === 0 && shape.enabled) {
                yield shape;
            }
        }
    }
}

class ShapeImpl implements Shape, CollidableEntity {
    private readonly _node: TransformNode;
    private readonly _health: Health;

    public constructor(node: TransformNode, healthNode: TransformNode, size: number, health: number, damage: number, points: number) {
        this._node = node;
        this._health = new Health(healthNode, size, health);
        this.size = size;
        this.mass = size * size;
        this.damage = damage;
        this.points = points;
    }

    public dispose(): void {
        this._node.dispose();
    }

    // Entity
    public readonly type = EntityType.Shape;
    public readonly size: number;
    public readonly mass: number;
    public readonly damage: number;
    public readonly points: number;
    public get position(): Vector3 { return this._node.position; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._node.position.x - this.size * 0.5; }
    public get y() { return this._node.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public get rotation(): number { return this._node.rotation.y; }
    public set rotation(value: number) { this._node.rotation.y = value; }
    public rotationVelocity = 0;

    public get name(): string { return this._node.name; }
    public get enabled(): boolean { return this._node.isEnabled(); }

    public respawnTime = RESPAWN_TIME;

    public update(deltaTime: number, worldSize: number, onDestroyed: (entity: Entity) => void): void {
        this._health.update(deltaTime, (entity) => {
            this._node.setEnabled(false);
            onDestroyed(entity);
        });

        if (this._node.isEnabled()) {
            ApplyGravity(deltaTime, this._node.position, this.velocity);

            if (this._node.position.y === 0) {
                ApplyMovement(deltaTime, this._node.position, this.velocity);
                ApplyWallBounce(this._node.position, this.velocity, this.size, worldSize);

                const oldSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
                const decayFactor = Math.exp(-deltaTime * 2);
                const targetSpeed = IDLE_MOVEMENT_SPEED / this.mass;
                const newSpeed = targetSpeed - (targetSpeed - oldSpeed) * decayFactor;
                const speedFactor = newSpeed / oldSpeed;
                this.velocity.x *= speedFactor;
                this.velocity.z *= speedFactor;
            }

            this._node.rotation.y = (this._node.rotation.y + this.rotationVelocity * deltaTime) % Scalar.TwoPi;
        }
    }

    public getCollisionRepeatRate(other: Entity): number {
        return (other.type === EntityType.Shape) ? 0 : 1;
    }

    public onCollide(other: Entity): void {
        switch (other.type) {
            case EntityType.Bullet:
            case EntityType.Tank:
            case EntityType.Crasher: {
                this._health.damage(other);
                ApplyCollisionForce(this, other);
                break;
            }
            case EntityType.Shape: {
                ApplyCollisionForce(this, other);
                break;
            }
        }
    }
}
