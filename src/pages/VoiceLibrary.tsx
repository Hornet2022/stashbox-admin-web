import { useRef, useState, type FormEvent } from 'react'
import {
  createVoice,
  deleteVoice,
  fileToBase64,
  importVoiceFromConfig,
  listVoices,
  previewVoice,
  updateVoice,
} from '../api/admin'
import { toErrorMessage } from '../api/client'
import { useApi } from '../hooks/useApi'
import { useRole, hasPermission } from '../hooks/useRole'
import { toast } from '../store/toast'
import { Modal } from '../components/ui'
import {
  EmptyRow,
  ErrorNotice,
  Field,
  TableSkeleton,
  buttonGhostClass,
  buttonPrimaryClass,
  cellMutedClass,
  cellStrongClass,
  cellTextClass,
  footerCountClass,
  inputClass,
  pageHintClass,
  pageTitleClass,
  ReasonDialog,
  rowClass,
  tableWrapClass,
  thClass,
  theadClass,
} from '../components/ui'
import type { VoiceRow } from '../types'

/**
 * 音色库管理页 —— /api/v1/admin/tts/voices。
 *
 * 为什么需要这个页：IndexTTS 是零样本克隆，音色 = (参考音频, 参考文本) 对。
 * 在这之前服务端只有全局那**一份** `indextts_ref_audio`，所有用户共用一个音色，
 * 用户想换音色无从下手（`app/services/tts/indextts.py:19` 的注释说明了这一点）。
 *
 * 两个容易配错、界面上看不出来的点，这里用文案显式兜住：
 *   1. 参考文本必须与参考音频内容**一致**，否则克隆出的音色会念错
 *   2. 参考音频必须是 wav（后端校验 RIFF 头），且 ≤10MB
 *
 * 冷启动：迁移 0033 刻意没 seed 默认音色（迁移里读 env 会把本机绝对路径固化进库），
 * 所以第一次用要点右上角「从当前配置导入」。
 */

const columns = ['音色', '标识', '状态', '参考音频', '更新时间', '操作']

// 长度上限，**必须与服务端对齐**
// （backend/common/tts_voice_service.py 的 MAX_SLUG_LEN 等）。
// 自测时发现：表单没有 maxLength，用户把名字打长一点，服务端就
// StringDataRightTruncationError → 500 Internal Server Error，
// 用户完全看不出是自己名字太长。这里卡在输入侧，别让它出网。
const MAX_SLUG = 64
const MAX_DISPLAY_NAME = 64
const MAX_DESCRIPTION = 255
const MAX_REF_AUDIO_URL = 512

interface FormState {
  id: string | null
  slug: string
  displayName: string
  description: string
  refAudioUrl: string
  refText: string
  isDefault: boolean
  isActive: boolean
  sortOrder: string
}

const EMPTY_FORM: FormState = {
  id: null,
  slug: '',
  displayName: '',
  description: '',
  refAudioUrl: '',
  refText: '',
  isDefault: false,
  isActive: true,
  sortOrder: '0',
}

export function VoiceLibrary() {
  const role = useRole()
  const canOperate = hasPermission(role, ['super_admin', 'operator'])
  const { data, loading, error, missing, reload } = useApi(listVoices, 'tts-voices')
  const rows = data?.items ?? []

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<VoiceRow | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const [previewing, setPreviewing] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  /** 暂存上传的 base64，与 refAudioUrl 二选一 */
  const pendingB64 = useRef<string | null>(null)
  /**
   * 是否有已上传但未提交的文件。**必须是 state 而不是直接读 `pendingB64.current`** ——
   * ref 的变更不触发重渲染，渲染期读它会让「将使用上传的文件」这行提示永远不更新
   * （oxlint 的 react(refs) 规则就是在报这个）。
   */
  const [hasUpload, setHasUpload] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const openCreate = () => {
    pendingB64.current = null
    setHasUpload(false)
    setForm(EMPTY_FORM)
    setModalError(null)
    setModalOpen(true)
  }

  const openEdit = (v: VoiceRow) => {
    pendingB64.current = null
    setHasUpload(false)
    setForm({
      id: v.id,
      slug: v.slug,
      displayName: v.display_name,
      description: v.description ?? '',
      refAudioUrl: v.ref_audio_url,
      refText: v.ref_text,
      isDefault: v.is_default,
      isActive: v.is_active,
      sortOrder: String(v.sort_order),
    })
    setModalError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    pendingB64.current = null
    setHasUpload(false)
    setModalOpen(false)
    setSubmitting(false)
    setModalError(null)
    setUploading(false)
  }

  /** 文件选择 → base64。**不同时**往 refAudioUrl 写路径，避免两条来源打架。 */
  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.wav')) {
      setModalError('参考音频必须是 wav 文件（后端会校验 RIFF 头）')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setModalError('参考音频超过 10MB。零样本克隆通常 3~15 秒，请裁剪后再传')
      return
    }
    setUploading(true)
    setModalError(null)
    try {
      const b64 = await fileToBase64(file)
      setForm((prev) => ({ ...prev, refAudioUrl: '' }))
      pendingB64.current = b64
      setHasUpload(true)
    } catch (err) {
      setModalError(toErrorMessage(err, '读取音频文件失败'))
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form.displayName.trim()) {
      setModalError('音色名称不能为空')
      return
    }
    if (!form.slug.trim()) {
      setModalError('音色标识不能为空（App 侧用它做稳定缓存标识）')
      return
    }
    if (!form.refText.trim()) {
      setModalError('参考文本不能为空，且必须与参考音频内容一致')
      return
    }
    if (!form.refAudioUrl.trim() && !pendingB64.current) {
      setModalError('请填写参考音频路径，或上传 wav 文件')
      return
    }
    if (form.id && form.slug.trim() !== form.slug) {
      setModalError('音色标识创建后不应修改（App 侧按它缓存）')
      return
    }

    setSubmitting(true)
    setModalError(null)
    try {
      if (form.id) {
        await updateVoice(form.id, {
          display_name: form.displayName.trim(),
          description: form.description.trim(),
          // 不传就不改：后端按 model_fields_set 判定「不动」
          ...(pendingB64.current ? { ref_audio_b64: pendingB64.current } : {}),
          ...(!pendingB64.current && form.refAudioUrl.trim()
            ? { ref_audio_url: form.refAudioUrl.trim() }
            : {}),
          ref_text: form.refText.trim(),
          is_default: form.isDefault,
          is_active: form.isActive,
          sort_order: Number(form.sortOrder) || 0,
        })
        toast(`已保存音色「${form.displayName.trim()}」`, 'success')
      } else {
        await createVoice({
          slug: form.slug.trim(),
          display_name: form.displayName.trim(),
          description: form.description.trim() || null,
          ...(pendingB64.current
            ? { ref_audio_b64: pendingB64.current }
            : { ref_audio_url: form.refAudioUrl.trim() }),
          ref_text: form.refText.trim(),
          is_default: form.isDefault,
          is_active: form.isActive,
          sort_order: Number(form.sortOrder) || 0,
        })
        toast(`已创建音色「${form.displayName.trim()}」`, 'success')
      }
      pendingB64.current = null
      closeModal()
      reload()
    } catch (err) {
      setModalError(toErrorMessage(err))
      setSubmitting(false)
    }
  }

  const handleDelete = async (reason: string) => {
    if (!deleteTarget) return
    setDeleteSubmitting(true)
    try {
      await deleteVoice(deleteTarget.id, reason)
      toast(`已删除音色「${deleteTarget.display_name}」`, 'success')
      setDeleteTarget(null)
      setDeleteSubmitting(false)
      reload()
    } catch (err) {
      toast(toErrorMessage(err), 'error')
      setDeleteSubmitting(false)
    }
  }

  /** 试听：真调 oMLX 合成。参考音频/文本对不上只有真合成才会暴露。 */
  const handlePreview = async (v: VoiceRow) => {
    setPreviewing(v.id)
    try {
      const result = await previewVoice(v.id, '这是一段试听文本，用来确认这个音色的效果。')
      window.open(result.audio_url, '_blank', 'noopener')
      toast(`试听已生成（${result.duration_sec} 秒）`, 'success')
    } catch (err) {
      toast(toErrorMessage(err, '试听失败'), 'error')
    } finally {
      setPreviewing(null)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const result = await importVoiceFromConfig()
      toast(
        result.created
          ? `已导入音色「${result.voice.display_name}」`
          : '当前配置此前已导入过，未重复创建',
        'success',
      )
      reload()
    } catch (err) {
      toast(toErrorMessage(err, '导入失败'), 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={pageTitleClass}>音色库</h1>
          <p className={pageHintClass}>
            可供选择的朗读音色。音色由一段参考音频克隆而来，
            参考音频和参考文本必须一致，否则合成质量会下降
          </p>
        </div>
        <div className="flex gap-2">
          {canOperate && (
            <button
              type="button"
              className={buttonGhostClass}
              onClick={handleImport}
              disabled={importing}
              title="把当前 TTS 配置里的 indextts_ref_audio 收编成音色库第一条（首次使用需点一次）"
            >
              {importing ? '导入中…' : '从当前配置导入'}
            </button>
          )}
          {canOperate && (
            <button type="button" className={buttonPrimaryClass} onClick={openCreate}>
              新增音色
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 && !loading && !error && (
        <div className="mt-4 rounded border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-ink dark:border-warning/40 dark:bg-warning/10 dark:text-[#E8CFAE]">
          音色库是空的。此时蒸馏仍会用全局 TTS 配置里的参考音频（不会失败），
          但用户无法选择音色。点「从当前配置导入」可零输入完成冷启动。
        </div>
      )}

      {/*
        有音色但**没有默认音色**时必须提示 —— 这是自测时真踩到的状态：
        把默认音色删掉后（探测时干的），解析链会落到全局 TTS 配置，
        App 端「跟随默认音色」那行就显示「当前：系统全局配置」。
        后台当时毫无提示，管理员根本不知道发生了什么、也不知道要去设置。
        系统**允许**没有默认音色（不会挂），所以得靠界面说清楚。
      */}
      {rows.length > 0 && !rows.some((v) => v.is_default) && !loading && !error && (
        <div className="mt-4 rounded border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-ink dark:border-warning/40 dark:bg-warning/10 dark:text-[#E8CFAE]">
          当前<strong>没有默认音色</strong>。用户在 App 里选「跟随默认音色」时会回落到
          全局 TTS 配置的参考音频，而不是这里的某一条。编辑任一音色并勾选
          「设为全局默认音色」即可恢复。
        </div>
      )}

      {error && <ErrorNotice message={error} missing={missing} onRetry={reload} />}

      <div className={tableWrapClass}>
          {/* w-full 不带 min-w-max 时表格会被压进容器宽度里挤列：375px 下 7 列
      平均每列 49px，中文单元格会被挤成一两个字一行 —— 就是本仓库
      f102934 修过的那个竖排。带 min-w-max 才是「保持自然宽度 + 横向滚动」，
      降级方式才对。仓库里已有 5 张表是这个写法，这里补齐其余的。 */}
        <table className="w-full min-w-max text-left text-sm">
          <thead className={theadClass}>
            <tr>
              {columns.map((col) => (
                <th key={col} scope="col" className={thClass}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton colSpan={columns.length} rows={5} />
            ) : rows.length === 0 ? (
              <EmptyRow
                colSpan={columns.length}
                text={error ? '数据不可用' : '暂无音色，点右上角「从当前配置导入」'}
              />
            ) : (
              rows.map((v) => (
                <tr key={v.id} className={rowClass}>
                  <td className={cellStrongClass}>
                    {v.display_name}
                    {!v.is_active && (
                      <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                        已下架
                      </span>
                    )}
                    {v.description && (
                      <span className="ml-2 text-xs text-neutral-400">{v.description}</span>
                    )}
                  </td>
                  <td className={cellMutedClass}>{v.slug}</td>
                  <td className={cellTextClass}>
                    {v.is_default ? '默认' : '—'}
                  </td>
                  <td className={`${cellMutedClass} max-w-xs truncate`} title={v.ref_audio_url}>
                    {v.ref_audio_url}
                  </td>
                  <td className={`${cellMutedClass} whitespace-nowrap`}>
                    {v.updated_at ? v.updated_at.replace('T', ' ').slice(0, 19) : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {canOperate ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className={buttonGhostClass}
                          onClick={() => handlePreview(v)}
                          disabled={previewing === v.id || !v.is_active}
                          title={v.is_active ? '真合成一段试听' : '已下架的音色不能试听'}
                        >
                          {previewing === v.id ? '合成中…' : '试听'}
                        </button>
                        <button
                          type="button"
                          className={buttonGhostClass}
                          onClick={() => openEdit(v)}
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          className={`${buttonGhostClass} border-error/40 text-error-ink hover:bg-error/10`}
                          onClick={() => setDeleteTarget(v)}
                        >
                          删除
                        </button>
                      </div>
                    ) : (
                      // 这里原来用 cellMutedClass，那是一条带 px-4 py-3 的单元格类，
                      // 套在已经有 px-4 py-3 的操作格里 → 破折号比同格的
                      // 试听/编辑/删除按钮多缩进 32px，降级态没对齐。
                      <span className="text-neutral-400 dark:text-neutral-500">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && <p className={footerCountClass}>共 {rows.length} 条</p>}

      <Modal
        open={modalOpen}
        title={form.id ? '编辑音色' : '新增音色'}
        onClose={closeModal}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="音色名称">
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => set('displayName', e.target.value)}
              maxLength={MAX_DISPLAY_NAME}
              placeholder="如：婷婷 / 男声 / 播音腔"
              className={`t-input ${inputClass}`}
            />
          </Field>

          <Field label="音色标识（slug）">
            <input
              type="text"
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              maxLength={MAX_SLUG}
              disabled={!!form.id}
              placeholder="如：tingting / male-news"
              className={`t-input ${inputClass}`}
            />
            <span className="mt-1 block text-xs text-neutral-400">
              {form.id
                ? '创建后不可修改 —— App 侧按 slug 做稳定缓存'
                : '小写字母/数字/连字符。App 侧按它缓存，不要用展示名'}
            </span>
          </Field>

          <Field label="描述（可选）">
            <input
              type="text"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              maxLength={MAX_DESCRIPTION}
              className={`t-input ${inputClass}`}
            />
          </Field>

          <Field label="参考音频">
            <input
              type="text"
              value={form.refAudioUrl}
              onChange={(e) => {
                pendingB64.current = null
                setHasUpload(false)
                set('refAudioUrl', e.target.value)
              }}
              maxLength={MAX_REF_AUDIO_URL}
              placeholder="本机绝对路径（如 /Users/.../tingting_ref.wav）或 S3/OSS URL"
              className={`t-input ${inputClass}`}
            />
            <span className="mt-1 flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".wav,audio/wav"
                className="hidden"
                onChange={(e) => {
                  void handleFile(e.target.files?.[0])
                  // 允许重复选同一个文件（改完再选要能触发 change）
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                className={buttonGhostClass}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? '读取中…' : '上传 wav 文件'}
              </button>
              <span className="text-xs text-neutral-400">
                {hasUpload ? '将使用上传的文件' : '或直接填路径 / URL（二选一）'}
              </span>
            </span>
          </Field>

          <Field label="参考文本（必须与音频内容一致）">
            <textarea
              value={form.refText}
              onChange={(e) => set('refText', e.target.value)}
              rows={3}
              placeholder="把参考音频里**念出来的那段话**一字不差地写在这里"
              className={inputClass}
            />
            <span className="mt-1 block text-xs text-warning-ink dark:text-[#E8CFAE]">
              文本和音频对不上，克隆出的音色会念错 —— 这是本模块最容易配错的地方
            </span>
          </Field>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => set('isDefault', e.target.checked)}
              />
              设为全局默认音色
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
              />
              上架（用户可见可选）
            </label>
          </div>

          {modalError && (
            <p className="text-sm text-error-ink" role="alert">
              {modalError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" className={buttonGhostClass} onClick={closeModal}>
              取消
            </button>
            <button type="submit" className={buttonPrimaryClass} disabled={submitting}>
              {submitting ? '提交中…' : form.id ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 破坏性操作统一走 ReasonDialog：强制 ≥5 字符并写入审计日志。
          原先是一个不带原因的确认框 —— 后端也不收 reason，删掉默认音色后
          审计日志里查不到是谁删的、为什么删。 */}
      <ReasonDialog
        open={!!deleteTarget}
        title="删除音色"
        description={[
          `确认删除音色「${deleteTarget?.display_name}」？`,
          '删除是软删。已选这个音色的用户会自动回落全局默认音色；已生成的音频不受影响（只是失去溯源信息）。',
          ...(deleteTarget?.is_default
            ? ['注意：这是当前的默认音色，删除后用户会回落到全局 TTS 配置的参考音频。']
            : []),
        ].join('\n')}
        submitting={deleteSubmitting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default VoiceLibrary
