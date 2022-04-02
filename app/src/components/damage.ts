import { DeepImmutable } from "@babylonjs/core/types";

export interface Damage {
    value: number;
    time: number;
    count: number;
}

export const DamageZero: DeepImmutable<Damage> = { value: 0, time: 0, count: 0 };

export class DamageWithMultiplier implements DeepImmutable<Damage> {
    private readonly _base: DeepImmutable<Damage>;
    private readonly _multiplier: Partial<DeepImmutable<Damage>>;

    public constructor(base: DeepImmutable<Damage>, multiplier?: Partial<DeepImmutable<Damage>>) {
        this._base = base;
        this._multiplier = multiplier || {};
    }

    public get value() { return this._base.value * (this._multiplier.value || 1); }
    public get time() { return this._base.time * (this._multiplier.time || 1); }
    public get count() { return this._base.count * (this._multiplier.count || 1); }
}