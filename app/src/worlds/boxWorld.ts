import { Engine } from "@babylonjs/core/Engines/engine";
import { Nullable } from "@babylonjs/core/types";
import { Bosses } from "../bosses";
import { Crashers } from "../crashers";
import { Enemy } from "../entity";
import { Landmines } from "../landmines";
import { Sentries } from "../sentries";
import { Shapes } from "../shapes";
import { World } from "./world";

export class BoxWorld extends World {
    private readonly _shapes: Shapes;
    private readonly _crashers: Crashers;
    private readonly _sentries: Sentries;
    private readonly _landmines: Landmines;
    private readonly _bosses: Bosses;

    private _keeperBoss?: Nullable<Enemy>;
    private _fortressBoss?: Nullable<Enemy>;

    public constructor(engine: Engine) {
        super(engine, 100);

        this._shapes = new Shapes(this, 200);
        this._crashers = new Crashers(this, 100);
        this._sentries = new Sentries(this, 20);
        this._landmines = new Landmines(this, 20);
        this._bosses = new Bosses(this);

        this.onEnemyDestroyedObservable.add(([_, target]) => {
            if (target === this._keeperBoss) {
                this._keeperBoss = null;
            }
        });

        this._player.onLevelChangedObservable.add((level) => {
            const level20 = level >= 20;
            const level40 = level >= 40;

            this._sentries.enabled = level20;
            this._landmines.enabled = level20;
            this._crashers.speedCrashersEnabled = level20;
            this._crashers.partyCrashersEnabled = level20;

            if (level20) {
                if (this._keeperBoss === undefined) {
                    this._keeperBoss = this._bosses.addKeeper();
                }
            }

            if (level40) {
                if (this._fortressBoss === undefined) {
                    this._fortressBoss = this._bosses.addFortress();
                }
            }
        });
    }

    protected override _update(deltaTime: number): void {
        this._shapes.update(deltaTime);
        this._player.update(deltaTime);
        this._crashers.update(deltaTime, this._player);
        this._sentries.update(deltaTime, this._player);
        this._landmines.update(deltaTime);
        this._bosses.update(deltaTime, this._player);
    }
}
