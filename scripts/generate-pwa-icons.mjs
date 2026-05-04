// One-shot script to render the Orage Core PWA icons from an inline SVG.
// Run: `node scripts/generate-pwa-icons.mjs`
//
// Outputs to public/:
//   icon-192.png            — 192×192 standard
//   icon-512.png            — 512×512 standard
//   icon-512-maskable.png   — 512×512 with 80% safe-zone (Android adaptive)
//
// Design: gold→amber gradient background, white "OR" mark.

import sharp from "sharp"
import { writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(__dirname, "..", "public")

// The OR mark from public/icon.svg (paths copied verbatim, then re-fit
// onto a square at the requested size).
const OR_PATHS = `
  <path d="M101.141 53H136.632C151.023 53 162.689 64.6662 162.689 79.0573V112.904H148.112V79.0573C148.112 78.7105 148.098 78.3662 148.072 78.0251L112.581 112.898C112.701 112.902 112.821 112.904 112.941 112.904H148.112V126.672H112.941C98.5504 126.672 86.5638 114.891 86.5638 100.5V66.7434H101.141V100.5C101.141 101.15 101.191 101.792 101.289 102.422L137.56 66.7816C137.255 66.7563 136.945 66.7434 136.632 66.7434H101.141V53Z" />
  <path d="M65.2926 124.136L14 66.7372H34.6355L64.7495 100.436V66.7372H80.1365V118.47C80.1365 126.278 70.4953 129.958 65.2926 124.136Z" />
`

function makeSvg({ size, markScale, cornerRadius }) {
  // Original mark is drawn inside a 180×180 box. We center it and scale
  // it down by `markScale` (0–1) so the design sits inside the safe zone
  // for the maskable variant.
  const markBoxBefore = 180
  const offset = (markBoxBefore * (1 - markScale)) / 2
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${markBoxBefore} ${markBoxBefore}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${markBoxBefore}" y2="${markBoxBefore}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#B68039"/>
      <stop offset="1" stop-color="#543C1C"/>
    </linearGradient>
  </defs>
  <rect width="${markBoxBefore}" height="${markBoxBefore}" rx="${cornerRadius}" fill="url(#bg)"/>
  <g fill="#ffffff" transform="translate(${offset}, ${offset}) scale(${markScale})">
    ${OR_PATHS}
  </g>
</svg>`
}

async function render(svg, outFile, size) {
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
  await writeFile(join(PUBLIC, outFile), buf)
  console.log(`  ${outFile}  ${buf.length.toLocaleString()} bytes`)
}

async function main() {
  // Standard (rounded square — Android/iOS apply their own rounding so we
  // pick a moderate radius; both 192 and 512 share the same SVG shape).
  await render(
    makeSvg({ size: 192, markScale: 0.95, cornerRadius: 37 }),
    "icon-192.png",
    192,
  )
  await render(
    makeSvg({ size: 512, markScale: 0.95, cornerRadius: 105 }),
    "icon-512.png",
    512,
  )
  // Maskable: design must fit in the central 80% of the canvas so launcher
  // shapes (circle / squircle) don't crop the mark. We zero the corner
  // radius so the launcher fully owns the silhouette.
  await render(
    makeSvg({ size: 512, markScale: 0.6, cornerRadius: 0 }),
    "icon-512-maskable.png",
    512,
  )
  console.log("done")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
