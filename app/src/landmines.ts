import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Collider } from "./colliders/collider";
import { applyGravity, computeMass, findNode } from "./common";
import { Flash, FlashState } from "./components/flash";
import { BarHealth } from "./components/health";
import { Shadow } from "./components/shadow";
import { Enemy, Entity, EntityType } from "./entity";
import { LandmineMetadata } from "./metadata";
import { Bullet } from "./projectiles/bullets";
import { World } from "./worlds/world";

const SPAWN_DROP_HEIGHT = 5;

export class Landmines {
    private readonly _world: World;
    private readonly _maxCount: number;
    private readonly _root: TransformNode;
    private readonly _landmines = new Set<Landmine>();
    private _spawnTime = Scalar.RandomRange(0, 30);

    public constructor(world: World, maxCount: number) {
        this._world = world;
        this._maxCount = maxCount;
        this._root = new TransformNode("landmines", this._world.scene);
    }

    public enabled = false;

    public update(deltaTime: number) {
        for (const landmine of this._landmines) {
            landmine.update(deltaTime, (source) => {
                this._landmines.delete(landmine);
                this._world.onEnemyDestroyedObservable.notifyObservers([source, landmine]);
            });
        }

        if (this.enabled && this._landmines.size < this._maxCount) {
            this._spawnTime = Math.max(this._spawnTime - deltaTime, 0);
            if (this._spawnTime === 0) {
                this._spawn();
                this._spawnTime = Scalar.RandomRange(30, 120);
            }
        }
    }

    private _spawn(): void {
        const node = this._world.sources.create(this._world.sources.landmine, this._root);
        const landmine = new Landmine(this._world, node);

        const limit = (this._world.size - landmine.size) * 0.5;
        const x = Scalar.RandomRange(-limit, limit);
        const z = Scalar.RandomRange(-limit, limit);
        landmine.position.set(x, SPAWN_DROP_HEIGHT, z);

        this._landmines.add(landmine);
    }
}

class Landmine implements Enemy {
    private readonly _world: World;
    private readonly _node: TransformNode;
    private readonly _metadata: LandmineMetadata;
    private readonly _shadow: Shadow;
    private readonly _flash: Flash;
    private readonly _health: BarHealth;

    private readonly _barrelNodes: Array<TransformNode>;

    public constructor(world: World, node: TransformNode) {
        this._world = world;
        this._node = node;
        this._metadata = this._node.metadata;
        this._shadow = new Shadow(this._world.sources, this._node);
        this._flash = new Flash(this._node);
        this._health = new BarHealth(this._world.sources, this._node, this._metadata.health);

        const collider = Collider.FromMetadata(this._node, this._metadata, this, this._onCollide.bind(this));
        this._world.collisions.register(collider);

        this._barrelNodes = this._metadata.barrels.map((barrel) => findNode(this._node, barrel));
    }

    // Entity
    public get displayName() { return this._metadata.displayName; }
    public readonly type = EntityType.Landmine;
    public get active() { return this._health.active && this._node.position.y === 0; }
    public get size() { return this._metadata.size; }
    public get mass() { return computeMass(1, this._metadata.size, this._metadata.height); }
    public get damage() { return this._metadata.damage; }
    public get position() { return this._node.position; }
    public get rotation() { return this._node.rotationQuaternion!; }
    public readonly velocity = Vector3.ZeroReadOnly;

    // Enemy
    public get points() { return this._metadata.points; }

    public update(deltaTime: number, onDestroy: (source: Entity) => void): void {
        if (applyGravity(deltaTime, this._node.position, this.velocity)) {
            this._shadow.update();
        } else {
            this._flash.update(deltaTime);
            if (!this._health.update(deltaTime)) {
                this._explode();
                onDestroy(this._health.damageEntity);
                this._node.dispose();
            }
        }
    }

    private _onCollide(other: Entity): number {
        if (other.type === EntityType.Landmine || (other.owner && other.owner.type === EntityType.Landmine)) {
            if (other.type !== EntityType.Bullet) {
                return 0;
            }
        } else {
            if (other.damage.value > 0) {
                this._flash.setState(FlashState.Damage);
                this._health.takeDamage(other);
            }
        }

        return other.damage.time;
    }

    private _explode(): void {
        const source = this._world.sources.bullet.landmine;
        const properties = this._metadata.bullet;
        for (const barrelNode of this._barrelNodes) {
            for (let i = 0; i < 10; ++i) {
                const bullet = this._world.bullets.add(Bullet, this, source, properties, barrelNode, 2);
                bullet.shoot(barrelNode);
            }
        }
    }
}
