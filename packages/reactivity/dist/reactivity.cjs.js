'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const isObject = (value) => value !== null && typeof value === 'object';
const extend = Object.assign;
const isArray = Array.isArray;
// 判断是不是一个数字类型的key
const isIntegerKey = (key) => parseInt(key) + '' === key;
const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key);
const hasChanged = (value, oldValue) => value !== oldValue;

function effect(fn, options = {}) {
    // 需要让这个effect变成响应式的effect，可以做到数据变化重新执行
    const effect = createReactivityEffect(fn, options);
    if (!options.lazy) {
        // lazy 属性用于标识effect是否是懒执行的
        effect(); // 响应式的effect默认会先执行一次
    }
    return effect;
}
let uid = 0;
let activeEffect; // 存储当前的effect
const effectStack = []; // 存储effect的栈
function createReactivityEffect(fn, options) {
    const effect = function reactivityEffect() {
        // 防止出现类似 state.xxx ++ 每次+1都会触发effect执行 死循环的情况
        if (!effectStack.includes(effect)) {
            // 保证effect没有加入到effectStack中
            try {
                effectStack.push(effect); // 将effect存入effectStack
                activeEffect = effect; // 此属性会和当前的属性做关联
                return fn(); // 函数执行时会取值，会执行get方法
            }
            finally {
                // try finally 确保fn出错时，仍能正确出栈
                effectStack.pop(); // 出栈 将effect移除
                activeEffect = effectStack[effectStack.length - 1]; // 获取栈中的最后一个
            }
        }
    };
    effect.id = uid++; // effect的唯一标识，组件渲染时会用到这个id
    effect._isEffect = true; // 用于标识这个是响应式effect
    effect.raw = fn; // 保留effect对应的原函数
    effect.options = options; // 在effect上保存用户的属性
    return effect;
}
// 让某个对象中的属性 收集当前他对应的effect函数
const targetMap = new WeakMap();
function track(target, type, key) {
    // 可以拿到当前的effect
    // activeEffect; // 当前正在运行的effect
    if (activeEffect === undefined) {
        // 此属性不用收集依赖，因为在effect外面使用的
        return;
    }
    // 判断映射表里是否有这个对象
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()));
    }
    // 判断value里是否有这个属性key（name、age）
    let dep = depsMap.get(key);
    if (!dep) {
        // 用set因为一个属性可能有多个effect，所以用一个集合来维护
        depsMap.set(key, (dep = new Set()));
    }
    // 判断当前属性是否有当前的effect
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect); // 收集对应的effect
    }
}
// weekMap key => {name: 'mh', age:27} value (map) => {name => set, age => set}
// 结构 {name: 'mh', age:27} => name => [effect effect]
// 函数调用是个栈型结构，后进先出 [effect1, effect2]
// 实现用到堆栈的原因，仅声明activeEffect会导致拿不到正确的effect
// effect(() => { // effect1
//   state.name -> effect1
//   effect(() => { //effect2
//     state.age; -> effect2
//   })
//   state.address -> effect2 应该为 effect1
// });
// 找属性对应的effect，让其执行（数组、对象）
function trigger(target, type, key, newValue, oldValue) {
    // 如果这个属性没有收集过effect，那不需要做任何操作
    const depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    const effects = new Set(); // 同一个effect中多个值变化，会合并去重，只会触发一次
    const add = (effectsToAdd) => {
        if (effectsToAdd) {
            effectsToAdd.forEach((effect) => effects.add(effect));
        }
    };
    // 我要将所有的要执行的effect 全部存到一个新的集合中，最终一起执行
    // 1.如果修改的是数组的长度，会触发数组的length属性，以及索引对应的属性
    if (key === 'length' && isArray(target)) {
        // 如果长度有依赖收集，那么修改length时，需要触发依赖收集
        depsMap.forEach((dep, key) => {
            // 类似一个hack
            if (key === 'length' || key > newValue)
                // length = 1 key = 2 如果更改的长度小于索引，那么对应的索引也需要触发effect重新执行
                add(dep);
        });
    }
    else {
        // 可能是对象
        if (key !== undefined) {
            // 这里肯定是修改，不能是新增
            add(depsMap.get(key)); // 如果是新增属性，那么也需要触发effect执行
        }
        // 如果添加了一个索引，就触发长度的更新
        switch (type) {
            case 0 /* TriggerOpTypes.ADD */:
                // target是数组且更改的是索引
                if (isArray(target) && isIntegerKey(key)) {
                    // 虽然改的是索引，但要触发length对应的effect
                    add(depsMap.get('length'));
                }
        }
    }
    effects.forEach((effect) => effect());
}

// 实现 new Proxy(target, baseHandlers) 的 baseHandlers
const get = createGetter();
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
const set = createSetter();
const shallowSet = true;
const mutableHandlers = {
    get,
    set,
};
const shallowReactiveHandlers = {
    get: shallowGet,
    set: shallowSet,
};
let readonlyObj = {
    set: (target, key) => {
        console.warn(`set key ${key} failed`);
    },
};
const readonlyHandlers = extend({
    get: readonlyGet,
}, readonlyObj);
const shallowReadonlyHandlers = extend({
    get: shallowReadonlyGet,
}, readonlyObj);
function createGetter(isReadonly = false, shallow = false) {
    // 拦截获取功能
    return function get(target, key, receiver) {
        // let proxy = reactive()
        // proxy + reflect 反射
        // 后续Object上的方法会被迁移到Reflect上， Object.getPrototypeOf => Reflect.getPrototypeOf
        // 以前target[key] = value 方式设置值可能会失败，比如原型上有这个属性，但是设置不成功。并不会报异常，也没有返回值标识
        // Reflect 方法具备返回值，返回值标识是否设置成功
        // reflect 使用可以不使用proxy 但是proxy必须配合reflect一起使用
        const res = Reflect.get(target, key, receiver); // target[key]
        if (!isReadonly) {
            // 可能被改，收集依赖，等会数据变化后更新对应的视图
            // console.log('执行ef fect时会取值', '收集effect');
            track(target, 0 /* TrackOpTypes.GET */, key);
        }
        if (shallow) {
            return res;
        }
        // 是对象 有可能要递归
        if (isObject(res)) {
            // vue2 是一上来就递归，vue3 是当取值的时候才会代理，vue3的代理模式是懒代理
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter(shallow = false) {
    return function set(target, key, value, receiver) {
        const oldValue = target[key]; // 获取老的值
        // 既是数组，修改的也是他的索引 如果索引比数组的长度大，相当于新增
        let hadKey = isArray(target) && isIntegerKey(key)
            ? Number(key) < target.length
            : hasOwn(target, key);
        const result = Reflect.set(target, key, value, receiver); // target[key] = value
        // 1. 要区分是新增还是修改 vue2里无法监控更改索引，无法监控数组的长度
        // 变化 => hack的方法，需要特殊处理
        if (!hadKey) {
            // 新增
            trigger(target, 0 /* TriggerOpTypes.ADD */, key, value);
        }
        else if (hasChanged(oldValue, value)) {
            // 修改
            trigger(target, 1 /* TriggerOpTypes.SET */, key, value);
        }
        // 当数据更新时，通知对应属性的effect重新执行
        return result;
    };
} // 拦截设置功能

function reactive(target) {
    return createReactiveObject(target, false, mutableHandlers);
}
function shallowReactive(target) {
    return createReactiveObject(target, false, shallowReactiveHandlers);
}
function readonly(target) {
    return createReactiveObject(target, true, readonlyHandlers);
}
function shallowReadonly(target) {
    return createReactiveObject(target, true, shallowReadonlyHandlers);
}
// 是不是仅读，是不是深度 new Proxy() 最核心的需要拦截数据的读取和数据的修改 get set
// 每个方法都能根据不同的参数处理不同的逻辑（柯里化），根据参数实现不同的功能
// 内存空间
const reactiveMap = new WeakMap(); // 会自动垃圾回收，不会造成内存泄漏，key只能是对象
const readonlyMap = new WeakMap();
function createReactiveObject(target, isReadonly, baseHandler) {
    // 如果目标不是对象，没法拦截，reactive这个api只能拦截对象类型
    if (!isObject(target)) {
        return target;
    }
    // 如果某个对象已经被代理过了，就不要再次代理了，可能一个对象被代理的是深度，又被仅读代理了
    const proxyMap = isReadonly ? readonlyMap : reactiveMap;
    const existProxy = proxyMap.get(target); // 如果已经被代理过了，就直接返回即可
    if (existProxy) {
        return existProxy;
    }
    const proxy = new Proxy(target, baseHandler);
    proxyMap.set(target, proxy); // 将要代理的对象和对应的代理结果缓存起来
    return proxy;
}

exports.effect = effect;
exports.reactive = reactive;
exports.readonly = readonly;
exports.shallowReactive = shallowReactive;
exports.shallowReadonly = shallowReadonly;
//# sourceMappingURL=reactivity.cjs.js.map
