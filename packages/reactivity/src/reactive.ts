import { isObject } from '@vue/shared';
import {
  mutableHandlers,
  shallowReactiveHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from './baseHandlers';

export function reactive(target) {
  return createReactiveObject(target, false, mutableHandlers);
}

export function shallowReactive(target) {
  return createReactiveObject(target, false, shallowReactiveHandlers);
}

export function readonly(target) {
  return createReactiveObject(target, true, readonlyHandlers);
}

export function shallowReadonly(target) {
  return createReactiveObject(target, true, shallowReadonlyHandlers);
}

// 是不是仅读，是不是深度 new Proxy() 最核心的需要拦截数据的读取和数据的修改 get set
// 每个方法都能根据不同的参数处理不同的逻辑（柯里化），根据参数实现不同的功能
// 内存空间
const reactiveMap = new WeakMap(); // 会自动垃圾回收，不会造成内存泄漏，key只能是对象
const readonlyMap = new WeakMap();
export function createReactiveObject(target, isReadonly, baseHandler) {
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
