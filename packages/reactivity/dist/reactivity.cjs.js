'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const isObject = (value) => value !== null && typeof value === 'object';
const extend = Object.assign;

// 实现 new Proxy(target, baseHandlers) 的 baseHandlers
const get = createGetter();
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
const mutableHandlers = {
    get,
};
const shallowReactiveHandlers = {
    get: shallowGet,
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

// 导出方法 不实现功能
debugger;

exports.reactive = reactive;
exports.readonly = readonly;
exports.shallowReactive = shallowReactive;
exports.shallowReadonly = shallowReadonly;
//# sourceMappingURL=reactivity.cjs.js.map
