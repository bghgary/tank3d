import { MeshBuilder, SolidParticle, Scene, SolidParticleSystem, TmpVectors, Vector3, Color4 } from "@babylonjs/core";

const MAX_DURATION = 3000;
const MAX_COUNT = 1000;

interface BulletParticle extends SolidParticle {
    endTime: number;
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

        for (const particle of this._sps.particles) {
            particle.isVisible = false;
            particle.color = new Color4(0.3, 0.7, 1);
        }

        this._sps.setParticles();

        this._sps.computeParticleColor = false;

        const scaledVelocity = TmpVectors.Vector3[0];
        this._sps.updateParticle = (bullet: BulletParticle) => {
            bullet.velocity.scaleToRef(scene.getAnimationRatio(), scaledVelocity);
            bullet.position.addInPlace(scaledVelocity);
            if (Date.now() > bullet.endTime) {
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

        scene.onAfterRenderObservable.add(() => {
            const end = this._start + this._count;
            if (end <= this._sps.nbParticles) {
                this._sps.setParticles(this._start, end - 1);
            } else {
                this._sps.setParticles(this._start, this._sps.nbParticles - 1, false);
                this._sps.setParticles(0, (end % this._sps.nbParticles) - 1);
            }
        });
    }

    public add(position: Vector3, direction: Vector3, speed: number, offset: number, size: number): void {
        const bullet = this._sps.particles[(this._start + this._count) % this._sps.nbParticles] as BulletParticle;
        bullet.endTime = Date.now() + MAX_DURATION;
        bullet.isVisible = true;
        bullet.position.set(
            position.x + direction.x * offset,
            position.y + direction.y * offset,
            position.z + direction.z * offset);
        bullet.scaling.setAll(size);
        direction.scaleToRef(speed, bullet.velocity);

        if (this._count == this._sps.nbParticles) {
            this._start = (this._start + 1) % this._sps.nbParticles;
        } else {
            ++this._count;
        }
    }
}