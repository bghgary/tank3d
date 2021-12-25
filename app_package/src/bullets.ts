import { MeshBuilder, SolidParticle, Scene, SolidParticleSystem, Vector3, Color4 } from "@babylonjs/core";

const MAX_DURATION = 3;
const MAX_COUNT = 1000;

interface Bullet extends SolidParticle {
    direction: Vector3;
    currentSpeed: number;
    targetSpeed: number;
    time: number;
}

export class Bullets {
    private _sps: SolidParticleSystem;
    private _start = 0;
    private _count = 0;

    constructor(scene: Scene) {
        this._sps = new SolidParticleSystem("bullets", scene);
        const bullet = MeshBuilder.CreateSphere("bullet", {}, scene);
        this._sps.addShape(bullet, MAX_COUNT);
        bullet.dispose();

        this._sps.buildMesh();
        this._sps.isAlwaysVisible = true;

        this._sps.computeParticleRotation = false;
        this._sps.computeParticleTexture = false;
        this._sps.computeParticleVertex = false;
        this._sps.computeBoundingBox = false;

        this._sps.updateParticle = (bullet: Bullet) => {
            bullet.direction = Vector3.Zero();
            bullet.isVisible = false;
            bullet.color = new Color4(0.3, 0.7, 1);
            return bullet;
        };

        this._sps.setParticles();

        this._sps.computeParticleColor = false;

        this._sps.updateParticle = (bullet: Bullet) => {
            const deltaTime = scene.deltaTime * 0.001;

            if (bullet.time > 0) {
                const decayFactor = Math.exp(-deltaTime * 2);
                bullet.currentSpeed = bullet.targetSpeed - (bullet.targetSpeed - bullet.currentSpeed) * decayFactor;
                //console.log(`${bullet.currentSpeed} ${bullet.targetSpeed}`);
                const speedFactor = bullet.currentSpeed * deltaTime;
                bullet.position.x += bullet.direction.x * speedFactor;
                bullet.position.y += bullet.direction.y * speedFactor;
                bullet.position.z += bullet.direction.z * speedFactor;
            }

            bullet.time += deltaTime;
            if (bullet.time > MAX_DURATION) {
                bullet.isVisible = false;
                if (bullet.id === this._start) {
                    while (this._count > 0 && !this._sps.particles[this._start].isVisible) {
                        this._start = (this._start + 1) % this._sps.nbParticles;
                        --this._count;
                    }
                }
            }

            return bullet;
        };

        scene.onAfterAnimationsObservable.add(() => {
            const end = this._start + this._count;
            if (end <= this._sps.nbParticles) {
                this._sps.setParticles(this._start, end - 1);
            } else {
                this._sps.setParticles(this._start, this._sps.nbParticles - 1, false);
                this._sps.setParticles(0, (end % this._sps.nbParticles) - 1);
            }
        });
    }

    public add(position: Vector3, direction: Vector3, initialSpeed: number, targetSpeed: number, offset: number, size: number): void {
        const bullet = this._sps.particles[(this._start + this._count) % this._sps.nbParticles] as Bullet;
        bullet.direction.copyFrom(direction);
        bullet.currentSpeed = initialSpeed;
        bullet.targetSpeed = targetSpeed;
        bullet.time = 0;
        bullet.isVisible = true;
        bullet.position.set(
            position.x + direction.x * offset,
            position.y + direction.y * offset,
            position.z + direction.z * offset);
        bullet.scaling.setAll(size);

        if (this._count == this._sps.nbParticles) {
            this._start = (this._start + 1) % this._sps.nbParticles;
        } else {
            ++this._count;
        }
    }
}