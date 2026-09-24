import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CurrentConfigCard } from './CurrentConfigCard'
import type { TtsConfig } from '../../types'

/**
 * CurrentConfigCard 单测 —— CP-NEW.13。
 *
 * 覆盖：5 个 provider 的 voice 字段映射 / API key 状态 / ffmpeg / doubao resource / loading / null
 */

const baseConfig: TtsConfig = {
  provider: 'indextts',
  source: 'db',
  api_key_set: false,
  updated_at: '2024-01-15T08:30:00Z',
  edge_voice: null,
  openai_base_url: null,
  openai_model: null,
  openai_voice: null,
  doubao_voice: null,
  doubao_resource_id: null,
  local_voice: null,
  ffmpeg_bin: null,
  indextts_base_url: 'http://127.0.0.1:8008/v1',
  indextts_model: 'IndexTTS-1.5',
  indextts_ref_audio: '/path/to/ref.wav',
  indextts_ref_text: '今天天气不错',
}

describe('CurrentConfigCard', () => {
  it('loading=true → skeleton', () => {
    const { container } = render(<CurrentConfigCard data={null} loading={true} />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('data=null + loading=false → 不渲染 skeleton，走 "—" 兜底', () => {
    // 实现：loading=false 且 data=null 时走 dl 渲染，"Provider / Voice / API key" 等字段都显示 "—"
    const { container } = render(<CurrentConfigCard data={null} loading={false} />)
    expect(container.querySelectorAll('.animate-pulse').length).toBe(0)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('provider=indextts 时 Voice 字段取 ref_audio 文件名', () => {
    render(<CurrentConfigCard data={baseConfig} loading={false} />)
    expect(screen.getByText('ref.wav')).toBeInTheDocument()
  })

  it('provider=edge 时 Voice 字段取 edge_voice', () => {
    render(
      <CurrentConfigCard
        data={{ ...baseConfig, provider: 'edge', edge_voice: 'zh-CN-XiaoxiaoNeural' }}
        loading={false}
      />,
    )
    expect(screen.getByText('zh-CN-XiaoxiaoNeural')).toBeInTheDocument()
  })

  it('provider=openai 时 Voice 字段取 openai_voice', () => {
    render(
      <CurrentConfigCard
        data={{
          ...baseConfig,
          provider: 'openai',
          openai_voice: 'alloy',
          openai_base_url: 'https://api.openai.com/v1',
          openai_model: 'tts-1',
        }}
        loading={false}
      />,
    )
    expect(screen.getByText('alloy')).toBeInTheDocument()
  })

  it('provider=local → 显示 ffmpeg 路径', () => {
    render(
      <CurrentConfigCard
        data={{
          ...baseConfig,
          provider: 'local',
          local_voice: 'Tingting',
          ffmpeg_bin: '/opt/homebrew/bin/ffmpeg',
        }}
        loading={false}
      />,
    )
    expect(screen.getByText('Tingting')).toBeInTheDocument()
    expect(screen.getByText('/opt/homebrew/bin/ffmpeg')).toBeInTheDocument()
  })

  it('provider=doubao → 显示 Resource ID', () => {
    render(
      <CurrentConfigCard
        data={{
          ...baseConfig,
          provider: 'doubao',
          doubao_voice: 'BV001_streaming',
          doubao_resource_id: 'seed-tts-2.0',
        }}
        loading={false}
      />,
    )
    expect(screen.getByText('BV001_streaming')).toBeInTheDocument()
    expect(screen.getByText('seed-tts-2.0')).toBeInTheDocument()
  })

  it('api_key_set=true → "已设置（末 4 位 xxxx）"', () => {
    render(
      <CurrentConfigCard
        data={{ ...baseConfig, provider: 'openai', api_key_set: true, api_key_last4: 'abcd' }}
        loading={false}
      />,
    )
    expect(screen.getByText(/已设置.*abcd/)).toBeInTheDocument()
  })

  it('api_key_set=false → "未设置"', () => {
    render(<CurrentConfigCard data={baseConfig} loading={false} />)
    expect(screen.getByText('未设置')).toBeInTheDocument()
  })

  it('source=db 渲染 Badge value=db', () => {
    render(<CurrentConfigCard data={{ ...baseConfig, source: 'db' }} loading={false} />)
    // Badge 直接渲染 value 字符串，tone 由 mapping 决定
    expect(screen.getByText('db')).toBeInTheDocument()
  })
})