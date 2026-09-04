import type { Nuxt } from 'nuxt/schema'
import type { NuxtDevtoolsServerContext } from '../src/types'
import fsp from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setupAssetsRPC } from '../src/server-rpc/assets'

function fakeContext(srcDir: string): NuxtDevtoolsServerContext {
  return {
    nuxt: {
      options: {
        srcDir,
        dir: { public: 'public' },
        app: { baseURL: '/' },
        _layers: [],
      },
      hook: () => {},
    } as unknown as Nuxt,
    options: {},
    refresh: () => {},
  } as unknown as NuxtDevtoolsServerContext
}

describe('writeStaticAssets', () => {
  let root: string

  beforeEach(async () => {
    root = await fsp.mkdtemp(join(tmpdir(), 'devtools-assets-'))
    await fsp.mkdir(join(root, 'public'), { recursive: true })
  })

  afterEach(async () => {
    await fsp.rm(root, { recursive: true, force: true })
  })

  it('writes files inside the public directory', async () => {
    const { writeStaticAssets } = setupAssetsRPC(fakeContext(root))
    const [written] = await writeStaticAssets!([{ path: 'a.txt', content: 'hi' }], '')
    expect(written).toBe(join(root, 'public', 'a.txt'))
    expect(await fsp.readFile(written, 'utf-8')).toBe('hi')
  })

  it('rejects a folder that escapes the public directory', async () => {
    const { writeStaticAssets } = setupAssetsRPC(fakeContext(root))
    await expect(
      writeStaticAssets!([{ path: 'nuxt.config.ts', content: 'evil' }], '/../..'),
    ).rejects.toThrow(/outside of the public directory/)
  })

  it('rejects a file path that escapes the public directory', async () => {
    const { writeStaticAssets } = setupAssetsRPC(fakeContext(root))
    await expect(
      writeStaticAssets!([{ path: '../../etc/passwd', content: 'evil' }], ''),
    ).rejects.toThrow(/outside of the public directory/)
  })

  it('treats an absolute-looking path as relative to the public directory', async () => {
    const { writeStaticAssets } = setupAssetsRPC(fakeContext(root))
    const [written] = await writeStaticAssets!([{ path: '/passwd.txt', content: 'not the real one' }], '')
    expect(written).toBe(join(root, 'public', 'passwd.txt'))
  })
})
