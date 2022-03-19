export const enum WeaponType {
    Bullet,
    Drone,
    Trap,
    Lance,
}

export interface WeaponProperties {
    speed: number;
    damage: number;
    damageTime: number;
    health: number;
}
