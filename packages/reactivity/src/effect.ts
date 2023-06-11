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
  console.log('targetMap ==>', targetMap);
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
