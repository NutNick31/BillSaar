// Shared HTML for the bill breakdown, used at build time (Astro) and in the browser (calculator island),
// so the no-JS worked example and the live result are identical.
import { formatINR, formatINR0 } from './format';
import type { BillResult } from './types';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function renderBreakdown(r: BillResult, caption = 'Bill breakdown'): string {
  const rows = r.lines
    .map(
      (l) => `<tr>
<th scope="row"><span class="line-label">${esc(l.label)}</span><span class="formula">${esc(l.formula)}</span><details class="why"><summary>What is this?</summary><p>${esc(l.explanation)}</p></details></th>
<td class="num">${formatINR(l.amount)}</td>
</tr>`,
    )
    .join('');
  const subsidy = r.subsidyFormula
    ? `<tr><th scope="row">Total before subsidy</th><td class="num">${formatINR(r.gross)}</td></tr>
<tr class="subsidy"><th scope="row"><span class="line-label">Gruha Jyothi subsidy</span><span class="formula">${esc(r.subsidyFormula)}</span></th><td class="num">− ${formatINR(r.subsidy)}</td></tr>`
    : '';
  return `<table class="breakdown">
<caption class="visually-hidden">${esc(caption)}</caption>
<thead><tr><th scope="col">Charge</th><th scope="col" class="num">Amount</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot>${subsidy}<tr class="total-row"><th scope="row">Amount payable <span class="formula">rounded to the nearest rupee</span></th><td class="num">${formatINR0(r.payable)}</td></tr></tfoot>
</table>`;
}

export function renderWarnings(warnings: string[]): string {
  return warnings.map((w) => `<li>${esc(w)}</li>`).join('');
}
