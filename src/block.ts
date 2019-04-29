/**
 * @license
 *
 * Copyright (c) 2019 Leung Ho Pan Alvin. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { classMap } from 'lit-html/directives/class-map';
import { directive, Part } from 'lit-html';



export type ComponentDefs<T extends PropertyKey = PropertyKey> = Readonly<Record<T, readonly [string, ModifierDefs]>>;

export type ModifierDefs<T extends PropertyKey = PropertyKey> = Readonly<Record<T, string>>;

export type Block<THostModifierKey extends PropertyKey, TComponentDefs extends ComponentDefs> =
    Component<THostModifierKey>
    & Readonly<{
        [K in keyof TComponentDefs]: Component<keyof TComponentDefs[K][1]>;
    }>;

export const block = <THostModifierKey extends PropertyKey, TComponentDefs extends ComponentDefs>(
    blockName: string,
    hostModifierDefs: ModifierDefs<THostModifierKey>,
    componentDefs: TComponentDefs
) => {

    const host = component(blockName, null, hostModifierDefs);

    const ret = directive(() => new Proxy<any>(host, {

        get(obj, prop) {
            const key = prop as keyof TComponentDefs;

            let val = obj[key];

            if (
                val === undefined
                && componentDefs[key] !== undefined
            ) {
                const [componentName, componentModifierDefs] = componentDefs[key];
                val = obj[key] = component(blockName, componentName, componentModifierDefs);
            }

            return val;
        }

    }))();

    return ret as Block<THostModifierKey, TComponentDefs>;
};



export type Component<TModifierKey extends PropertyKey> =
    AttributeBinder
    & ((modifierOptions: ModifierOptions<TModifierKey>) => AttributeBinder);

export type ModifierOptions<T extends PropertyKey = PropertyKey> = Partial<Readonly<Record<T, boolean>>>;

const isPart = (val: unknown): val is Part => {
    return typeof val === 'object' && val !== null && typeof (val as Part).commit === 'function';
};

const component = <TModifierKey extends PropertyKey>(
    blockName: string,
    componentName: string | null,
    modifierDefs: ModifierDefs<TModifierKey>
) => {

    const defaultAttributeBinder = attributeBinder(blockName, componentName, {});

    const ret = directive(() => new Proxy(defaultAttributeBinder, {

        apply(target, thisArg, args) {

            if (isPart(args[0])) {
                return target.apply(thisArg, args);

            } else {
                const [modifierOptions] = args;
                return attributeBinder.call(
                    thisArg,
                    blockName,
                    componentName,
                    Object.entries(modifierOptions)
                        .reduce<any>((map, [key, val]) => {
                            map[modifierDefs[key as TModifierKey]] = val;
                            return map;
                        }, {})
                );
            }
        }

    }))();

    return ret as Component<TModifierKey>;
};



export interface AttributeBinder {
    (part: Part): void;
    readonly blockName: string;
    readonly componentName: string | null;
    readonly id: string;
    readonly class: string;
}

const attributeBinder = (() => {

    const func = (
        blockName: string,
        componentName: string | null,
        modifierOptions: ModifierOptions
    ): AttributeBinder => {

        const baseName = componentName === null ? blockName : `${blockName}__${componentName}`;

        let cachedClassInfo: Readonly<Record<string, boolean>> | null = null;
        let cachedClassMap: ReturnType<typeof classMap> | null = null;
        let cachedClassStr: string | null = null;

        const getClassInfo = () => {
            if (cachedClassInfo === null) {
                cachedClassInfo = Object.entries(modifierOptions)
                    .reduce<Record<string, boolean>>((map, [key, val]) => {
                        if (val !== undefined) map[`${baseName}--${key}`] = val;
                        return map;
                    }, { [baseName]: true });
            }
            return cachedClassInfo;
        };

        const getClassMap = () => {
            if (cachedClassMap === null) {
                cachedClassMap = classMap(getClassInfo());
            }
            return cachedClassMap;
        };

        const getClass = () => {
            if (cachedClassStr === null) {
                cachedClassStr = [
                    baseName,
                    ...Object.entries(modifierOptions)
                        .filter(([_, val]) => val)
                        .map(([key]) => `${baseName}--${key}`)
                ].join(' ');
            }
            return cachedClassStr;
        };



        return Object.assign(
            (part: Part) => {
                return getClassMap()(part);
            },
            {
                get blockName() {
                    return blockName;
                },

                get componentName() {
                    return componentName;
                },

                get modifiers() {
                    return modifierOptions;
                },

                get baseName() {
                    return baseName;
                },

                get id() {
                    return baseName;
                },

                get class() {
                    return getClass();
                },

                get classInfo() {
                    return getClassInfo();
                }
            }
        );
    };

    return directive(func) as typeof func;
})();



// export const combine = directive((...args: ReadonlyArray<Readonly<{
//     classInfo: Readonly<Record<string, boolean>>;
//     classStr: string;
// }>>) => {

//     let cachedClassInfo: Readonly<Record<string, boolean>> | null = null;
//     let cachedClassMap: ReturnType<typeof classMap> | null = null;
//     let cachedClassStr: string | null = null;

//     const getClassInfo = () => {
//         if (cachedClassInfo === null) {
//             cachedClassInfo = Object.assign({}, ...args.map(arg => arg.classInfo)) as Exclude<typeof cachedClassInfo, null>;
//         }
//         return cachedClassInfo;
//     };

//     const getClassMap = () => {
//         if (cachedClassMap === null) {
//             cachedClassMap = classMap(getClassInfo());
//         }
//         return cachedClassMap;
//     };

//     const getClass = () => {
//         if (cachedClassStr === null) {
//             cachedClassStr = args.map(arg => arg.classStr).join(' ');
//         }
//         return cachedClassStr;
//     };



//     return Object.assign(
//         (...args: Parameters<ReturnType<typeof classMap>>) => {
//             return getClassMap()(...args);
//         }, {
//             get classInfo() {
//                 return getClassInfo();
//             },

//             get class() {
//                 return getClass();
//             }
//         }
//     );
// });
