import { MeshBuilder, Scene, Vector3, TransformNode, StandardMaterial, InstancedMesh } from "@babylonjs/core";

const MAX_DURATION = 3;
const MAX_COUNT = 100;

interface Bullet extends InstancedMesh {
    direction: Vector3;
    currentSpeed: number;
    targetSpeed: number;
    time: number;
}

export class Bullets {
    private readonly _instances: Array<Bullet>;
    private _start = 0;
    private _count = 0;

    constructor(scene: Scene) {
        const bullets = new TransformNode("bullets", scene);

        const sources = new TransformNode("sources", scene);
        sources.parent = bullets;
        sources.setEnabled(false);

        const bullet = MeshBuilder.CreateSphere("bullet", { segments: 4 }, scene);
        bullet.parent = sources;
        const material = new StandardMaterial("bullet", scene);
        material.diffuseColor.set(0.3, 0.7, 1);
        bullet.material = material;

        this._instances = new Array<Bullet>(MAX_COUNT);
        for (let index = 0; index < this._instances.length; ++index) {
            const instance = bullet.createInstance(index.toString().padStart(2, "0")) as Bullet;
            instance.parent = bullets;
            instance.direction = Vector3.Zero();
            instance.isPickable = false;
            instance.setEnabled(false);
            this._instances[index] = instance;
        }

        const update = (index: number) => {
            const instance = this._instances[index];
            const deltaTime = scene.deltaTime * 0.001;

            if (instance.time > 0) {
                const decayFactor = Math.exp(-deltaTime * 2);
                instance.currentSpeed = instance.targetSpeed - (instance.targetSpeed - instance.currentSpeed) * decayFactor;
                //console.log(`${bullet.currentSpeed} ${bullet.targetSpeed}`);
                const speedFactor = instance.currentSpeed * deltaTime;
                instance.position.x += instance.direction.x * speedFactor;
                instance.position.y += instance.direction.y * speedFactor;
                instance.position.z += instance.direction.z * speedFactor;
            }

            instance.time += deltaTime;
            if (instance.time > MAX_DURATION) {
                instance.setEnabled(false);
                if (index === this._start) {
                    while (this._count > 0 && !this._instances[this._start].isEnabled()) {
                        this._start = (this._start + 1) % this._instances.length;
                        --this._count;
                    }
                }
            }

            return instance;
        };

        scene.onAfterAnimationsObservable.add(() => {
            if (this._count > 0) {
                const end = this._start + this._count;
                if (end <= this._instances.length) {
                    for (let index = this._start; index < end; ++index) {
                        update(index);
                    }
                } else {
                    for (let index = this._start; index < this._instances.length; ++index) {
                        update(index);
                    }
                    for (let index = 0; index < end % this._instances.length; ++index) {
                        update(index);
                    }
                }
            }
        });
    }

    public add(position: Vector3, direction: Vector3, initialSpeed: number, targetSpeed: number, offset: number, size: number): void {
        const instance = this._instances[(this._start + this._count) % this._instances.length];
        instance.direction.copyFrom(direction);
        instance.currentSpeed = initialSpeed;
        instance.targetSpeed = targetSpeed;
        instance.time = 0;
        instance.position.set(
            position.x + direction.x * offset,
            position.y + direction.y * offset,
            position.z + direction.z * offset);
        instance.scaling.setAll(size);
        instance.setEnabled(true);

        if (this._count == this._instances.length) {
            this._start = (this._start + 1) % this._instances.length;
        } else {
            ++this._count;
        }
    }
}