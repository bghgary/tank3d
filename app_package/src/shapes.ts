import { InstancedMesh, Mesh, MeshBuilder, Scalar, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { Bullet } from "./bullets";
import { ApplyCollisionForce, CollidableEntity } from "./collisions";
import { Entity, EntityType } from "./entity";
import { World } from "./world";

const IDLE_ROTATION_SPEED = 0.2;
const IDLE_MOVEMENT_SPEED = 0.1;
const REGEN_TIME = 30;
const REGEN_SPEED = 5;
const RESPAWN_TIME = 1;
const RESPAWN_DROP_HEIGHT = 5;
const GRAVITY = 9.8;

export interface Shape extends Entity {
    readonly damage: number;
}

class Health {
    private readonly _mesh: InstancedMesh;

    public constructor(mesh: InstancedMesh, max: number) {
        this._mesh = mesh;
        this.max = this.current = this.target = max;
    }

    public readonly max: number;
    public current: number;
    public target: number;
    public speed = 0;

    public isEnabled(): boolean {
        return this._mesh.isEnabled();
    }

    public setEnabled(value: boolean): void {
        this._mesh.setEnabled(value);
    }

    public update(shape: ShapeImpl, deltaTime: number): void {
        if (this._mesh.isEnabled()) {
            if (this.current > this.target) {
                this.current = Math.max(this.current - this.speed * deltaTime, this.target);
                this._mesh.scaling.x = this.current / this.max * shape.size;
                if (this.current === 0) {
                    shape.setEnabled(false);
                    shape.respawnTime = RESPAWN_TIME;
                }
            } else if (this.current < this.target) {
                this.current = Math.min(this.current + this.speed * deltaTime, this.target);
                this._mesh.scaling.x = this.current / this.max * shape.size;
                if (this.current === this.max) {
                    this._mesh.setEnabled(false);
                }
            } else if (shape.regenTime > 0) {
                shape.regenTime = Math.max(shape.regenTime - deltaTime, 0);
                if (shape.regenTime === 0) {
                    this.target = this.max;
                    this.speed = REGEN_SPEED;
                }
            }
        }
    }
}

class ShapeImpl implements Shape, CollidableEntity {
    private readonly _mesh: InstancedMesh;
    private readonly _health: Health;
    private readonly _bulletIds = new Set<number>();

    public constructor(mesh: InstancedMesh, healthMesh: InstancedMesh, size: number, health: number, damage: number) {
        this._mesh = mesh;
        this._health = new Health(healthMesh, health);
        this.size = size;
        this.mass = size * size;
        this.damage = damage;
    }

    // Shape
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
    public regenTime = 0;
    public respawnTime = 0;

    public get name(): string {
        return this._mesh.name;
    }

    public isEnabled(): boolean {
        return this._mesh.isEnabled();
    }

    public setEnabled(value: boolean): void {
        this._mesh.setEnabled(value);
    }

    public update(deltaTime: number, halfWorldSize: number): boolean {
        this._health.update(this, deltaTime);

        if (this.isEnabled()) {
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
            case EntityType.Bullet: {
                const bullet = other as Bullet;

                this.regenTime = REGEN_TIME;
                if (!this._bulletIds.has(bullet.uniqueId)) {
                    this._bulletIds.add(bullet.uniqueId);
                    this._health.target = Math.max(Math.min(this._health.current, this._health.target) - bullet.damage, 0);
                    this._health.speed = (this._health.current - this._health.target) * 10;
                    this._health.setEnabled(true);

                    ApplyCollisionForce(this, other);
                }
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
    private readonly _halfWorldSize: number;
    private readonly _root: TransformNode;
    private readonly _sourceMeshCube: Mesh;
    private readonly _sourceMeshTetrahedron: Mesh;
    private readonly _sourceMeshDodecahedron: Mesh;
    private readonly _sourceMeshGoldberg11: Mesh;
    private readonly _sourceMeshHealth: Mesh;
    private readonly _shapes: Array<ShapeImpl>;

    constructor(world: World, numShapes: number) {
        this._halfWorldSize = world.size * 0.5;

        const scene = world.scene;

        this._root = new TransformNode("shapes", scene);

        const sources = new TransformNode("sources", scene);
        sources.parent = this._root;
        sources.setEnabled(false);

        this._sourceMeshCube = MeshBuilder.CreateBox("cube", { size: 0.4 }, scene);
        this._sourceMeshCube.rotation.x = Math.atan(1 / Math.sqrt(2));
        this._sourceMeshCube.rotation.z = Math.PI / 4;
        this._sourceMeshCube.bakeCurrentTransformIntoVertices();
        this._sourceMeshCube.parent = sources;

        this._sourceMeshTetrahedron = MeshBuilder.CreatePolyhedron("tetrahedron", { type: 0, size: 0.25 }, scene);
        this._sourceMeshTetrahedron.rotation.x = -Math.PI / 2;
        this._sourceMeshTetrahedron.bakeCurrentTransformIntoVertices();
        this._sourceMeshTetrahedron.parent = sources;

        this._sourceMeshDodecahedron = MeshBuilder.CreatePolyhedron("dodecahedron", { type: 2, size: 0.5 }, scene);
        this._sourceMeshDodecahedron.rotation.x = Math.PI / 2;
        this._sourceMeshDodecahedron.bakeCurrentTransformIntoVertices();
        this._sourceMeshDodecahedron.parent = sources;

        this._sourceMeshGoldberg11 = MeshBuilder.CreateGoldberg("goldberg11", { m: 1, n: 1, size: 0.9 }, scene);
        this._sourceMeshGoldberg11.parent = sources;

        this._sourceMeshHealth = MeshBuilder.CreatePlane("health", { width: 1, height: 0.08 }, scene);
        this._sourceMeshHealth.parent = sources;

        this._shapes = new Array(numShapes);
        for (let index = 0; index < this._shapes.length; ++index) {
            const name = index.toString().padStart(2, "0");
            this._shapes[index] = this._createShape(name, 0);
        }

        scene.onAfterAnimationsObservable.add(() => {
            this._update(scene);
        });

        world.collisions.register({
            [Symbol.iterator]: this._getIterator.bind(this)
        });
    }

    private _createShape(name: string, dropHeight: number): ShapeImpl {
        const create = (sourceMesh: Mesh, size: number, health: number, damage: number): ShapeImpl => {
            const mesh = sourceMesh.createInstance(name);
            mesh.parent = this._root;
            mesh.isPickable = false;
            mesh.doNotSyncBoundingInfo = true;
            mesh.alwaysSelectAsActiveMesh = true;

            const x = Scalar.RandomRange(-this._halfWorldSize + size, this._halfWorldSize - size);
            const z = Scalar.RandomRange(-this._halfWorldSize + size, this._halfWorldSize - size);
            mesh.position.set(x, dropHeight, z);
            mesh.rotation.y = Scalar.RandomRange(0, Scalar.TwoPi);

            const healthMesh = this._sourceMeshHealth.createInstance("health");
            healthMesh.parent = mesh;
            healthMesh.isPickable = false;
            healthMesh.doNotSyncBoundingInfo = true;
            healthMesh.alwaysSelectAsActiveMesh = true;
            healthMesh.position.y = size * 0.5 + 0.2;
            healthMesh.scaling.x = size;
            healthMesh.billboardMode = Mesh.BILLBOARDMODE_Y;
            healthMesh.setEnabled(false);

            const shape = new ShapeImpl(mesh, healthMesh, size, health, damage);
            const mass = size * size;
            const randomAngle = Scalar.RandomRange(0, Scalar.TwoPi);
            shape.velocity.set(Math.cos(randomAngle) * IDLE_MOVEMENT_SPEED / mass, 0, Math.sin(randomAngle) * IDLE_MOVEMENT_SPEED / mass);
            shape.rotationVelocity = Math.sign(Math.random() - 0.5) * IDLE_ROTATION_SPEED / mass;

            return shape;
        };

        const entries = [
            { sourceMesh: this._sourceMeshCube,         size: 0.60, health: 10,  damage: 10  },
            { sourceMesh: this._sourceMeshTetrahedron,  size: 0.60, health: 30,  damage: 20  },
            { sourceMesh: this._sourceMeshDodecahedron, size: 1.00, health: 125, damage: 50  },
            { sourceMesh: this._sourceMeshGoldberg11,   size: 1.62, health: 250, damage: 130 },
        ];

        const n = Math.random();
        const entry = entries[n < 0.6 ? 0 : n < 0.95 ? 1 : n < 0.99 ? 2 : 3];
        return create(entry.sourceMesh, entry.size, entry.health, entry.damage);
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

    private *_getIterator(): Iterator<ShapeImpl> {
        for (const shape of this._shapes) {
            if (shape.position.y === 0 && shape.isEnabled()) {
                yield shape;
            }
        }
    }
}