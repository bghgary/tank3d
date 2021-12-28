import { MeshBuilder, Vector3, TransformNode, StandardMaterial, InstancedMesh } from "@babylonjs/core";
import { Entity, EntityData, EntityType } from "./entity";
import { ShapeData } from "./shapes";
import { World } from "./world";

const MAX_DURATION = 3;
const MAX_COUNT = 100;
const BULLET_MASS = 0.3;

export interface BulletData {
    readonly mass: number;
    readonly damage: number;
}

interface Bullet extends InstancedMesh, Entity {
    metadata: EntityData & BulletData & {
        readonly index: number;
        direction: Vector3;
        currentSpeed: number;
        targetSpeed: number;
        time: number;
        health: number;
    };
}

export class Bullets {
    private readonly _bullets: Array<Bullet>;
    private _start = 0;
    private _count = 0;

    constructor(world: World, diameter: number) {
        const scene = world.scene;
        const root = new TransformNode("bullets", scene);

        const sources = new TransformNode("sources", scene);
        sources.parent = root;
        sources.setEnabled(false);

        const bulletSource = MeshBuilder.CreateSphere("bullet", { segments: 4 }, scene);
        bulletSource.parent = sources;
        const material = new StandardMaterial("bullet", scene);
        material.diffuseColor.set(0.3, 0.7, 1);
        bulletSource.material = material;

        this._bullets = new Array<Bullet>(MAX_COUNT);
        for (let index = 0; index < this._bullets.length; ++index) {
            const bullet = bulletSource.createInstance(index.toString().padStart(2, "0")) as Bullet;
            bullet.metadata = {
                index: index,
                type: EntityType.Bullet,
                size: diameter,
                mass: BULLET_MASS,
                damage: 5, // TODO
                health: 10, // TODO
                direction: Vector3.Zero(),
                currentSpeed: 0,
                targetSpeed: 0,
                time: 0,
                onCollide: (other) => this._onCollide(bullet, other),
            };
            bullet.parent = root;
            bullet.scaling.setAll(diameter);
            bullet.isPickable = false;
            bullet.doNotSyncBoundingInfo = true;
            bullet.alwaysSelectAsActiveMesh = true;
            bullet.setEnabled(false);
            this._bullets[index] = bullet;
        }

        const update = (bullet: Bullet): void => {
            if (bullet.isEnabled()) {
                const metadata = bullet.metadata;
                const deltaTime = scene.deltaTime * 0.001;

                if (metadata.time > 0) {
                    const decayFactor = Math.exp(-deltaTime * 2);
                    metadata.currentSpeed = metadata.targetSpeed - (metadata.targetSpeed - metadata.currentSpeed) * decayFactor;
                    const speedFactor = metadata.currentSpeed * deltaTime;
                    bullet.position.x += metadata.direction.x * speedFactor;
                    bullet.position.y += metadata.direction.y * speedFactor;
                    bullet.position.z += metadata.direction.z * speedFactor;
                }

                metadata.time += deltaTime;
                if (metadata.time > MAX_DURATION) {
                    bullet.setEnabled(false);
                }
            }

            while (this._count > 0 && !this._bullets[this._start].isEnabled()) {
                this._start = (this._start + 1) % this._bullets.length;
                --this._count;
            }
        };

        const bullets = {
            [Symbol.iterator]: this._getIterator.bind(this)
        };

        scene.onAfterAnimationsObservable.add(() => {
            for (const bullet of bullets) {
                update(bullet);
            }
        });

        world.collisions.register(bullets);
    }

    public add(position: Vector3, direction: Vector3, initialSpeed: number, targetSpeed: number, offset: number): void {
        const bullet = this._bullets[(this._start + this._count) % this._bullets.length];

        const metadata = bullet.metadata;
        metadata.direction.copyFrom(direction);
        metadata.currentSpeed = initialSpeed;
        metadata.targetSpeed = targetSpeed;
        metadata.time = 0;

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

    private _onCollide(bullet: Bullet, other: Entity): void {
        switch (other.metadata.type) {
            case EntityType.Bullet: {
                break;
            }
            case EntityType.Shape: {
                const bulletData = bullet.metadata;
                const shapeData = other.metadata as unknown as ShapeData;
                bulletData.health -= shapeData.damage;
                if (bulletData.health < 0.001) {
                    bullet.setEnabled(false);
                }
                break;
            }
        }
    }

    private *_getIterator(): Iterator<Bullet> {
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