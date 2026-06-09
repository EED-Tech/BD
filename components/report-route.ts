"use server"

import { type NextRequest, NextResponse } from "next/server"
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, Footer, PageBreak, LevelFormat
} from "docx"

const BRAND  = "383E80"
const BRAND2 = "4B518C"
const LIGHT  = "EEF0FA"
const W = 9360 // content width DXA (US Letter, 0.75in margins)

const BORDER     = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }
const BORDERS    = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }
const NO_BORDER  = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER }

function spacer(pt = 6) {
  return new Paragraph({ spacing: { before: 0, after: pt * 20 }, children: [new TextRun("")] })
}

function heading1(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND, space: 4 } },
    children: [new TextRun({ text, bold: true, size: 28, color: BRAND, font: "Arial" })]
  })
}

function heading2(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, size: 22, color: BRAND2, font: "Arial" })]
  })
}

function kpiTable(items: {label: string, value: string, sub?: string}[]) {
  const cols = Math.min(items.length, 3)
  const colW = Math.floor(W / cols)
  const rows = []
  for (let i = 0; i < items.length; i += cols) {
    const chunk = items.slice(i, i + cols)
    while (chunk.length < cols) chunk.push(null as any)
    rows.push(new TableRow({
      children: chunk.map(item => new TableCell({
        borders: BORDERS,
        width: { size: colW, type: WidthType.DXA },
        shading: { fill: item ? LIGHT : "FFFFFF", type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 160, right: 160 },
        children: item ? [
          new Paragraph({ children: [new TextRun({ text: item.label, size: 16, color: "666666", font: "Arial" })] }),
          new Paragraph({ children: [new TextRun({ text: item.value, size: 32, bold: true, color: BRAND, font: "Arial" })] }),
          ...(item.sub ? [new Paragraph({ children: [new TextRun({ text: item.sub, size: 16, color: "888888", font: "Arial" })] })] : [])
        ] : [new Paragraph({ children: [] })]
      }))
    }))
  }
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: Array(cols).fill(colW), rows })
}

function dataTable(headers: string[], rows: string[][], colWidths: number[]) {
  const total = colWidths.reduce((a, b) => a + b, 0)
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => new TableCell({
          borders: BORDERS,
          width: { size: colWidths[i], type: WidthType.DXA },
          shading: { fill: BRAND, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 18, font: "Arial" })] })]
        }))
      }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map((cell, i) => new TableCell({
          borders: BORDERS,
          width: { size: colWidths[i], type: WidthType.DXA },
          shading: { fill: ri % 2 === 0 ? "FFFFFF" : LIGHT, type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: String(cell ?? ""), size: 18, font: "Arial" })] })]
        }))
      }))
    ]
  })
}

function barRows(items: any[]) {
  return items.slice(0, 12).map(item => {
    const maxVal = Math.max(...items.map((i: any) => i.value), 1)
    const filled = Math.round((item.value / maxVal) * 25)
    const bar = "█".repeat(filled) + "░".repeat(25 - filled)
    const label = (item.name || item.country || "").padEnd(20).slice(0, 20)
    return new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [
        new TextRun({ text: label + "  ", font: "Courier New", size: 16 }),
        new TextRun({ text: bar + "  ", font: "Courier New", size: 16, color: BRAND }),
        new TextRun({ text: String(item.value), size: 18, bold: true, color: BRAND, font: "Arial" }),
      ]
    })
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { summaryData, activeFilters, filteredData } = body

    const filterText = [
      `Year: ${activeFilters.year}`,
      `Quarter: ${activeFilters.quarter}`,
      `BD Type: ${activeFilters.bdCategory}`,
      `Status: ${activeFilters.status}`,
      `Country: ${activeFilters.country}`,
    ].join("   |   ")

    const rawData: any[] = (filteredData.rawData || []).slice(0, 60)
    const blData: any[]  = (filteredData.businessLineData || []).sort((a: any, b: any) => b.value - a.value)
    const geoData: any[] = (filteredData.geoData || []).sort((a: any, b: any) => b.value - a.value).slice(0, 15)
    const statusData: any[] = filteredData.statusData || []
    const winRateData: any[] = (filteredData.winRateData || []).slice(0, 12)
    const originData: any[] = (filteredData.originData || []).sort((a: any, b: any) => b.value - a.value)
    const clientData: any[] = (filteredData.clientTypeData || []).sort((a: any, b: any) => b.value - a.value)

    const doc = new Document({
      styles: {
        default: { document: { run: { font: "Arial", size: 20 } } },
        paragraphStyles: [
          { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
            run: { size: 28, bold: true, font: "Arial", color: BRAND },
            paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
          { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
            run: { size: 22, bold: true, font: "Arial", color: BRAND2 },
            paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
        ]
      },
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
          }
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "FSD Africa BD Dashboard  |  Page ", size: 16, color: "888888" }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "888888" }),
                new TextRun({ text: " of ", size: 16, color: "888888" }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "888888" }),
              ]
            })]
          })
        },
        children: [
          // ── Title ─────────────────────────────────────────────────────────
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 480, after: 120 },
            children: [new TextRun({ text: "Business Development Dashboard", bold: true, size: 52, color: BRAND, font: "Arial" })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 80 },
            children: [new TextRun({ text: "FSD Africa  |  Programme Countries", size: 24, color: BRAND2, font: "Arial" })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 600 },
            children: [new TextRun({
              text: `Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}   |   ${filterText}`,
              size: 18, color: "888888", font: "Arial"
            })]
          }),

          // ── KPIs ──────────────────────────────────────────────────────────
          heading1("Summary Metrics"),
          kpiTable([
            { label: "Total Opportunities", value: String(summaryData.totalOpportunities), sub: `${activeFilters.year} · ${activeFilters.quarter}` },
            { label: "RFP / EOI", value: `${summaryData.rfpCount} / ${summaryData.eoiCount}` },
            { label: "Total Budget Value", value: summaryData.totalBudget },
            { label: "Countries Covered", value: String(summaryData.countriesCount) },
            { label: "Upcoming Deadlines", value: String(summaryData.upcomingDeadlines), sub: "next 7 days" },
          ]),
          spacer(16),

          // ── Business Lines ────────────────────────────────────────────────
          heading1("Business Line Distribution"),
          ...barRows(blData),
          spacer(8),
          ...(blData.length ? [dataTable(
            ["Business Line", "Count", "% Share"],
            blData.map(b => [b.name, String(b.value), b.percentage ? `${b.percentage}%` : ""]),
            [5040, 2160, 2160]
          )] : []),
          spacer(16),

          // ── Client Types ──────────────────────────────────────────────────
          ...(clientData.length ? [
            heading1("Client Type Breakdown"),
            dataTable(["Client Type", "Count"], clientData.map(c => [c.name, String(c.value)]), [6480, 2880]),
            spacer(16),
          ] : []),

          // ── Geographic ────────────────────────────────────────────────────
          new Paragraph({ children: [new PageBreak()] }),
          heading1("Geographic Distribution"),
          heading2("Top Countries by Opportunities"),
          ...barRows(geoData),
          spacer(8),
          ...(geoData.length ? [dataTable(
            ["Country", "Opportunities", "Business Lines"],
            geoData.map(g => [g.country, String(g.value), (g.businessLines || []).join(", ").slice(0, 45)]),
            [2520, 1440, 5400]
          )] : []),
          spacer(16),

          // ── Origin ────────────────────────────────────────────────────────
          ...(originData.length ? [
            heading1("BD Origin"),
            dataTable(["Origin", "Count"], originData.map(o => [o.name, String(o.value)]), [6480, 2880]),
            spacer(16),
          ] : []),

          // ── Pipeline Status ───────────────────────────────────────────────
          heading1("Pipeline Status"),
          ...(statusData.length ? [dataTable(
            ["Status", "Count"],
            statusData.map((s: any) => [s.name || s.status, String(s.value)]),
            [6480, 2880]
          )] : [new Paragraph({ children: [new TextRun({ text: "No status data available.", color: "888888", size: 18 })] })]),
          spacer(16),

          // ── Win Rates ─────────────────────────────────────────────────────
          ...(winRateData.length ? [
            heading1("Win Rate Analysis"),
            dataTable(
              ["Category", "Win Rate", "Won", "Total"],
              winRateData.map((w: any) => [w.name, `${w.winRate}%`, String(w.won ?? ""), String(w.total ?? "")]),
              [3600, 2160, 1800, 1800]
            ),
            spacer(16),
          ] : []),

          // ── Opportunities ─────────────────────────────────────────────────
          new Paragraph({ children: [new PageBreak()] }),
          heading1(`Opportunities List  (${rawData.length} of ${filteredData.rawData?.length ?? 0} shown)`),
          ...(rawData.length ? [dataTable(
            ["Type", "Year", "Qtr", "Project Title", "Organisation", "Country", "Status"],
            rawData.map(r => [
              r.bd || "",
              r.year || "",
              r.quarter || "",
              (r.title || "").slice(0, 42),
              (r.organization || "").slice(0, 24),
              (r.country || "").slice(0, 18),
              r.status || "",
            ]),
            [600, 660, 540, 2880, 1800, 1440, 840]
          )] : [new Paragraph({ children: [new TextRun({ text: "No data matches the selected filters.", color: "888888", size: 18 })] })]),
        ]
      }]
    })

    const buffer = await Packer.toBuffer(doc)
    const fileName = `BD_Report_${activeFilters.year}_${activeFilters.quarter}_${new Date().toISOString().split("T")[0]}.docx`

    return new NextResponse(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("[Report API] Error:", error)
    return NextResponse.json(
      { error: `Failed to generate report: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    )
  }
}
