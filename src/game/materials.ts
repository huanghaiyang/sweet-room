import { Material3D } from '@pixi/3d'
import { ToonMaterial } from '@pixi/3d/extras'

interface ToonOpts {
  outline?: boolean
  bands?: number
  rim?: number
}

const cache = new Map<string, ToonMaterial>()

/** 缓存复用的赛璐璐（卡通）材质 */
export function toon(color: string | number, opts: ToonOpts = {}): ToonMaterial {
  const outline = opts.outline ?? true
  const bands = opts.bands ?? 2
  const rim = opts.rim ?? 0.35
  const key = `${String(color)}|${outline}|${bands}|${rim}`
  let m = cache.get(key)
  if (!m) {
    m = new ToonMaterial({
      baseColor: color,
      bands,
      rimIntensity: rim,
      outline
    })
    cache.set(key, m)
  }
  return m
}

/** 自发光材质（灯罩、炭火、灯室），不参与缓存 */
export function glow(color: string | number, strength = 2.2): Material3D {
  return new Material3D({
    baseColor: color,
    emissive: { color, strength },
    roughness: 0.6,
    metallic: 0
  })
}

/** 通用 PBR 哑光材质（草地、墙面等大面积表面） */
export function matte(color: string | number, roughness = 0.95): Material3D {
  return new Material3D({ baseColor: color, roughness, metallic: 0 })
}

let _glass: Material3D | null = null
/** 半透明窗玻璃：双面、弱反光、不投影 */
export function glass(): Material3D {
  if (!_glass) {
    _glass = new Material3D({
      baseColor: 0x9ecfe0,
      roughness: 0.08,
      metallic: 0,
      alphaMode: 'blend',
      alpha: 0.45,
      doubleSided: true
    })
  }
  return _glass
}

let _invisible: Material3D | null = null
/** 仅用于拾取代理的全透明材质（不投射阴影、不写深度） */
export function invisible(): Material3D {
  if (!_invisible) {
    _invisible = new Material3D({
      baseColor: 0xffffff, alphaMode: 'blend', alpha: 0,
      roughness: 1, metallic: 0
    })
  }
  return _invisible
}
