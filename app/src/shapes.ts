import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Collider } from "./collisions";
import { applyCollisionForce, applyGravity, applyMovement, applyWallBounce, computeMass } from "./common";
import { Flash, FlashState } from "./components/flash";
import { BarHealth } from "./components/health";
import { Shadow } from "./components/shadow";
import { Entity, EntityType } from "./entity";
import { decayScalar } from "./math";
import { ShapeMetadata } from "./metadata";
import { World } from "./worlds/world";

const IDLE_ROTATION_SPEED = 0.15;
const IDLE_MOVEMENT_SPEED = 0.05;
const SPAWN_TIME = 1;
const SPAWN_DROP_HEIGHT = 5;

export interface Shape extends Entity {
    readonly points: number;
}

export class Shapes {
    private readonly _world: World;
    private readonly _root: TransformNode;
    private readonly _shapes = new Set<ShapeImpl>();
    private readonly _spawns = new Set<{ time: number }>();

    public constructor(world: World, maxCount: number) {
        this._world = world;
        this._root = new TransformNode("shapes", this._world.scene);

        for (let index = 0; index < maxCount; ++index) {
            this._shapes.add(this._createShape(0));
        }

        this._world.collisions.register(this._shapes);
    }

    public update(deltaTime: number): void {
        for (const shape of this._shapes) {
            shape.update(deltaTime, (source) => {
                this._shapes.delete(shape);
                this._world.onEnemyDestroyedObservable.notifyObservers([source, shape]);
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
        const sources = [
            this._world.sources.shape.cube,
            this._world.sources.shape.tetrahedron,
            this._world.sources.shape.dodecahedron,
            this._world.sources.shape.goldberg11,
        ];

        const n = Math.random();
        const source = sources[n < 0.6 ? 0 : n < 0.95 ? 1 : n < 0.99 ? 2 : 3]!;
        const node = this._world.sources.create(source, this._root);
        const shape = new ShapeImpl(this._world, node);

        const limit = (this._world.size - shape.size) * 0.5;
        const x = Scalar.RandomRange(-limit, limit);
        const z = Scalar.RandomRange(-limit, limit);
        shape.position.set(x, dropHeight, z);

        const randomAngle = Scalar.RandomRange(0, Scalar.TwoPi);
        const speed = IDLE_MOVEMENT_SPEED / shape.mass;
        shape.velocity.x = Math.cos(randomAngle) * speed;
        shape.velocity.y = Math.sin(randomAngle) * speed;

        Quaternion.FromEulerAnglesToRef(0, Scalar.RandomRange(0, Scalar.TwoPi), 0, shape.rotation);

        const rotationSpeed = IDLE_ROTATION_SPEED / shape.mass;
        shape.rotationVelocity = Math.sign(Math.random() - 0.5) * rotationSpeed;

        return shape;
    }
}

class ShapeImpl implements Shape, Collider {
    private readonly _world: World;
    private readonly _node: TransformNode;
    private readonly _metadata: ShapeMetadata;
    private readonly _shadow: Shadow;
    private readonly _flash: Flash;
    private readonly _health: BarHealth;

    public constructor(world: World, node: TransformNode) {
        this._world = world;
        this._node = node;
        this._metadata = this._node.metadata;
        this._flash = new Flash(this._node);
        this._health = new BarHealth(this._world.sources, this._node, this._metadata.health);
        this._shadow = new Shadow(this._world.sources, this._node);
    }

    public dispose(): void {
        this._node.dispose();
    }

    public get points() { return this._metadata.points; }

    // Entity
    public get displayName() { return this._metadata.displayName; }
    public readonly type = EntityType.Shape;
    public get active() { return this._health.active && this._node.position.y === 0; }
    public get size() { return this._metadata.size; }
    public get mass() { return computeMass(1, this._metadata.size, this._metadata.height); }
    public get damage() { return this._metadata.damage; }
    public get position() { return this._node.position; }
    public get rotation() { return this._node.rotationQuaternion!; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._node.position.x - this.size * 0.5; }
    public get y() { return this._node.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public rotationVelocity = 0;

    public update(deltaTime: number, onDestroy: (source: Entity) => void): void {
        if (applyGravity(deltaTime, this._node.position, this.velocity)) {
            this._shadow.update();
        } else {
            applyMovement(deltaTime, this._node.position, this.velocity);
            applyWallBounce(this._node.position, this.velocity, this.size, this._world.size);

            const oldSpeed = this.velocity.length();
            const targetSpeed = IDLE_MOVEMENT_SPEED / this.mass;
            const newSpeed = decayScalar(oldSpeed, targetSpeed, deltaTime, 2);
            this.velocity.scaleInPlace(newSpeed / Math.max(oldSpeed, 0.01));

            this._node.addRotation(0, this.rotationVelocity * deltaTime, 0);

            this._flash.update(deltaTime);
            if (!this._health.update(deltaTime)) {
                onDestroy(this._health.damageEntity);
                this._node.dispose();
            }
        }
    }

    public onCollide(other: Entity): number {
        if (other.type === EntityType.Shape) {
            applyCollisionForce(this, other);
            this.rotationVelocity = -this.rotationVelocity;
            return 0;
        }

        if (other.damage.value > 0) {
            this._flash.setState(FlashState.Damage);
            this._health.takeDamage(other);
        }

        applyCollisionForce(this, other);
        return other.damage.time;
    }
}
