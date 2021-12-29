import { MeshBuilder, Vector3, TransformNode, StandardMaterial, InstancedMesh } from "@babylonjs/core";
import { CollidableEntity } from "./collisions";
import { Entity, EntityType } from "./entity";
import { Shape } from "./shapes";
import { World } from "./world";

const MAX_DURATION = 3;
const MAX_COUNT = 100;
const BULLET_MASS = 0.3;

export interface Bullet extends Entity {
    readonly damage: number;
    readonly uniqueId: number;
}

class BulletImpl implements Bullet, CollidableEntity {
    private readonly _mesh: InstancedMesh;
    private _health: number;

    public constructor(mesh: InstancedMesh, size: number) {
        this._mesh = mesh;
        this.size = size;
        this.mass = BULLET_MASS;
        this.damage = 6; // TODO
        this._health = 10; // TODO
    }

    // Bullet
    public readonly type = EntityType.Bullet;
    public readonly size: number;
    public readonly mass: number;
    public readonly damage: number;
    public get uniqueId(): number { return this._mesh.uniqueId; }
    public get position(): Vector3 { return this._mesh.position; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._mesh.position.x - this.size * 0.5; }
    public get y() { return this._mesh.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public targetSpeed = 0;
    public time = 0;

    public isEnabled(): boolean {
        return this._mesh.isEnabled();
    }

    public setEnabled(value: boolean): void {
        this._mesh.setEnabled(value);
    }

    public update(deltaTime: number): void {
        if (this._mesh.isEnabled()) {
            this._mesh.position.x += this.velocity.x * deltaTime;
            this._mesh.position.y += this.velocity.y * deltaTime;
            this._mesh.position.z += this.velocity.z * deltaTime;

            const oldSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
            const decayFactor = Math.exp(-deltaTime * 2);
            const newSpeed = this.targetSpeed - (this.targetSpeed - oldSpeed) * decayFactor;
            const speedFactor = newSpeed / oldSpeed;
            this.velocity.x *= speedFactor;
            this.velocity.z *= speedFactor;

            this.time += deltaTime;
            if (this.time > MAX_DURATION) {
                this._mesh.setEnabled(false);
            }
        }
    }

    public onCollide(other: Entity): void {
        switch (other.type) {
            case EntityType.Bullet: {
                break;
            }
            case EntityType.Shape: {
                const shape = other as Shape;
                this._health = Math.max(this._health - shape.damage, 0);
                if (this._health === 0) {
                    this.setEnabled(false);
                }
                break;
            }
        }
    }
}

export class Bullets {
    private readonly _bullets: Array<BulletImpl>;
    private _start = 0;
    private _count = 0;

    constructor(world: World, diameter: number) {
        const scene = world.scene;
        const root = new TransformNode("bullets", scene);

        const sources = new TransformNode("sources", scene);
        sources.parent = root;
        sources.setEnabled(false);

        const bulletSourceMesh = MeshBuilder.CreateSphere("bullet", { segments: 4 }, scene);
        bulletSourceMesh.parent = sources;
        const material = new StandardMaterial("bullet", scene);
        material.diffuseColor.set(0.3, 0.7, 1);
        bulletSourceMesh.material = material;

        this._bullets = new Array<BulletImpl>(MAX_COUNT);
        for (let index = 0; index < this._bullets.length; ++index) {
            const name = index.toString().padStart(2, "0");
            const mesh = bulletSourceMesh.createInstance(name);
            mesh.parent = root;
            mesh.scaling.setAll(diameter);
            mesh.isPickable = false;
            mesh.doNotSyncBoundingInfo = true;
            mesh.alwaysSelectAsActiveMesh = true;
            mesh.setEnabled(false);
            this._bullets[index] = new BulletImpl(mesh, diameter);
        }

        const bullets = {
            [Symbol.iterator]: this._getIterator.bind(this)
        };

        scene.onAfterAnimationsObservable.add(() => {
            for (const bullet of bullets) {
                bullet.update(scene.deltaTime * 0.001);
            }

            while (this._count > 0 && !this._bullets[this._start].isEnabled()) {
                this._start = (this._start + 1) % this._bullets.length;
                --this._count;
            }
        });

        world.collisions.register(bullets);
    }

    public add(position: Vector3, direction: Vector3, initialSpeed: number, targetSpeed: number, offset: number): void {
        const bullet = this._bullets[(this._start + this._count) % this._bullets.length];
        direction.scaleToRef(initialSpeed, bullet.velocity);
        bullet.targetSpeed = targetSpeed;
        bullet.time = 0;

        bullet.position.set(
            position.x + direction.x * offset,
            position.y + direction.y * offset,
            position.z + direction.z * offset);

        bullet.setEnabled(true);

        if (this._count == this._bullets.length) {
            this._start = (this._start + 1) % this._bullets.length;
        } else {
            ++this._count;
        }
    }

    private *_getIterator(): Iterator<BulletImpl> {
        const end = this._start + this._count;
        if (end <= this._bullets.length) {
            for (let index = this._start; index < end; ++index) {
                yield this._bullets[index];
            }
        } else {
            for (let index = this._start; index < this._bullets.length; ++index) {
                yield this._bullets[index];
            }
            for (let index = 0; index < end % this._bullets.length; ++index) {
                yield this._bullets[index];
            }
        }
    }
}
