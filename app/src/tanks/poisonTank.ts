import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Bullet } from "../projectiles/bullets";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { BulletTank } from "./bulletTank";
import { PlayerTank } from "./playerTank";

export class PoisonTank extends BulletTank {
    protected override readonly _bulletConstructor = PoisonBullet;
    protected override readonly _bulletSource = this._world.sources.bullet.tankPoison;

    public constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);
        this._bulletProperties.damage.poison = 1;
    }

    public override cameraRadiusMultiplier = 1.2;

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.poison, parent);
    }
}

class PoisonBullet extends Bullet {
    public override update(deltaTime: number, onDestroy: () => void): void {
        this._node.addRotation(0, this._targetVelocity.length() * deltaTime, 0);
        super.update(deltaTime, onDestroy);
    }
}
