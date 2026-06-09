import { type NextRequest, NextResponse } from "next/server"

// ── Palette ──────────────────────────────────────────────────────────────────
type RGB = [number, number, number]
const BRAND  : RGB = [56,  62,  128]
const BRAND2 : RGB = [75,  81,  140]
const BRAND3 : RGB = [107, 119, 197]
const ACCENT : RGB = [255, 193,  50]
const LIGHT  : RGB = [238, 240, 250]
const ROWALT : RGB = [247, 248, 252]
const WHITE  : RGB = [255, 255, 255]
const DKGRAY : RGB = [40,  40,  40]
const GRAY   : RGB = [120, 120, 120]
const GREEN  : RGB = [34,  197,  94]
const AMBER  : RGB = [245, 158,  11]
const RED    : RGB = [239,  68,  68]
const BLUE   : RGB = [59,  130, 246]
const PURPLE : RGB = [168,  85, 247]

const STATUS_COLORS: Record<string, RGB> = {
  Won: GREEN, Shortlisted: BLUE, Submitted: AMBER,
  Lost: RED, "In Progress": PURPLE, "Not Submitted": GRAY,
}
// Neutral palette for non-status data (no red — reserved for bad status only)
const PALETTE: RGB[] = [BRAND, BRAND3, [14,165,233], [20,184,166], AMBER, PURPLE,
  [99,102,241],[245,158,11],[6,182,212],[139,92,246],[251,146,60],[34,197,94]]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { summaryData, activeFilters, filteredData } = body

    const rawData          : any[] = filteredData.rawData             || []
    const blData           : any[] = [...(filteredData.businessLineData || [])].sort((a,b)=>b.value-a.value)
    const clientData       : any[] = [...(filteredData.clientTypeData   || [])].sort((a,b)=>b.value-a.value)
    const bdTypeData       : any[] = [...(filteredData.bdTypeData       || [])].sort((a,b)=>b.value-a.value)
    const geoData          : any[] = [...(filteredData.geoData          || [])].sort((a,b)=>b.value-a.value).slice(0,15)
    const statusData       : any[] = filteredData.statusData            || []
    const winRateData      : any[] = filteredData.winRateData           || []
    const originData       : any[] = [...(filteredData.originData       || [])].sort((a,b)=>b.value-a.value)
    const serviceData      : any[] = [...(filteredData.serviceOfferingData || [])].sort((a,b)=>b.value-a.value)
    const teamData         : any[] = filteredData.teamAssignmentData    || []

    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
    const PW = doc.internal.pageSize.getWidth()
    const PH = doc.internal.pageSize.getHeight()
    const ML = 36, MR = 36, CW = PW - ML - MR
    const FOOTER = 26
    let y = 36

    // ── primitives ────────────────────────────────────────────────────────────
    const sf = (style: "normal"|"bold", size: number, col: RGB = DKGRAY) => {
      doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(...col)
    }
    const fill = (col: RGB) => doc.setFillColor(...col)
    const stroke = (col: RGB, w = 0.5) => { doc.setDrawColor(...col); doc.setLineWidth(w) }

    const ensure = (need: number) => { if (y + need > PH - FOOTER - 10) newPage() }
    const newPage = () => { doc.addPage(); y = 44 }
    const sp = (n = 8) => { y += n }

    // ── section header ────────────────────────────────────────────────────────
    const H1 = (text: string, sub = "") => {
      ensure(44)
      fill(BRAND); doc.rect(ML, y, CW, 30, "F")
      fill(ACCENT); doc.rect(ML, y, 4, 30, "F")
      sf("bold", 12, WHITE); doc.text(text, ML + 12, y + 19)
      if (sub) { sf("normal", 8, [200,202,230] as RGB); doc.text(sub, ML + 12 + doc.getTextWidth(text) + 8, y + 19) }
      y += 30; sp(8)
    }

    const H2 = (text: string) => {
      ensure(20); sf("bold", 9, BRAND2); doc.text(text, ML, y); sp(13)
    }

    // ── bar chart row ─────────────────────────────────────────────────────────
    const BAR_ROW = 16
    const LW = 130, CntW = 30, BarW = CW - LW - CntW - 6

    const barRow = (label: string, val: number, maxVal: number, col: RGB = BRAND, pct?: number) => {
      ensure(BAR_ROW + 2)
      const bx = ML + LW + 3, by = y - 11, bh = BAR_ROW - 5
      const fw = Math.max(2, Math.round((val / maxVal) * BarW))

      sf("normal", 7.5, DKGRAY); doc.text(label.slice(0,24), ML, y - 2)
      fill([230,232,245] as RGB); doc.roundedRect(bx, by, BarW, bh, 2, 2, "F")
      fill(col); doc.roundedRect(bx, by, fw, bh, 2, 2, "F")
      sf("bold", 7.5, col); doc.text(String(val), bx + BarW + 4, y - 2)
      if (pct !== undefined) { sf("normal", 6.5, GRAY); doc.text(`${pct}%`, bx + BarW + 30, y - 2) }
      y += BAR_ROW
    }

    const barChart = (items: any[], labelKey = "name", valKey = "value", colFn?: (i: any, idx: number) => RGB) => {
      if (!items.length) { sf("normal", 8, GRAY); doc.text("No data", ML, y); sp(14); return }
      const max = Math.max(...items.map(i => i[valKey] || 0), 1)
      const total = items.reduce((s, i) => s + (i[valKey] || 0), 0)
      items.forEach((item, idx) => {
        const col = colFn ? colFn(item, idx) : PALETTE[idx % PALETTE.length]
        barRow(String(item[labelKey] || ""), item[valKey] || 0, max, col,
          total > 0 ? Math.round((item[valKey] / total) * 1000) / 10 : 0)
      })
      sp(4)
    }

    // ── table ─────────────────────────────────────────────────────────────────
    const ROW_H = 16
    const table = (headers: string[], rows: (string|number)[][], colW: number[], opts?: { headerCol?: RGB }) => {
      const tw = colW.reduce((a, b) => a + b, 0)
      ensure(ROW_H * 2 + 4)
      fill(opts?.headerCol || BRAND2); doc.rect(ML, y, tw, ROW_H, "F")
      sf("bold", 7, WHITE)
      let x = ML; headers.forEach((h, i) => { doc.text(String(h), x + 3, y + 11); x += colW[i] })
      y += ROW_H
      rows.forEach((row, ri) => {
        ensure(ROW_H)
        fill(ri % 2 === 0 ? WHITE : ROWALT); doc.rect(ML, y, tw, ROW_H, "F")
        stroke([218,218,228] as RGB, 0.25); doc.line(ML, y + ROW_H, ML + tw, y + ROW_H)
        sf("normal", 7, DKGRAY)
        let x = ML
        row.forEach((cell, i) => {
          const maxW = colW[i] - 6
          let txt = String(cell ?? "")
          // Trim text to fit column width by measuring actual rendered width
          while (txt.length > 1 && doc.getTextWidth(txt) > maxW) {
            txt = txt.slice(0, -1)
          }
          // Replace last 2 chars with ".." if we actually trimmed
          if (txt.length < String(cell ?? "").length && txt.length > 2) {
            txt = txt.slice(0, -2) + ".."
          }
          doc.text(txt, x + 3, y + 11)
          x += colW[i]
        })
        y += ROW_H
      })
      sp(10)
    }

    // ── small donut-style legend block ────────────────────────────────────────
    const legendBlock = (items: any[], labelKey = "name", valKey = "value") => {
      if (!items.length) return
      const total = items.reduce((s, i) => s + (i[valKey] || 0), 0)
      const cols = 2, colW2 = CW / cols
      items.forEach((item, idx) => {
        ensure(14)
        const col = idx % cols, row2 = 0
        const lx = ML + col * colW2
        fill(PALETTE[idx % PALETTE.length]); doc.roundedRect(lx, y - 9, 8, 8, 1, 1, "F")
        sf("normal", 7.5, DKGRAY)
        const pct = total > 0 ? ` (${Math.round((item[valKey]/total)*100)}%)` : ""
        doc.text(`${String(item[labelKey]||"").slice(0,26)}  ${item[valKey]}${pct}`, lx + 12, y - 2)
        if (col === cols - 1) y += 14
      })
      if (items.length % cols !== 0) y += 14
      sp(6)
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 1 — COVER
    // ══════════════════════════════════════════════════════════════════════════
    fill(BRAND); doc.rect(0, 0, PW, 170, "F")
    fill(ACCENT); doc.rect(0, 160, PW, 6, "F")

    // logo-like mark
    fill(BRAND2); doc.roundedRect(ML, 30, 36, 36, 5, 5, "F")
    fill(ACCENT); doc.roundedRect(ML + 6, 36, 10, 10, 2, 2, "F")
    fill([180,184,220] as RGB); doc.roundedRect(ML + 20, 36, 10, 10, 2, 2, "F")
    fill(WHITE); doc.roundedRect(ML + 6, 50, 24, 10, 2, 2, "F")

    sf("bold", 24, WHITE); doc.text("Business Development", ML + 48, 52)
    sf("bold", 24, [200,204,240] as RGB); doc.text("Dashboard Report", ML + 48, 76)
    sf("normal", 9, [180,184,220] as RGB)
    const sub = [activeFilters.year, activeFilters.quarter,
      activeFilters.bdCategory !== "All" ? activeFilters.bdCategory : null,
      `Generated ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}`
    ].filter(Boolean).join("  ·  ")
    doc.text(sub, ML + 48, 98)

    y = 188

    // ── KPI strip ─────────────────────────────────────────────────────────────
    const kpis = [
      { label: "Total Opportunities", val: String(summaryData.totalOpportunities), col: BRAND },
      { label: "RFPs",                val: String(summaryData.rfpCount),            col: BRAND2 },
      { label: "EOIs",                val: String(summaryData.eoiCount),            col: BRAND3 },
      { label: "Budget Value",         val: summaryData.totalBudget,                col: [16,120,80] as RGB },
      { label: "Countries",            val: String(summaryData.countriesCount),      col: [14,100,180] as RGB },
      { label: "Due in 7 days",        val: String(summaryData.upcomingDeadlines),   col: summaryData.upcomingDeadlines > 0 ? [180,50,50] as RGB : GRAY },
    ]
    const kW = (CW - 10) / 3, kH = 54
    kpis.forEach((k, i) => {
      const col = i % 3, row = Math.floor(i / 3)
      const kx = ML + col * (kW + 5), ky = y + row * (kH + 6)
      fill([230,232,245] as RGB); doc.roundedRect(kx + 2, ky + 2, kW, kH, 4, 4, "F")
      fill(WHITE); doc.roundedRect(kx, ky, kW, kH, 4, 4, "F")
      fill(k.col); doc.rect(kx, ky, 3, kH, "F")
      sf("normal", 7, GRAY); doc.text(k.label, kx + 10, ky + 15)
      sf("bold", 22, k.col); doc.text(k.val, kx + 10, ky + 38)
    })
    y += Math.ceil(kpis.length / 3) * (kH + 6) + 16

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 2 — PIPELINE OVERVIEW
    // ══════════════════════════════════════════════════════════════════════════
    newPage()
    H1("Pipeline Overview", `${rawData.length} total opportunities`)

    // Status breakdown — coloured bars
    if (statusData.length) {
      H2("Status Distribution")
      barChart(statusData, "name", "value", (item) => STATUS_COLORS[item.name] || BRAND)
    }

    // BD Type (RFP vs EOI)
    if (bdTypeData.length) {
      H2("BD Type (RFP / EOI)")
      barChart(bdTypeData)
    }

    // Origin of BD
    if (originData.length) {
      H2("Origin of BD Opportunities")
      barChart(originData)
    }

    // ── quarterly breakdown from raw data ─────────────────────────────────────
    const qMap: Record<string, { total: number; won: number; submitted: number; lost: number }> = {}
    rawData.forEach(r => {
      const k = `${r.year || "?"} ${r.quarter || "?"}`
      if (!qMap[k]) qMap[k] = { total: 0, won: 0, submitted: 0, lost: 0 }
      qMap[k].total++
      if (r.status === "Won") qMap[k].won++
      else if (r.status === "Submitted") qMap[k].submitted++
      else if (r.status === "Lost") qMap[k].lost++
    })
    const qRows = Object.entries(qMap).sort(([a],[b]) => a.localeCompare(b))
    if (qRows.length > 1) {
      H2("Quarterly Breakdown")
      table(
        ["Period", "Total", "Won", "Submitted", "Lost", "Win Rate"],
        qRows.map(([period, d]) => [
          period, d.total, d.won, d.submitted, d.lost,
          d.total > 0 ? `${Math.round((d.won/d.total)*100)}%` : "0%"
        ]),
        [100, 50, 50, 70, 50, 70]
      )
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 3 — BUSINESS LINES & SECTORS
    // ══════════════════════════════════════════════════════════════════════════
    newPage()
    H1("Business Lines & Sectors")

    if (blData.length) {
      H2("Business Line Distribution")
      barChart(blData)
      sp(4)
      table(
        ["Business Line", "Count", "%", "Won", "Win Rate"],
        blData.map(b => {
          const won = rawData.filter(r => r.businessLine === b.name && r.status === "Won").length
          const wr = b.value > 0 ? `${Math.round((won/b.value)*100)}%` : "—"
          return [b.name, b.value, b.percentage ? `${b.percentage}%` : "", won, wr]
        }),
        [180, 50, 50, 50, 70]
      )
    }

    if (serviceData.length) {
      H2("Service Offerings")
      barChart(serviceData.slice(0, 10))
    }

    if (clientData.length) {
      H2("Client Types")
      barChart(clientData)
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 4 — WIN RATE & PERFORMANCE ANALYSIS
    // ══════════════════════════════════════════════════════════════════════════
    newPage()
    H1("Win Rate & Performance Analysis")

    if (winRateData.length) {
      H2("Win Rate by Business Line")
      // horizontal win-rate bar
      const maxWR = Math.max(...winRateData.map((w: any) => w.winRate || 0), 1)
      winRateData.forEach((w: any) => {
        ensure(BAR_ROW + 2)
        const bx = ML + LW + 3, by = y - 11, bh = BAR_ROW - 5
        const fw = Math.max(2, Math.round((w.winRate / 100) * BarW))
        const col: RGB = w.winRate >= 50 ? GREEN : w.winRate >= 25 ? AMBER : RED
        sf("normal", 7.5, DKGRAY); doc.text(String(w.name || "").slice(0,24), ML, y - 2)
        fill([230,232,245] as RGB); doc.roundedRect(bx, by, BarW, bh, 2, 2, "F")
        fill(col); doc.roundedRect(bx, by, fw, bh, 2, 2, "F")
        sf("bold", 7.5, col); doc.text(`${w.winRate}%`, bx + BarW + 4, y - 2)
        y += BAR_ROW
      })
      sp(8)

      H2("Win Rate Detail")
      table(
        ["Business Line", "Win Rate", "Won", "Submitted", "Lost", "In Progress", "Total"],
        winRateData.map((w: any) => [
          w.name, `${w.winRate}%`, w.won ?? 0, w.submitted ?? 0, w.lost ?? 0, w.inProgress ?? 0, w.total ?? 0
        ]),
        [160, 60, 44, 66, 44, 66, 44]
      )
    }

    // Budget analysis from raw data
    const budgetByBL: Record<string, number> = {}
    rawData.forEach(r => {
      if (r.businessLine && r.budget > 0) {
        budgetByBL[r.businessLine] = (budgetByBL[r.businessLine] || 0) + r.budget
      }
    })
    const budgetRows = Object.entries(budgetByBL).sort(([,a],[,b]) => b - a).slice(0, 10)
    if (budgetRows.length) {
      H2("Budget Value by Business Line (US$)")
      const maxBudget = Math.max(...budgetRows.map(([,v]) => v), 1)
      budgetRows.forEach(([bl, val]) => {
        const display = val >= 1_000_000 ? `$${(val/1_000_000).toFixed(1)}M` : `$${(val/1000).toFixed(0)}K`
        ensure(BAR_ROW + 2)
        const bx = ML + LW + 3, by = y - 11, bh = BAR_ROW - 5
        const fw = Math.max(2, Math.round((val/maxBudget)*BarW))
        sf("normal", 7.5, DKGRAY); doc.text(bl.slice(0,24), ML, y - 2)
        fill([230,232,245] as RGB); doc.roundedRect(bx, by, BarW, bh, 2, 2, "F")
        fill(BRAND3); doc.roundedRect(bx, by, fw, bh, 2, 2, "F")
        sf("bold", 7.5, BRAND3); doc.text(display, bx + BarW + 4, y - 2)
        y += BAR_ROW
      })
      sp(8)
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 5 — TEAM PERFORMANCE
    // ══════════════════════════════════════════════════════════════════════════
    newPage()
    H1("Team Performance")

    if (teamData.length) {
      // assignments by role
      const roleMap: Record<string, { count: number; members: Record<string, number> }> = {}
      teamData.forEach((t: any) => {
        if (!roleMap[t.role]) roleMap[t.role] = { count: 0, members: {} }
        roleMap[t.role].count++
        roleMap[t.role].members[t.name] = (roleMap[t.role].members[t.name] || 0) + 1
      })
      H2("Assignments by Role")
      const roleRows = Object.entries(roleMap).sort(([,a],[,b]) => b.count - a.count)
      const maxRole = Math.max(...roleRows.map(([,v]) => v.count), 1)
      const ROLE_COLORS: Record<string, RGB> = {
        "PC": BRAND, "PD": BRAND2, "Methodology": GREEN, "CVS & Project profiles": AMBER,
        "Workplan & Budget": BLUE, "Other activity": PURPLE
      }
      roleRows.forEach(([role, data]) => {
        barRow(role, data.count, maxRole, ROLE_COLORS[role] || BRAND3)
      })
      sp(8)

      // top contributors per role
      H2("Top Contributors by Role")
      const contribRows: (string|number)[][] = []
      roleRows.forEach(([role, data]) => {
        Object.entries(data.members).sort(([,a],[,b]) => b - a).slice(0, 5).forEach(([name, cnt]) => {
          const projects = teamData.filter((t: any) => t.name === name && t.role === role)
          const won = projects.filter((t: any) => {
            const rec = rawData.find(r => r.title === t.projectTitle)
            return rec?.status === "Won"
          }).length
          contribRows.push([name, role, cnt, won, cnt > 0 ? `${Math.round((won/cnt)*100)}%` : "0%"])
        })
      })
      table(
        ["Team Member", "Role", "Assignments", "Won", "Win Rate"],
        contribRows.slice(0, 30),
        [140, 130, 70, 50, 64]
      )

      // individual member summary
      const memberMap: Record<string, { assignments: number; roles: Set<string>; won: number }> = {}
      teamData.forEach((t: any) => {
        if (!memberMap[t.name]) memberMap[t.name] = { assignments: 0, roles: new Set(), won: 0 }
        memberMap[t.name].assignments++
        memberMap[t.name].roles.add(t.role)
        const rec = rawData.find(r => r.title === t.projectTitle)
        if (rec?.status === "Won") memberMap[t.name].won++
      })
      const memberRows = Object.entries(memberMap)
        .sort(([,a],[,b]) => b.assignments - a.assignments)
        .map(([name, d]) => [
          name, d.assignments, d.won,
          d.assignments > 0 ? `${Math.round((d.won/d.assignments)*100)}%` : "0%",
          [...d.roles].join(", ").slice(0, 40)
        ])

      H2("Individual Member Summary")
      table(
        ["Team Member", "Assignments", "Won", "Win Rate", "Roles"],
        memberRows,
        [130, 68, 44, 64, 148]
      )
    } else {
      sf("normal", 9, GRAY)
      doc.text("No team assignment data available for the selected filters.", ML, y); sp(20)
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 6 — GEOGRAPHIC DISTRIBUTION
    // ══════════════════════════════════════════════════════════════════════════
    newPage()
    H1("Geographic Distribution")

    if (geoData.length) {
      H2("Opportunities by Country")
      barChart(geoData, "country", "value")
      sp(4)
      table(
        ["Country", "Count", "%", "Business Lines"],
        geoData.map(g => {
          const total = geoData.reduce((s, x) => s + x.value, 0)
          return [g.country, g.value, total > 0 ? `${Math.round((g.value/total)*100)}%` : "0%",
            (g.businessLines || []).join(", ").slice(0, 50)]
        }),
        [120, 44, 44, 246]
      )
    } else {
      sf("normal", 9, GRAY); doc.text("No geographic data available.", ML, y); sp(20)
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 7 — INDIVIDUAL OPPORTUNITIES
    // ══════════════════════════════════════════════════════════════════════════
    newPage()
    H1("Individual Opportunities", `${rawData.length} records`)

    if (rawData.length) {
      // group by BD type for readability
      const rfps = rawData.filter(r => r.bd === "RFP")
      const eois = rawData.filter(r => r.bd === "EOI")

      const oppTable = (records: any[]) => {
        table(
          ["Project Title", "Organisation", "Country", "BL", "Status", "Budget", "Deadline"],
          records.map(r => {
            const budget = r.budget > 0
              ? r.budget >= 1_000_000 ? `$${(r.budget/1_000_000).toFixed(1)}M` : `$${(r.budget/1000).toFixed(0)}K`
              : "—"
            return [
              (r.title || "").slice(0, 38),
              (r.organization || "").slice(0, 22),
              (r.country || "").slice(0, 14),
              (r.businessLine || "").slice(0, 14),
              r.status || "—",
              budget,
              r.deadline ? String(r.deadline).slice(0, 10) : "—",
            ]
          }),
          [142, 88, 56, 56, 64, 50, 62]
        )
      }

      if (rfps.length) { H2(`RFPs / Proposals  (${rfps.length})`); oppTable(rfps) }
      if (eois.length) { H2(`EOIs  (${eois.length})`); oppTable(eois) }
    } else {
      sf("normal", 9, GRAY); doc.text("No data matches the selected filters.", ML, y)
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FOOTER on every page
    // ══════════════════════════════════════════════════════════════════════════
    const total = (doc.internal as any).getNumberOfPages()
    for (let p = 1; p <= total; p++) {
      doc.setPage(p)
      fill(BRAND); doc.rect(0, PH - FOOTER, PW, FOOTER, "F")
      fill(ACCENT); doc.rect(0, PH - FOOTER, PW, 2, "F")
      sf("normal", 7, WHITE)
      doc.text("Business Development Dashboard", ML, PH - 8)
      doc.text(`Page ${p} of ${total}`, PW / 2, PH - 8, { align: "center" })
      doc.text(new Date().toLocaleDateString("en-GB"), PW - MR, PH - 8, { align: "right" })
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"))
    const fileName  = `BD_Report_${activeFilters.year}_${activeFilters.quarter}_${new Date().toISOString().split("T")[0]}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
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
