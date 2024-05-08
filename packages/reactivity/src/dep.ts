import { ReactiveEffect, trackOpBit } from './effect'

export type Dep = Set<ReactiveEffect> & TrackedMarkers

/**

这句话是在描述 Vue 3 的 effect 追踪系统中的 wasTracked 和 newTracked 变量的作用。

main points:
wasTracked 和 newTracked 用于处理 effect 追踪递归的场景。
它们通过为每个递归层级维护一位状态位来定义依赖是否已被追踪。
每层递归一个 bit 用于记录该层级依赖的追踪状态。

具体意思是:
在同一个 effect 内如果存在多层的数据读取操作,就会产生递归。
为了正确处理依赖追踪,需要为每个递归层级维护一个状态位。
wasTracked 记录当前层级的依赖是否已被追踪。
newTracked 标记在当前层级依赖关系是否产生变化。
通过组合不同层级的状态位,可以还原出完整的依赖追踪信息。
这种设计避免了递归造成的重复追踪依赖,提升了效率。
总之,wasTracked 和 newTracked 通过记录每个递归层级的依赖追踪状态,优化了 Vue 的依赖追踪机制,避免递归造成的重复计算问题。

 */

/**
 * wasTracked and newTracked maintain the status for several levels of effect
 * tracking recursion. One bit per level is used to define whether the dependency
 * was/is tracked.
 */
type TrackedMarkers = {
  /**
   * wasTracked
   */
  w: number
  /**
   * newTracked
   */
  n: number
}

export const createDep = (effects?: ReactiveEffect[]): Dep => {
  const dep = new Set<ReactiveEffect>(effects) as Dep
  dep.w = 0
  dep.n = 0
  return dep
}

export const wasTracked = (dep: Dep): boolean => (dep.w & trackOpBit) > 0

export const newTracked = (dep: Dep): boolean => (dep.n & trackOpBit) > 0

export const initDepMarkers = ({ deps }: ReactiveEffect) => {
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].w |= trackOpBit // set was tracked
    }
  }
}

export const finalizeDepMarkers = (effect: ReactiveEffect) => {
  const { deps } = effect
  if (deps.length) {
    let ptr = 0
    for (let i = 0; i < deps.length; i++) {
      const dep = deps[i]
      if (wasTracked(dep) && !newTracked(dep)) {
        dep.delete(effect)
      } else {
        deps[ptr++] = dep
      }
      // clear bits
      dep.w &= ~trackOpBit
      dep.n &= ~trackOpBit
    }
    deps.length = ptr
  }
}
