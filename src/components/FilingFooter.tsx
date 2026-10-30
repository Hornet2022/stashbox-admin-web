/**
 * 备案号页脚。
 *
 * 《互联网信息服务管理办法》要求网站底部**显著标明**工信部备案号，
 * 并链接到 beian.miit.gov.cn。阿里云《备案驳回FAQ》把「已备案成功的
 * 网站底部未添加备案号」「添加了但未链接到工信部网站」都列为**明确驳回
 * 理由** —— 公安联网备案的审核是同一性质的人工核查，会打开首页看。
 *
 * 工信部要求页脚**同时**标明「网站名称」和备案号（两者都要与备案系统一致），
 * 少一行就算备案信息不完整。
 *
 * 号码由**构建期**注入（`VITE_SITE_NAME` / `VITE_ICP_NUMBER` / `VITE_PSB_NUMBER`），
 * 真相源是 stashbox 仓的 `infra/web/filing.json` —— 两个仓各写一份号码
 * 迟早只改一处，审核时就会以「网站底部没有备案号」被驳回。
 * 注入由 stashbox 仓的 `deploy/fill-filing-numbers.py` 负责。
 *
 * 空号时**整行不渲染** —— 页面不能出现一个看着像真号、实际是占位的
 * 字符串（那是骗人；而且审核看到假号也可能被判「乱填」）。
 *
 * ## 为什么登录页也要挂
 *
 * 审核员可能先打开 `admin.stashbox.cn` —— 未登录时看到的是**登录页**
 * （登录页是独立路由，不走 Layout）。页脚只挂在 Layout 上时，登录页底部
 * 是空的 —— 而那正是审核员第一眼看到的地方。
 */
export function FilingFooter() {
  const siteName = import.meta.env.VITE_SITE_NAME ?? ''
  const copyright = import.meta.env.VITE_COPYRIGHT ?? ''
  const icp = import.meta.env.VITE_ICP_NUMBER ?? ''
  const psb = import.meta.env.VITE_PSB_NUMBER ?? ''
  const psbIcon = import.meta.env.VITE_PSB_ICON ?? ''
  // 公安备案号 → 官方查询链接（带编号，点进去直达这一条备案）。
  // 编号就是备案号里的连续数字（鄂公网安备42018502009586号 → 42018502009586）。
  const psbCode = psb.replace(/\D/g, '')
  const psbHref = psbCode
    ? `https://beian.mps.gov.cn/#/query/webSearch?code=${psbCode}`
    : 'https://beian.mps.gov.cn'
  if (!siteName && !copyright && !icp && !psb) return null
  return (
    <footer className="shrink-0 border-t border-neutral-200 px-4 py-3.5 text-center text-xs leading-5 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
      {copyright && <p className="text-sm text-neutral-600 dark:text-neutral-300">{copyright}</p>}
      {(icp || psb) && (
        <p className="mt-1">
          {icp && (
            <a href="https://beian.miit.gov.cn" target="_blank" rel="noreferrer noopener">
              {icp}
            </a>
          )}
          {icp && psb && <span className="mx-2.5 opacity-45">·</span>}
          {psb && (
            <a
              className="inline-flex items-center gap-1 align-middle"
              href={psbHref}
              target="_blank"
              rel="noreferrer noopener"
            >
              {psbIcon && (
                /* 官方徽章是竖长的（168×187），写死 15×15 会压扁 —— 只定宽，高度自适应。 */
                <img src={psbIcon} alt="" aria-hidden="true" className="h-auto w-[15px] align-middle" />
              )}
              <span>{psb}</span>
            </a>
          )}
        </p>
      )}
      {siteName && <p className="mt-0.5 text-[11px]">网站名称：{siteName}</p>}
    </footer>
  )
}

export default FilingFooter
