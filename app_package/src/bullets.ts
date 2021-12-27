import { MeshBuilder, Vector3, TransformNode, StandardMaterial, InstancedMesh } from "@babylonjs/core";
import { Collidable, Collider } from "./collisions";
import { ObjectType, World } from "./world";

const MAX_DURATION = 3;
const MAX_COUNT = 100;

interface Bullet extends InstancedMesh {
    metadata: {
        index: number;
        direction: Vector3;
        currentSpeed: number;
        targetSpeed: number;
        time: number;
        type: ObjectType;
        collider: Collider;
    };
}

export class Bullets {
    private readonly _instances: Array<Bullet>;
    private _start = 0;
    private _count = 0;

    constructor(world: World, diameter: number) {
        const scene = world.scene;
        const root = new TransformNode("bullets", scene);

        const sources = new TransformNode("sources", scene);
        sources.parent = root;
        sources.setEnabled(false);

        const bullet = MeshBuilder.CreateSphere("bullet", { segments: 4 }, scene);
        bullet.parent = sources;
        const material = new StandardMaterial("bullet", scene);
        material.diffuseColor.set(0.3, 0.7, 1);
        bullet.material = material;

        this._instances = new Array<Bullet>(MAX_COUNT);
        for (let index = 0; index < this._instances.length; ++index) {
            const instance = bullet.createInstance(index.toString().padStart(2, "0")) as Bullet;
            instance.metadata = {
                index: index, direction: Vector3.Zero(), currentSpeed: 0, targetSpeed: 0, time: 0,
                type: ObjectType.Bullet,
                collider: {
                    size: diameter,
                    onCollide: () => {},
                },
            };
            instance.parent = root;
            instance.scaling.setAll(diameter);
            instance.isPickable = false;
            instance.doNotSyncBoundingInfo = true;
            instance.alwaysSelectAsActiveMesh = true;
            instance.setEnabled(false);
            this._instances[index] = instance;
        }

        const update = (instance: Bullet): void => {
            const metadata = instance.metadata;
            const deltaTime = scene.deltaTime * 0.001;

            if (metadata.time > 0) {
                const decayFactor = Math.exp(-deltaTime * 2);
                metadata.currentSpeed = metadata.targetSpeed - (metadata.targetSpeed - metadata.currentSpeed) * decayFactor;
                const speedFactor = metadata.currentSpeed * deltaTime;
                instance.position.x += metadata.direction.x * speedFactor;
                instance.position.y += metadata.direction.y * speedFactor;
                instance.position.z += metadata.direction.z * speedFactor;
            }

            metadata.time += deltaTime;
            if (metadata.time > MAX_DURATION) {
                instance.setEnabled(false);
                if (instance.metadata.index === this._start) {
                    while (this._count > 0 && !this._instances[this._start].isEnabled()) {
                        this._start = (this._start + 1) % this._instances.length;
                        --this._count;
                    }
                }
            }
        };

        const bullets = {
            [Symbol.iterator]: this._getIterator.bind(this)
        };

        scene.onAfterAnimationsObservable.add(() => {
            for (const instance of bullets) {
                update(instance);
            }
        });

        world.collisions.register(bullets);
    }

    public add(position: Vector3, direction: Vector3, initialSpeed: number, targetSpeed: number, offset: number): void {
        const instance = this._instances[(this._start + this._count) % this._instances.length];

        const metadata = instance.metadata;
        metadata.direction.copyFrom(direction);
        metadata.currentSpeed = initialSpeed;
        metadata.targetSpeed = targetSpeed;
        metadata.time = 0;

        instance.position.set(
            position.x + direction.x * offset,
            position.y + direction.y * offset,
            position.z + direction.z * offset);

        instance.setEnabled(true);

        if (this._count == this._instances.length) {
            this._start = (this._start + 1) % this._instances.length;
        } else {
            ++this._count;
        }
    }

    private *_getIterator(): Iterator<Bullet> {
        const end = this._start + this._count;
        if (end <= this._instances.length) {
            for (let index = this._start; index < end; ++index) {
                yield this._instances[index];
            }
        } else {
            for (let index = this._start; index < this._instances.length; ++index) {
                yield this._instances[index];
            }
            for (let index = 0; index < end % this._instances.length; ++index) {
                yield this._instances[index];
            }
        }
    }
}