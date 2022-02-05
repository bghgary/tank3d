import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "./sources";
import { TankProperties } from "./tank";

const SniperTankMultiplier: Partial<TankProperties> = {
    bulletSpeed: 2,
    reloadTime: 2,
};

const TwinTankMultiplier: Partial<TankProperties> = {};

const FlankGuardTankMultiplier: Partial<TankProperties> = {};

const PounderTankMultiplier: Partial<TankProperties> = {
    bulletDamage: 2,
    bulletHealth: 2,
    reloadTime: 2,
};

export interface EvolutionNode {
    readonly createTank: (sources: Sources, name?: string) => TransformNode;
    readonly tankMultiplier: Partial<TankProperties>;
    readonly children: Array<EvolutionNode>;
}

export const EvolutionTree: Array<EvolutionNode> = [{
    createTank: (sources, name) => sources.createTank(undefined, name),
    tankMultiplier: {},
    children: [{
        createTank: (sources, name) => sources.createSniperTank(undefined, name),
        tankMultiplier: SniperTankMultiplier,
        children: []
    }, {
        createTank: (sources, name) => sources.createTwinTank(undefined, name),
        tankMultiplier: TwinTankMultiplier,
        children: []
    }, {
        createTank: (sources, name) => sources.createFlankGuardTank(undefined, name),
        tankMultiplier: FlankGuardTankMultiplier,
        children: []
    }, {
        createTank: (sources, name) => sources.createPounderTank(undefined, name),
        tankMultiplier: PounderTankMultiplier,
        children: []
    }],
}];
