import { Engine } from "@babylonjs/core/Engines/engine";
import { Nullable } from "@babylonjs/core/types";
import { Boss, Bosses } from "../bosses";
import { Crashers } from "../crashers";
import { Player } from "../player";
import { Shapes } from "../shapes";
import { World } from "./world";

export class BoxWorld extends World {
    private readonly _shapes: Shapes;
    private readonly _crashers: Crashers;
    private readonly _bosses: Bosses;
    private readonly _player: Player;

    private _keeperBoss?: Nullable<Boss>;

    public constructor(engine: Engine) {
        super(engine, 100);

        this._shapes = new Shapes(this, 200);
        this._crashers = new Crashers(this, 100);
        this._bosses = new Bosses(this);
        this._player = new Player(this);

        this.onEnemyDestroyedObservable.add(([_, target]) => {
            if (target === this._keeperBoss) {
                this._keeperBoss = null;
            }
        });

        this._player.onLevelChangedObservable.add((level) => {
            if (level < 20) {
                // do nothing
            } else if (level < 40) {
                if (this._keeperBoss === undefined) {
                    this._keeperBoss = this._bosses.addKeeper();
                }
            } else if (level < 60) {
                // TODO
            }
        });

        this._player.onDestroyedObservable.add(() => {
            if (this._keeperBoss === null) {
                delete this._keeperBoss;
            }
        });
    }

    protected override _update(deltaTime: number): void {
        this._shapes.update(deltaTime);
        this._player.update(deltaTime);
        this._crashers.update(deltaTime, this._player);
        this._bosses.update(deltaTime, this._player);
    }
}
