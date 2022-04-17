import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { applyRecoil, findNode } from "../common";
import { Barrel } from "../components/barrel";
import { WeaponProperties, WeaponPropertiesWithMultiplier } from "../components/weapon";
import { Entity } from "../entity";
import { BarrelProjectileMetadata } from "../metadata";
import { Bullet } from "../projectiles/bullets";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { BulletTank } from "./bulletTank";
import { TankProperties } from "./playerTank";

export class LauncherTank extends BulletTank {
    protected override readonly _bulletConstructor = Missile;
    protected override readonly _bulletSource = this._world.sources.bullet.tankLauncher;

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.launcher, parent);
    }
}

interface PlayerTankInternal extends Entity {
    _properties: DeepImmutable<TankProperties>;
}

class Missile extends Bullet {
    private readonly _barrels: Array<Barrel>;
    private readonly _bulletSource: Mesh;
    private readonly _bulletProperties: DeepImmutable<WeaponProperties>;
    private readonly _getReloadTime: () => number;
    private _reloadTime: number;
    private _recoil = new Vector3();

    public constructor(world: World, owner: Entity, node: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        super(world, owner, node, properties, duration);

        const metadata = node.metadata as BarrelProjectileMetadata;
        this._barrels = metadata.barrels.map((name) => new Barrel(world, findNode(node, name)));
        this._bulletSource = world.sources.bullet.tank;
        this._bulletProperties = new WeaponPropertiesWithMultiplier(this._properties, metadata.multiplier);
        this._getReloadTime = () => (owner as PlayerTankInternal)._properties.reloadTime * (metadata.reloadMultiplier || 1);
        this._reloadTime = this._getReloadTime() * 0.5;
    }

    public override update(deltaTime: number, onDestroy: () => void): void {
        if (this._reloadTime === 0) {
            for (const barrel of this._barrels) {
                const bullet = barrel.shootBullet(Bullet, this.owner, this._bulletSource, this._bulletProperties, 2);
                applyRecoil(this._recoil, bullet);
            }

            this._reloadTime = this._getReloadTime();
        }

        for (const barrel of this._barrels) {
            barrel.update(deltaTime);
        }

        this._reloadTime = Math.max(this._reloadTime - deltaTime, 0);

        this.velocity.subtractInPlace(this._recoil);
        this._recoil.setAll(0);

        super.update(deltaTime, onDestroy);
    }
}
