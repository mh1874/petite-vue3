import { isArray, isIntegerKey } from '@vue/shared';
import { TriggerOpTypes } from './operators';

export function effect(fn, options: any = {}) {
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
      } finally {
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
export function track(target, type, key) {
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
export function trigger(target, type, key?, newValue?, oldValue?) {
  // 如果这个属性没有收集过effect，那不需要做任何操作
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

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
  } else {
    // 可能是对象
    if (key !== undefined) {
      // 这里肯定是修改，不能是新增
      add(depsMap.get(key)); // 如果是新增属性，那么也需要触发effect执行
    }
    // 如果添加了一个索引，就触发长度的更新
    switch (type) {
      case TriggerOpTypes.ADD:
        // target是数组且更改的是索引
        if (isArray(target) && isIntegerKey(key)) {
          // 虽然改的是索引，但要触发length对应的effect
          add(depsMap.get('length'));
        }
    }
  }
  effects.forEach((effect: any) => {
    if (effect.options.scheduler) {
      // 有调度器，走调度器
      effect.options.scheduler(effect);
    } else {
      effect();
    }
  });
}
