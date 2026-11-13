import { component } from 'imp'
import { div } from 'imp/html'
import { lang, t } from 'imp/i18n'
import { computed } from 'imp/state'
import { theme } from 'imp/theme'
import { text } from 'imp/std'
// A vendored npm package: `imp install uplot` bundled it into dependencies/uplot/
// and pinned the version in imp.json. It is imported by its bare alias.
import uPlot from 'uplot'
import { formatDateTime, formatNumber, formatTime, say } from '../i18n.js'

// The series take the theme's palette, in the order std/chart uses.
const PALETTE = ['blue', 'orange', 'pink', 'cyan', 'purple', 'green', 'indigo', 'red']
const HEIGHT = 220

// uPlot ships its layout rules in a separate uPlot.css that its JavaScript never
// imports, so the bundle in dependencies/ has none. A page stylesheet would not
// reach this shadow root anyway: these are the rules uPlot needs, in imp tokens.
// uPlot positions its layers with inline left/top, so the plot is pinned to ltr.
const styles = `
  :host { display: block; }
  .plot { min-block-size: ${HEIGHT}px; margin-block-end: var(--imp-space-1, 4px); }
  .uplot, .uplot * { box-sizing: border-box; }
  .uplot { font-family: var(--imp-font-family, system-ui, sans-serif); line-height: 1.5; }
  .u-wrap { position: relative; user-select: none; }
  .u-over, .u-under, .u-axis { position: absolute; }
  .u-under { overflow: hidden; }
  .uplot canvas { display: block; position: relative; inline-size: 100%; block-size: 100%; }
  .u-select {
    position: absolute;
    pointer-events: none;
    background: color-mix(in oklab, var(--imp-color-primary, #2563eb) 18%, transparent);
  }
  .u-cursor-x, .u-cursor-y, .u-cursor-pt {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    pointer-events: none;
    will-change: transform;
  }
  .u-hz .u-cursor-x {
    block-size: 100%;
    border-inline-end: var(--imp-border-width, 1px) dashed var(--imp-color-secondary, #64748b);
  }
  .u-hz .u-cursor-y {
    inline-size: 100%;
    border-block-end: var(--imp-border-width, 1px) dashed var(--imp-color-secondary, #64748b);
  }
  .u-cursor-pt { border-radius: 50%; border: 0 solid; background-clip: padding-box !important; }
  .u-axis.u-off, .u-select.u-off, .u-cursor-x.u-off, .u-cursor-y.u-off, .u-cursor-pt.u-off {
    display: none;
  }
  .u-legend {
    margin: var(--imp-space-2, 8px) auto 0;
    font-size: var(--imp-font-size-sm, 0.875rem);
    color: var(--imp-color-text, #0f172a);
    text-align: center;
  }
  .u-inline { display: block; }
  .u-inline * { display: inline-block; }
  .u-inline tr { margin-inline-end: var(--imp-space-4, 16px); }
  .u-legend th { font-weight: var(--imp-font-weight-normal, 400); }
  .u-legend th > * { vertical-align: middle; display: inline-block; }
  .u-legend .u-marker {
    inline-size: 0.8em;
    block-size: 0.8em;
    margin-inline-end: var(--imp-space-1, 4px);
    border-radius: var(--imp-radius-item, 4px);
    background-clip: padding-box !important;
  }
  .u-inline.u-live th::after { content: ":"; vertical-align: middle; }
  .u-inline:not(.u-live) .u-value { display: none; }
  .u-series > * { padding: var(--imp-space-1, 4px); }
  .u-series th { cursor: pointer; }
  .u-legend .u-off > * { opacity: 0.3; }
  @media (forced-colors: active) {
    .u-select { background: Highlight; opacity: 0.3; }
  }
`

// uPlot wants columns: the x values first, then one array per series.
const columns = (result) => [
  (result.times ?? []).map((time) => time / 1000),
  ...(result.series ?? []).map((series) => series.values),
]

// uPlot draws on a canvas, so it needs real colours. A token can be a var()
// reference into the palette, which a canvas cannot read: a probe element lets
// the browser resolve each one to rgb().
const resolveTokens = (box) => {
  const probe = document.createElement('span')
  box.append(probe)
  const style = getComputedStyle(probe)
  const color = (name) => {
    probe.style.color = `var(--imp-${name})`
    return style.color
  }
  probe.style.font = 'var(--imp-font-size-sm) var(--imp-font-family)'
  const tokens = {
    font: `${style.fontSize} ${style.fontFamily}`,
    secondary: color('color-secondary'),
    border: color('color-border'),
    palette: PALETTE.map((name) => color(`color-${name}`)),
  }
  probe.remove()
  return tokens
}

const options = (box, result, unit) => {
  const { font, secondary, border, palette } = resolveTokens(box)
  const axis = {
    stroke: secondary,
    grid: { stroke: border, width: 1 },
    ticks: { stroke: border, width: 1 },
    font,
  }
  return {
    width: box.clientWidth,
    height: HEIGHT,
    cursor: { drag: { x: true, y: false } },
    series: [
      { label: t('panel.time'), value: (_u, seconds) => seconds && formatDateTime(seconds * 1000) },
      ...(result.series ?? []).map((series, i) => ({
        label: series.name,
        stroke: palette[i % palette.length],
        width: 2,
        value: (_u, value) => (value == null ? '-' : `${formatNumber(value)} ${unit}`),
      })),
    ],
    axes: [
      { ...axis, values: (_u, ticks) => ticks.map((seconds) => formatTime(seconds * 1000)) },
      { ...axis, size: 60, values: (_u, ticks) => ticks.map((value) => formatNumber(value)) },
    ],
  }
}

// A zoomable time-series chart, drawn by uPlot. std/chart draws categories; this
// panel puts the points on a real time axis, with a crosshair and drag-to-zoom.
export const timeSeries = component('beacon-time-series', {
  styles,
  setup: (self, { label, data, unit }) => {
    self.data = data
    self.unit = unit
    // The canvas is a picture to a screen reader; the legend below it is the text.
    self.box = div({ class: 'plot', dir: 'ltr', role: 'img', 'aria-label': label })
    // A plain div, not a stack: uPlot's DOM must stay in this shadow root, where
    // the styles above reach it.
    return div(
      self.box,
      text({ tone: 'secondary', size: 'sm', align: 'center' }, say('panel.zoomHint')),
    )
  },
  onMount: (self) => {
    // uPlot needs a measured box, so it starts here and not in setup.
    const draw = () => {
      self.plot?.destroy()
      const result = self.data.get()
      self.plot = new uPlot(options(self.box, result, self.unit), columns(result), self.box)
    }
    // The theme sets the colours and the language the axes: either one draws it again.
    computed([theme, lang], (active, code) => `${active?.name}:${code}`).watch(self, draw)
    self.data.watch(self, (result) => self.plot.setData(columns(result)))
    self.resize = new ResizeObserver(() =>
      self.plot.setSize({ width: self.box.clientWidth, height: HEIGHT }),
    )
    self.resize.observe(self.box)
  },
  onRemove: (self) => {
    self.resize?.disconnect()
    self.plot?.destroy()
  },
})
