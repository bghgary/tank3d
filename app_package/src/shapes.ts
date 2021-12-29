import { InstancedMesh, Mesh, Scalar, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { ApplyCollisionForce, CollidableEntity } from "./collisions";
import { Entity, EntityType } from "./entity";
import { Health } from "./health";
import { Sources } from "./sources";
import { World } from "./world";

const IDLE_ROTATION_SPEED = 0.2;
const IDLE_MOVEMENT_SPEED = 0.1;
const RESPAWN_TIME = 1;
const RESPAWN_DROP_HEIGHT = 5;
const GRAVITY = 9.8;

class Shape implements CollidableEntity {
    private readonly _mesh: InstancedMesh;
    private readonly _health: Health;

    public constructor(mesh: InstancedMesh, healthMesh: InstancedMesh, size: number, health: number, damage: number) {
        this._mesh = mesh;
        this._health = new Health(healthMesh, size, health);
        this.size = size;
        this.mass = size * size;
        this.damage = damage;
    }

    // Entity
    public readonly type = EntityType.Shape;
    public readonly size: number;
    public readonly mass: number;
    public readonly damage: number;
    public get position(): Vector3 { return this._mesh.position; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._mesh.position.x - this.size * 0.5; }
    public get y() { return this._mesh.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public rotationVelocity = 0;
    public respawnTime = 0;

    public get name(): string { return this._mesh.name; }
    public get enabled(): boolean { return this._mesh.isEnabled(); }

    public update(deltaTime: number, halfWorldSize: number): boolean {
        if (!this._health.update(deltaTime)) {
            this._mesh.setEnabled(false);
            this.respawnTime = RESPAWN_TIME;
        }

        if (this._mesh.isEnabled()) {
            const halfSize = this.size * 0.5;

            this._mesh.position.x += this.velocity.x * deltaTime;
            if (this._mesh.position.x > halfWorldSize - halfSize) {
                this._mesh.position.x = halfWorldSize - halfSize;
                this.velocity.x = -this.velocity.x;
            } else if (this._mesh.position.x < -halfWorldSize + halfSize) {
                this._mesh.position.x = -halfWorldSize + halfSize;
                this.velocity.x = -this.velocity.x;
            }

            this._mesh.position.z += this.velocity.z * deltaTime;
            if (this._mesh.position.z > halfWorldSize - halfSize) {
                this._mesh.position.z = halfWorldSize - halfSize;
                this.velocity.z = -this.velocity.z;
            } else if (this._mesh.position.z < -halfWorldSize + halfSize) {
                this._mesh.position.z = -halfWorldSize + halfSize;
                this.velocity.z = -this.velocity.z;
            }

            if (this._mesh.position.y > 0) {
                this.velocity.y -= GRAVITY * deltaTime;
                this._mesh.position.y = Math.max(this._mesh.position.y + this.velocity.y * deltaTime, 0);
            } else {
                const oldSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
                const decayFactor = Math.exp(-deltaTime * 2);
                const newSpeed = IDLE_MOVEMENT_SPEED - (IDLE_MOVEMENT_SPEED - oldSpeed) * decayFactor;
                const speedFactor = newSpeed / oldSpeed;
                this.velocity.x *= speedFactor;
                this.velocity.z *= speedFactor;
            }

            this._mesh.rotation.y = (this._mesh.rotation.y + this.rotationVelocity * deltaTime) % Scalar.TwoPi;
        } else {
            this.respawnTime = Math.max(this.respawnTime - deltaTime, 0);
            if (this.respawnTime === 0) {
                return false;
            }
        }

        return true;
    }

    public onCollide(other: Entity): void {
        switch (other.type) {
            case EntityType.Bullet:
            case EntityType.Tank: {
                this._health.damage(other.damage);
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

export class Shapes {
    private readonly _sources: Sources;
    private readonly _halfWorldSize: number;
    private readonly _root: TransformNode;
    private readonly _shapes: Array<Shape>;

    constructor(world: World, numShapes: number) {
        this._sources = world.sources;
        this._halfWorldSize = world.size * 0.5;

        const scene = world.scene;

        this._root = new TransformNode("shapes", scene);

        this._shapes = new Array(numShapes);
        const padLength = (this._shapes.length - 1).toString().length;
        for (let index = 0; index < this._shapes.length; ++index) {
            const name = index.toString().padStart(padLength, "0");
            this._shapes[index] = this._createShape(name, 0);
        }

        scene.onAfterAnimationsObservable.add(() => {
            this._update(scene);
        });

        world.collisions.register({
            [Symbol.iterator]: this._getIterator.bind(this)
        });
    }

    private _createShape(name: string, dropHeight: number): Shape {
        const create = (source: Mesh, size: number, health: number, damage: number): Shape => {
            const mesh = this._sources.createInstance(source, name, this._root);
            const x = Scalar.RandomRange(-this._halfWorldSize + size, this._halfWorldSize - size);
            const z = Scalar.RandomRange(-this._halfWorldSize + size, this._halfWorldSize - size);
            mesh.position.set(x, dropHeight, z);
            mesh.rotation.y = Scalar.RandomRange(0, Scalar.TwoPi);

            const healthMesh = this._sources.createInstance(this._sources.health, "health", mesh);
            healthMesh.position.y = size * 0.5 + 0.2;
            healthMesh.scaling.x = size;
            healthMesh.billboardMode = Mesh.BILLBOARDMODE_Y;
            healthMesh.setEnabled(false);

            const shape = new Shape(mesh, healthMesh, size, health, damage);
            const mass = size * size;
            const randomAngle = Scalar.RandomRange(0, Scalar.TwoPi);
            shape.velocity.set(Math.cos(randomAngle) * IDLE_MOVEMENT_SPEED / mass, 0, Math.sin(randomAngle) * IDLE_MOVEMENT_SPEED / mass);
            shape.rotationVelocity = Math.sign(Math.random() - 0.5) * IDLE_ROTATION_SPEED / mass;

            return shape;
        };

        const entries = [
            { source: this._sources.cube,         size: 0.60, health: 10,  damage: 10  },
            { source: this._sources.tetrahedron,  size: 0.60, health: 30,  damage: 20  },
            { source: this._sources.dodecahedron, size: 1.00, health: 125, damage: 50  },
            { source: this._sources.goldberg11,   size: 1.62, health: 250, damage: 130 },
        ];

        const n = Math.random();
        const entry = entries[n < 0.6 ? 0 : n < 0.95 ? 1 : n < 0.99 ? 2 : 3];
        return create(entry.source, entry.size, entry.health, entry.damage);
    }

    private _update(scene: Scene): void {
        const deltaTime = 0.001 * scene.deltaTime;

        for (let index = 0; index < this._shapes.length; ++index) {
            const shape = this._shapes[index];
            if (!shape.update(deltaTime, this._halfWorldSize)) {
                this._shapes[index] = this._createShape(shape.name, RESPAWN_DROP_HEIGHT);
            }
        }
   }

    private *_getIterator(): Iterator<Shape> {
        for (const shape of this._shapes) {
            if (shape.position.y === 0 && shape.enabled) {
                yield shape;
            }
        }
    }
}