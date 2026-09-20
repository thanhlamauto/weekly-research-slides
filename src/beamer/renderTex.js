'use strict';

// Semantic slide_spec -> LaTeX Beamer source.
//
// The renderer never emits layout coordinates or colours: it calls template
// macros (\wrsLead, \wrsband, \wrsStatus, tikz node styles) and lets
// templates/academic-beamer own the visual language. The one exception is the
// feature-space archetype, where cx/cy positions are semantic (object
// permanence) and are scaled into the picture.

const fs = require('fs');
const path = require('path');

const TEMPLATE_DIR = path.join(__dirname, '..', '..', 'templates', 'academic-beamer');
const TEMPLATE = JSON.parse(fs.readFileSync(path.join(TEMPLATE_DIR, 'version.json'), 'utf8'));

const UNICODE = {
  'Δ': '$\\Delta$', 'δ': '$\\delta$', 'α': '$\\alpha$', 'β': '$\\beta$',
  'γ': '$\\gamma$', 'Γ': '$\\Gamma$', 'ε': '$\\varepsilon$', 'θ': '$\\theta$',
  'Θ': '$\\Theta$', 'λ': '$\\lambda$', 'Λ': '$\\Lambda$', 'μ': '$\\mu$',
  'π': '$\\pi$', 'ρ': '$\\rho$', 'σ': '$\\sigma$', 'Σ': '$\\Sigma$',
  'τ': '$\\tau$', 'φ': '$\\phi$', 'Φ': '$\\Phi$', 'ψ': '$\\psi$',
  'ω': '$\\omega$', 'Ω': '$\\Omega$', '∂': '$\\partial$', '∇': '$\\nabla$',
  '∑': '$\\sum$', '∞': '$\\infty$', '≈': '$\\approx$', '≠': '$\\neq$',
  '≤': '$\\le$', '≥': '$\\ge$', '±': '$\\pm$', '×': '$\\times$',
  '∈': '$\\in$', '∝': '$\\propto$', '→': '$\\rightarrow$', '←': '$\\leftarrow$',
  '↔': '$\\leftrightarrow$', '↑': '$\\uparrow$', '↓': '$\\downarrow$',
  '−': '-', '–': '--', '—': '---', '·': '\\textperiodcentered{}',
  '•': '\\textbullet{}', '…': '\\ldots{}', '°': '$^\\circ$',
  '“': '``', '”': "''", '‘': '`', '’': "'", '\u00a0': '~',
};

const SPECIALS = {
  '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '$': '\\$', '&': '\\&',
  '#': '\\#', '^': '\\textasciicircum{}', '_': '\\_', '%': '\\%',
  '~': '\\textasciitilde{}',
};

function texEscape(value, ctx) {
  const s = value === null || value === undefined ? '' : String(value);
  let out = '';
  for (const ch of s) {
    if (UNICODE[ch]) { out += UNICODE[ch]; continue; }
    if (SPECIALS[ch]) { out += SPECIALS[ch]; continue; }
    if (ch.codePointAt(0) > 255) {
      if (ctx) {
        ctx.unicode.add(ch);
        if (!ctx.keepUnicode) { out += '?'; continue; }
      }
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}

function texMathLabel(value, ctx) {
  const t = String(value === null || value === undefined ? '' : value).trim();
  if (!t) return '';
  let m;
  if ((m = /^([A-Za-z]+)~$/.exec(t))) return `$\\tilde{${m[1]}}$`;
  if ((m = /^([A-Za-z]+)_([A-Za-z0-9]+)$/.exec(t))) return `$${m[1]}_{${m[2]}}$`;
  if ((m = /^([A-Za-z]+)\^([A-Za-z0-9]+)$/.exec(t))) return `$${m[1]}^{${m[2]}}$`;
  if (/^[A-Za-z]{1,3}$/.test(t)) return `$${t}$`;
  return texEscape(t, ctx);
}

function statusName(value) {
  const v = String(value || 'unchanged').toLowerCase();
  return /^[a-z-]+$/.test(v) ? v : 'unchanged';
}

function fmtValue(v, ctx) {
  if (v === null || v === undefined) return '---';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return texEscape(String(v), ctx);
}

function itemize(rawItems) {
  const items = rawItems.filter((it) => it !== undefined && it !== null && String(it).trim() !== '');
  if (!items.length) return '';
  return ['\\begin{itemize}', ...items.map((it) => `  \\item ${it}`), '\\end{itemize}'].join('\n');
}

function bullets(values, ctx) {
  return itemize((values || []).map((v) => texEscape(v, ctx)));
}

function columns(cols) {
  const out = ['\\begin{columns}[T]'];
  cols.filter((c) => c && c.body).forEach((col) => {
    out.push(`\\column{${col.width}\\textwidth}`);
    out.push(col.body);
  });
  out.push('\\end{columns}');
  return out.join('\n');
}

function sectionTitle(text, ctx) {
  return `\\wrsSection{${texEscape(text, ctx)}}`;
}

function band(role, label, body) {
  return `\\begin{wrsband}{${role}}{${label}}${body}\\end{wrsband}`;
}

function noteBlock(slide, ctx) {
  return slide.notes ? `\\note{${texEscape(slide.notes, ctx)}}` : '';
}

function frame({ title, body, slide, ctx, plain = false }) {
  const parts = [];
  parts.push(plain ? '\\begin{frame}[plain]' : `\\begin{frame}{${texEscape(title, ctx)}}`);
  parts.push(body);
  if (slide.citation) parts.push(`\\vfill\\wrsCitation{${texEscape(slide.citation, ctx)}}`);
  parts.push(noteBlock(slide, ctx));
  parts.push('\\end{frame}');
  return parts.filter(Boolean).join('\n');
}

// ---------------------------------------------------------------------------
// archetypes
// ---------------------------------------------------------------------------
function renderTitle(slide, deck, ctx) {
  const c = slide.content || {};
  const body = `\\wrsTitlePage{${texEscape(c.project || deck.project || 'Research update', ctx)}}`
    + `{${texEscape(c.headline || slide.title, ctx)}}`
    + `{${texEscape(c.question || '', ctx)}}`
    + `{${texEscape(c.byline || '', ctx)}}`;
  return frame({ body, slide, ctx, plain: true });
}

function renderQuestion(slide, deck, ctx) {
  const c = slide.content || {};
  const body = [
    `\\wrsLead{${texEscape(c.question || slide.title, ctx)}}\\par\\vspace{0.6em}`,
    columns([
      { width: 0.54, body: `${sectionTitle('Why this week', ctx)}\n${bullets(c.why_now, ctx)}` },
      { width: 0.42, body: `${sectionTitle('What would count as an answer', ctx)}\n${bullets(c.success_criteria, ctx)}` },
    ]),
  ].join('\n');
  return frame({ title: slide.title, body, slide, ctx });
}

function renderRecap(slide, deck, ctx) {
  const c = slide.content || {};
  const established = itemize((c.established || []).map((e) => {
    if (typeof e === 'string') return texEscape(e, ctx);
    const label = e.label ? `\\textbf{${texEscape(e.label, ctx)}} ` : '';
    return `${label}${texEscape(e.detail || e.text || '', ctx)}`;
  }));
  const now = [
    sectionTitle(c.now_title || 'Where we are now', ctx),
    `\\wrsBody{${texEscape(c.now || '', ctx)}}\\par\\vspace{0.4em}`,
    c.prior_week ? `\\wrsTiny{${texEscape(c.prior_week, ctx)}}` : '',
  ].filter(Boolean).join('\n');
  const body = columns([
    { width: 0.5, body: `${sectionTitle(c.established_title || 'Established (unchanged)', ctx)}\n${established}` },
    { width: 0.46, body: now },
  ]);
  return frame({ title: slide.title, body, slide, ctx });
}

function renderProblem(slide, deck, ctx) {
  const c = slide.content || {};
  const left = [
    `\\wrsLead{${texEscape(c.summary || slide.title, ctx)}}\\par\\vspace{0.6em}`,
    c.why_hard && c.why_hard.length ? `${sectionTitle('Why it is hard', ctx)}\n${bullets(c.why_hard, ctx)}` : '',
  ].filter(Boolean).join('\n');
  const right = c.constraints && c.constraints.length
    ? `${sectionTitle('Constraints', ctx)}\n${bullets(c.constraints, ctx)}` : '';
  const body = columns([{ width: 0.56, body: left }, { width: 0.4, body: right }]);
  return frame({ title: slide.title, body, slide, ctx });
}

function renderMethodLandscape(slide, deck, ctx) {
  const c = slide.content || {};
  const methods = c.methods || [];
  const n = Math.max(1, methods.length);
  const width = (1 / n - 0.03).toFixed(2);
  const cols = methods.map((m, i) => ({
    width,
    body: [
      `\\wrsTiny{${texEscape((m.tag || `M${i + 1}`).toUpperCase(), ctx)}}\\par\\vspace{0.15em}`,
      `{\\small\\bfseries\\color{wrsInk}${texEscape(m.name || '', ctx)}}\\par\\vspace{0.3em}`,
      `\\wrsSmall{${texEscape(m.mechanism || '', ctx)}}`,
    ].join('\n'),
  }));
  let body = columns(cols);
  if (c.gap) body += `\n\\vspace{0.4em}\n${band('gap', 'Open gap', texEscape(c.gap, ctx))}`;
  return frame({ title: slide.title, body, slide, ctx });
}

function renderCompetitorMechanism(slide, deck, ctx) {
  const c = slide.content || {};
  const failure = itemize((c.failure || []).map((b) => texEscape(b, ctx)));
  const relation = c.relation_to_us ? `\\vspace{0.3em}\n${band('interpretation', 'Relation to us', texEscape(c.relation_to_us, ctx))}` : '';
  const body = columns([
    { width: 0.31, body: `${sectionTitle('A. Intuition', ctx)}\n\\wrsSmall{${texEscape(c.intuition || '', ctx)}}` },
    { width: 0.31, body: `${sectionTitle('B. Mechanism', ctx)}\n\\wrsSmall{${texEscape(c.mechanism || '', ctx)}}` },
    { width: 0.31, body: `${sectionTitle('C. Where it fails', ctx)}\n${failure}${relation}` },
  ]);
  return frame({ title: slide.title, body, slide, ctx });
}

function renderWeakness(slide, deck, ctx) {
  const c = slide.content || {};
  const body = [
    band('gap', 'Gap', texEscape(c.gap || slide.title, ctx)),
    columns([
      { width: 0.54, body: `${sectionTitle('Evidence', ctx)}\n${bullets(c.evidence, ctx)}` },
      { width: 0.4, body: c.implication ? `${sectionTitle('Implication', ctx)}\n\\wrsSmall{${texEscape(c.implication, ctx)}}` : '' },
    ]),
  ].join('\n');
  return frame({ title: slide.title, body, slide, ctx });
}

function renderMotivation(slide, deck, ctx) {
  const c = slide.content || {};
  const contrast = c.contrast || {};
  const body = [
    columns([
      { width: 0.3, body: `${sectionTitle(contrast.old_label || 'Obvious baseline', ctx)}\n\\wrsSmall{${texEscape(contrast.old || '', ctx)}}` },
      { width: 0.3, body: `${sectionTitle(contrast.new_label || 'Our idea', ctx)}\n\\wrsSmall{${texEscape(contrast.new || '', ctx)}}` },
      { width: 0.32, body: `${sectionTitle('The idea', ctx)}\n\\wrsBody{${texEscape(c.idea || '', ctx)}}` },
    ]),
    c.why_now ? `\\vspace{0.6em}\\wrsBody{${texEscape(c.why_now, ctx)}}` : '',
  ].filter(Boolean).join('\n');
  return frame({ title: slide.title, body, slide, ctx });
}

const STAGE_STYLES = {
  input: 'wrstoken', model: 'wrsstage', learned: 'wrslearned',
  cache: 'wrscache', output: 'wrslatent', operator: 'wrsoperator',
};

function renderMethodHighLevel(slide, deck, ctx) {
  const c = slide.content || {};
  const stages = c.stages || [];
  const parts = ['\\begin{center}', '\\begin{tikzpicture}[node distance=2.8cm]'];
  stages.forEach((s, i) => {
    const style = STAGE_STYLES[s.role] || 'wrsstage';
    parts.push(`  \\node[${style}] (stage-${i}) {${texEscape(s.label || '', ctx)}};`);
  });
  stages.forEach((s, i) => {
    if (i < stages.length - 1) parts.push(`  \\draw[wrsarrow] (stage-${i}) -- (stage-${i + 1});`);
  });
  stages.forEach((s, i) => {
    if (s.detail) parts.push(`  \\node[wrsdetail, below=0.45cm of stage-${i}] {${texEscape(s.detail, ctx)}};`);
  });
  parts.push('\\end{tikzpicture}', '\\end{center}');
  if (c.note) parts.push(`\\vspace{0.3em}\\begin{center}\\wrsQuiet{${texEscape(c.note, ctx)}}\\end{center}`);
  return frame({ title: slide.title, body: parts.join('\n'), slide, ctx });
}

function renderMethodDelta(slide, deck, ctx) {
  const c = slide.content || {};
  const changes = itemize((c.changes || []).map((ch) => {
    const change = typeof ch === 'string' ? ch : ch.change;
    const why = typeof ch === 'string' ? '' : ch.why;
    const whyTex = why ? `\\\\ {\\small\\color{wrsMuted}${texEscape(why, ctx)}}` : '';
    return `${texEscape(change || '', ctx)}${whyTex}`;
  }));
  const body = [
    `\\wrsMethodTransition{${texEscape(c.from || 'v(n-1)', ctx)}}{${texEscape(c.to || 'v(n)', ctx)}}{${texEscape(c.summary || '', ctx)}}`,
    '\\vspace{0.7em}',
    columns([
      { width: 0.5, body: `${sectionTitle('Changes this week', ctx)}\n${changes}` },
      { width: 0.46, body: c.unchanged && c.unchanged.length ? `${sectionTitle('Unchanged', ctx)}\n${bullets(c.unchanged, ctx)}` : '' },
    ]),
  ].join('\n');
  return frame({ title: slide.title, body, slide, ctx });
}

function renderExperiment(slide, deck, ctx) {
  const c = slide.content || {};
  const top = columns([
    { width: 0.44, body: `${sectionTitle('Setup', ctx)}\n\\wrsSmall{${texEscape(c.setup || '', ctx)}}` },
    { width: 0.52, body: `${sectionTitle('Protocol', ctx)}\n${itemize((c.protocol || []).map((p) => texEscape(p, ctx)))}` },
  ]);
  const bottom = columns([
    { width: 0.48, body: `${sectionTitle('Changed this week', ctx)}\n${bullets(c.changed, ctx)}` },
    { width: 0.48, body: `${sectionTitle('Held constant', ctx)}\n${bullets(c.controlled, ctx)}` },
  ]);
  const body = `${top}\n\\vspace{0.5em}\n${bottom}`;
  return frame({ title: slide.title, body, slide, ctx });
}

function renderBenchmark(slide, deck, ctx) {
  const c = slide.content || {};
  const metrics = c.metrics || [];
  const methods = c.methods || [];
  const header = ['Method', ...metrics.map((m) => `\\textbf{${texEscape(m.name || m.key, ctx)}}`)];
  const units = [...new Set(metrics.map((m) => m.unit).filter(Boolean))];
  const rows = methods.map((mm) => {
    const isCurrent = mm.role === 'current';
    const name = isCurrent
      ? `\\textbf{\\textcolor{wrsBlue}{${texEscape(mm.name || '', ctx)}}}`
      : texEscape(mm.name || '', ctx);
    const role = mm.role === 'current' ? 'this week' : mm.role === 'previous' ? 'last week' : '';
    const roleRedundant = role && new RegExp(role.replace(' ', '\\s*'), 'i').test(mm.name || '');
    const nameCell = role && !roleRedundant
      ? `${name}\\newline{\\tiny\\color{wrsMuted}(${texEscape(role, ctx)})}` : name;
    const cells = metrics.map((mt) => {
      const val = fmtValue(mm.values ? mm.values[mt.key] : undefined, ctx);
      const delta = mm.delta && mm.delta[mt.key]
        ? `\\ {\\tiny\\color{wrsGreen}(${texEscape(mm.delta[mt.key], ctx)})}` : '';
      const cell = `${val}${delta}`;
      return isCurrent ? `\\textbf{\\textcolor{wrsBlue}{${cell}}}` : cell;
    });
    return `${nameCell} & ${cells.join(' & ')} \\\\`;
  });
  const body = [
    '\\begin{center}\\scriptsize',
    '\\setlength{\\tabcolsep}{3pt}',
    '\\renewcommand{\\arraystretch}{1.15}',
    `\\begin{tabular}{l${'c'.repeat(Math.max(1, metrics.length))}}`,
    '\\toprule',
    `${header.join(' & ')} \\\\`,
    '\\midrule',
    ...rows,
    '\\bottomrule',
    '\\end{tabular}',
    '\\end{center}',
    units.length ? `\\vspace{0.25em}\\wrsTiny{${texEscape(units.join('; '), ctx)}}` : '',
    c.caption ? `\\vspace{0.25em}\\wrsQuiet{${texEscape(c.caption, ctx)}}` : '',
  ].filter(Boolean).join('\n');
  return frame({ title: slide.title, body, slide, ctx });
}

function renderClaim(slide, deck, ctx) {
  const c = slide.content || {};
  const id = c.id || 'C?';
  const body = [
    `\\wrsClaimId{${texEscape(id, ctx)}}\\quad\\wrsStatus{${statusName(c.status)}}`,
    '\\vspace{0.5em}',
    `\\wrsLead{${texEscape(c.statement || slide.title, ctx)}}`,
    c.evidence && c.evidence.length
      ? `\\vspace{0.8em}\n${band('observation', 'Supporting evidence', itemize(c.evidence.map((e) => texEscape(e, ctx))))}`
      : '',
  ].filter(Boolean).join('\n');
  return frame({ title: slide.title, body, slide, ctx });
}

function renderClaimDelta(slide, deck, ctx) {
  const c = slide.content || {};
  const claims = c.claims || [];
  const rows = claims.map((cl) => [
    `\\wrsClaimTransition{${texEscape(cl.id || 'C', ctx)}}{${statusName(cl.previous || 'absent')}}{${statusName(cl.current)}}`,
    `\\wrsSmall{${texEscape(cl.statement || '', ctx)}}`,
    cl.note ? `\\wrsTiny{${texEscape(cl.note, ctx)}}` : '',
  ].filter(Boolean).join('\\\\\n'));
  const body = [
    rows.join('\\\\[0.5em]\n'),
    c.note ? `\\vspace{0.6em}\\wrsQuiet{${texEscape(c.note, ctx)}}` : '',
  ].filter(Boolean).join('\n');
  return frame({ title: slide.title, body, slide, ctx });
}

function renderDiagnostic(slide, deck, ctx) {
  const c = slide.content || {};
  const id = c.id || 'D?';
  const tests = c.claim_ids && c.claim_ids.length ? `\\hfill\\wrsTests{${texEscape(c.claim_ids.join(', '), ctx)}}` : '';
  const body = [
    `\\wrsDiagId{${texEscape(id, ctx)}}\\quad\\wrsBody{${texEscape(c.question || slide.title, ctx)}}${tests}`,
    '\\vspace{0.6em}',
    columns([
      {
        width: 0.56,
        body: [
          band('measurement', 'Measurement', `\\wrsMono{${texEscape(c.measurement || '', ctx)}}`),
          band('observation', 'Observation', texEscape(c.observation || '', ctx)),
          band('interpretation', 'Interpretation', texEscape(c.interpretation || '', ctx)),
        ].join('\n'),
      },
      {
        width: 0.4,
        body: [
          band('can', 'Can conclude', texEscape(c.can_conclude || '', ctx)),
          band('cannot', 'Cannot conclude', texEscape(c.cannot_conclude || '', ctx)),
          band('alternative', 'Alternative targeted', texEscape(c.alternative_explanation || '', ctx)),
        ].join('\n'),
      },
    ]),
  ].join('\n');
  return frame({ title: slide.title, body, slide, ctx });
}

const ROLE_POS = {
  top: { x: 5.35, y: 2.35 }, center: { x: 5.35, y: 4.25 },
  bottom_left: { x: 2.55, y: 4.55 }, bottom_right: { x: 8.15, y: 4.55 },
  left: { x: 2.55, y: 3.5 }, right: { x: 8.15, y: 3.5 },
};

function tikzId(value) {
  return String(value || 'node').replace(/[^A-Za-z0-9_-]/g, '-');
}

function renderFeatureSpace(slide, deck, ctx) {
  const c = slide.content || {};
  const nodes = c.nodes || [];
  const vectors = c.vectors || [];
  const X = (cx) => ((cx - 1.5) * 1.15).toFixed(2);
  const Y = (cy) => ((5.9 - cy) * 1.25).toFixed(2);
  const positions = {};
  const parts = ['\\begin{center}', '\\begin{tikzpicture}[x=1cm,y=1cm]'];
  nodes.forEach((nd, i) => {
    const pos = nd.cx !== undefined ? { x: nd.cx, y: nd.cy } : (ROLE_POS[nd.role] || { x: 2.5 + i * 2.4, y: 3.5 });
    const id = tikzId(nd.object_id || `node-${i}`);
    positions[nd.object_id || `node-${i}`] = pos;
    parts.push(`  \\node[wrsnode] (${id}) at (${X(pos.x)}, ${Y(pos.y)}) {${texMathLabel(nd.label, ctx)}};`);
    if (nd.sublabel) parts.push(`  \\node[wrslabel, below=0.02cm of ${id}] {${texEscape(nd.sublabel, ctx)}};`);
  });
  const ordered = [...vectors].sort((a, b) => (a.semantic === 'reference' ? -1 : 1) - (b.semantic === 'reference' ? -1 : 1));
  ordered.forEach((v, i) => {
    const a = positions[v.from];
    const b = positions[v.to];
    if (!a || !b) return;
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    const placement = dx >= dy ? 'above' : 'left';
    const style = v.semantic === 'reference' ? 'wrsreference' : 'wrsvector';
    const label = v.label ? ` node[midway, ${placement}, wrslabel] {${texEscape(v.label, ctx)}}` : '';
    parts.push(`  \\draw[${style}] (${tikzId(v.from)}) --${label} (${tikzId(v.to)});`);
  });
  parts.push('\\end{tikzpicture}');
  const legendItems = c.legend_items || [
    { label: 'correction ΔZ (what moved)', semantic: 'vector' },
    { label: 'desired direction Z_d − Z_s', semantic: 'reference' },
  ];
  if (c.legend !== false) {
    const legend = legendItems.map((it) => (it.semantic === 'reference'
      ? `\\wrsLegendReference{${texEscape(it.label, ctx)}}`
      : `\\wrsLegendVector{${texEscape(it.label, ctx)}}`)).join('\\hspace{1.6em}');
    parts.push(`\\vspace{0.2em}${legend}`);
  }
  parts.push('\\end{center}');
  if (c.note) parts.push(`\\begin{center}\\wrsQuiet{${texEscape(c.note, ctx)}}\\end{center}`);
  return frame({ title: slide.title, body: parts.join('\n'), slide, ctx });
}

function renderInterpretation(slide, deck, ctx) {
  const c = slide.content || {};
  const claim = c.claim || {};
  const body = columns([
    {
      width: 0.62,
      body: [
        band('observation', 'Observation', texEscape(c.observation || '', ctx)),
        band('interpretation', 'Interpretation', texEscape(c.interpretation || '', ctx)),
      ].join('\n'),
    },
    {
      width: 0.34,
      body: [
        sectionTitle('Claim', ctx),
        `\\wrsClaimId{${texEscape(claim.id || '', ctx)}}\\quad\\wrsStatus{${statusName(claim.status)}}`,
        `\\wrsSmall{${texEscape(claim.statement || '', ctx)}}`,
      ].join('\n'),
    },
  ]);
  return frame({ title: slide.title, body, slide, ctx });
}

function renderLimitations(slide, deck, ctx) {
  const c = slide.content || {};
  const body = columns([
    { width: 0.5, body: `${sectionTitle('Current limitations', ctx)}\n${bullets(c.limitations, ctx)}` },
    { width: 0.46, body: `${sectionTitle('Open questions', ctx)}\n${bullets(c.open_questions, ctx)}` },
  ]);
  return frame({ title: slide.title, body, slide, ctx });
}

function renderGeneric(slide, deck, ctx) {
  const c = slide.content || {};
  const parts = [];
  const lead = c.summary || c.statement || c.question || '';
  if (lead) parts.push(`\\wrsLead{${texEscape(lead, ctx)}}\\par\\vspace{0.5em}`);
  ['note', 'idea', 'mechanism', 'observation', 'interpretation', 'implication', 'why_now', 'setup', 'caption']
    .forEach((k) => { if (typeof c[k] === 'string' && c[k]) parts.push(`\\wrsBody{${texEscape(c[k], ctx)}}`); });
  ['points', 'bullets', 'items', 'evidence', 'limitations', 'open_questions', 'constraints', 'why_hard']
    .forEach((k) => {
      if (Array.isArray(c[k])) {
        parts.push(bullets(c[k].map((x) => (typeof x === 'string' ? x : (x.detail || x.text || x.change || ''))), ctx));
      }
    });
  if (typeof c.figure === 'string' && c.figure) parts.push(`\\wrsFigure{assets/${path.basename(c.figure)}}`);
  if (!parts.length) parts.push(`\\wrsBody{${texEscape(slide.title, ctx)}}`);
  return frame({ title: slide.title, body: parts.filter(Boolean).join('\n'), slide, ctx });
}

const RENDERERS = {
  title: renderTitle,
  question: renderQuestion,
  recap: renderRecap,
  problem: renderProblem,
  'method-landscape': renderMethodLandscape,
  'competitor-mechanism': renderCompetitorMechanism,
  weakness: renderWeakness,
  motivation: renderMotivation,
  'method-high-level': renderMethodHighLevel,
  'method-delta': renderMethodDelta,
  experiment: renderExperiment,
  benchmark: renderBenchmark,
  claim: renderClaim,
  'claim-delta': renderClaimDelta,
  diagnostic: renderDiagnostic,
  'feature-space': renderFeatureSpace,
  interpretation: renderInterpretation,
  limitations: renderLimitations,
};

// ---------------------------------------------------------------------------
// deck assembly
// ---------------------------------------------------------------------------
function collectFigures(spec) {
  const refs = [];
  const walk = (value) => {
    if (Array.isArray(value)) { value.forEach(walk); return; }
    if (!value || typeof value !== 'object') return;
    Object.entries(value).forEach(([k, v]) => {
      if (typeof v === 'string' && /^(figure|image|diagram)$/.test(k) && /\.(png|jpg|jpeg|pdf|svg)$/i.test(v)) {
        refs.push(path.basename(v));
      } else walk(v);
    });
  };
  walk(spec.slides || []);
  return [...new Set(refs)];
}

function wrapper(engine, handout) {
  return [
    `% !TEX program = ${engine}`,
    `% Generated by weekly-research-slides. Do not edit; edit slide_spec.yaml.`,
    `\\documentclass[10pt,aspectratio=169${handout ? ',handout' : ''}]{beamer}`,
    '\\input{preamble}',
    '\\begin{document}',
    '\\input{slides}',
    '\\end{document}',
    '',
  ].join('\n');
}

function renderOnce(spec, keepUnicode) {
  const ctx = { unicode: new Set(), keepUnicode };
  const deck = spec.deck || {};
  const slides = (spec.slides || []).map((s) => {
    const render = RENDERERS[s.archetype] || renderGeneric;
    return render(s, deck, ctx);
  });
  const shortTitle = deck.footer || deck.project || deck.title || 'Research update';
  const preamble = [
    `% template: ${TEMPLATE.name} v${TEMPLATE.version}`,
    '\\input{theme}',
    '\\input{macros}',
    `\\title[${texEscape(shortTitle, ctx)}]{${texEscape(deck.title || shortTitle, ctx)}}`,
    deck.project ? `\\hypersetup{pdfsubject={${texEscape(deck.project, ctx)}}}` : '',
    '',
  ].filter(Boolean).join('\n');
  return {
    unicode: ctx.unicode,
    files: {
      'preamble.tex': preamble,
      'slides.tex': `${slides.join('\n\n')}\n`,
    },
  };
}

function renderBeamer(spec, opts = {}) {
  const first = renderOnce(spec, true);
  let engine = opts.engine || (first.unicode.size ? 'lualatex' : 'pdflatex');
  let result = first;
  const warnings = [];
  if (engine === 'pdflatex' && first.unicode.size) {
    result = renderOnce(spec, false);
    warnings.push({
      level: 'warning',
      check: 'beamer-unicode',
      message: `replaced non-Latin-1 characters (${[...first.unicode].join(' ')}) for pdflatex`,
    });
  }
  const files = {
    ...result.files,
    'presentation.tex': wrapper(engine, false),
    'handout.tex': wrapper(engine, true),
  };
  return { engine, warnings, files, figures: collectFigures(spec), template: TEMPLATE };
}

module.exports = { renderBeamer, texEscape, texMathLabel, TEMPLATE, TEMPLATE_DIR };
