import { type NextRequest, NextResponse } from "next/server"

// ── Brand colours ────────────────────────────────────────────────────────────
const BRAND  : [number,number,number] = [56,  62,  128]   // #383E80
const BRAND2 : [number,number,number] = [75,  81,  140]   // #4B518C
const LIGHT  : [number,number,number] = [238, 240, 250]   // #EEF0FA
const GRAY   : [number,number,number] = [110, 110, 110]
const WHITE  : [number,number,number] = [255, 255, 255]
const DKGRAY : [number,number,number] = [40,  40,  40]
const ROWALT : [number,number,number] = [247, 248, 252]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { summaryData, activeFilters, filteredData } = body

    const rawData     : any[] = (filteredData.rawData          || []).slice(0, 80)
    const blData      : any[] = (filteredData.businessLineData || []).sort((a:any,b:any)=>b.value-a.value)
    const geoData     : any[] = (filteredData.geoData          || []).sort((a:any,b:any)=>b.value-a.value).slice(0,15)
    const statusData  : any[] = filteredData.statusData        || []
    const winRateData : any[] = (filteredData.winRateData      || []).slice(0,12)
    const originData  : any[] = (filteredData.originData       || []).sort((a:any,b:any)=>b.value-a.value)
    const clientData  : any[] = (filteredData.clientTypeData   || []).sort((a:any,b:any)=>b.value-a.value)

    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF({ orientation:"portrait", unit:"pt", format:"a4" })

    const PW = doc.internal.pageSize.getWidth()   // 595.28
    const PH = doc.internal.pageSize.getHeight()  // 841.89
    const ML = 36, MR = 36
    const CONTENT_W = PW - ML - MR
    const FOOTER_H  = 28
    const MARGIN_B  = FOOTER_H + 16   // keep above footer
    let y = 36

    // ── low-level helpers ─────────────────────────────────────────────────────
    const sf  = (style:"normal"|"bold", size:number, color=DKGRAY) => {
      doc.setFont("helvetica", style)
      doc.setFontSize(size)
      doc.setTextColor(...color)
    }

    /** Ensure there's `need` pts before the bottom margin; add page if not. */
    const ensure = (need:number) => {
      if (y + need > PH - MARGIN_B) { newPage() }
    }

    const newPage = () => {
      doc.addPage()
      y = 44
    }

    const hline = (yy:number, col:[number,number,number]=[210,210,210], x1=ML, x2=PW-MR) => {
      doc.setDrawColor(...col)
      doc.setLineWidth(0.5)
      doc.line(x1, yy, x2, yy)
    }

    // ── section heading ───────────────────────────────────────────────────────
    const H1_H = 30
    const heading1 = (text:string) => {
      ensure(H1_H + 20)
      doc.setFillColor(...BRAND)
      doc.rect(ML, y, CONTENT_W, H1_H, "F")
      sf("bold", 13, WHITE)
      doc.text(text, ML + 10, y + 20)
      y += H1_H + 10
    }

    const heading2 = (text:string) => {
      ensure(24)
      sf("bold", 10, BRAND2)
      doc.text(text, ML, y)
      y += 16
    }

    const spacer = (pt=8) => { y += pt }

    // ── bar-chart section ─────────────────────────────────────────────────────
    const BAR_ROW_H = 18
    const LABEL_W   = 140
    const COUNT_W   = 32
    const BAR_W     = CONTENT_W - LABEL_W - COUNT_W - 8

    const barRows = (items:any[], labelKey="name", valueKey="value") => {
      if (!items.length) return
      const maxVal = Math.max(...items.map((i:any)=>i[valueKey]||0), 1)
      items.forEach((item:any) => {
        ensure(BAR_ROW_H + 2)
        const label = String(item[labelKey]||"").slice(0,26)
        const val   = item[valueKey]||0
        const fill  = Math.max(2, Math.round((val/maxVal)*BAR_W))
        const bx    = ML + LABEL_W + 4
        const by    = y - BAR_ROW_H + 5

        // label
        sf("normal", 7.5, GRAY)
        doc.text(label, ML, y - 3)

        // background track
        doc.setFillColor(...LIGHT)
        doc.roundedRect(bx, by, BAR_W, BAR_ROW_H - 6, 2, 2, "F")

        // filled bar
        doc.setFillColor(...BRAND)
        doc.roundedRect(bx, by, fill, BAR_ROW_H - 6, 2, 2, "F")

        // value
        sf("bold", 7.5, BRAND)
        doc.text(String(val), bx + BAR_W + 5, y - 3)

        y += BAR_ROW_H
      })
      spacer(6)
    }

    // ── data table ────────────────────────────────────────────────────────────
    const ROW_H = 17

    const drawTable = (headers:string[], rows:string[][], colWidths:number[]) => {
      const tableW = colWidths.reduce((a,b)=>a+b,0)

      // header — always keep header + at least 1 data row together
      ensure(ROW_H * 2 + 4)

      // header bg
      doc.setFillColor(...BRAND)
      doc.rect(ML, y, tableW, ROW_H, "F")
      sf("bold", 7, WHITE)
      let x = ML
      headers.forEach((h,i)=>{ doc.text(h, x+4, y+11); x+=colWidths[i] })
      y += ROW_H

      rows.forEach((row,ri)=>{
        ensure(ROW_H)
        doc.setFillColor(...(ri%2===0 ? WHITE : ROWALT))
        doc.rect(ML, y, tableW, ROW_H, "F")
        // bottom rule
        doc.setDrawColor(218,218,228)
        doc.setLineWidth(0.3)
        doc.line(ML, y+ROW_H, ML+tableW, y+ROW_H)

        sf("normal", 7, DKGRAY)
        let x = ML
        row.forEach((cell,i)=>{
          const txt = String(cell||"").slice(0,55)
          doc.text(txt, x+4, y+11)
          x+=colWidths[i]
        })
        y += ROW_H
      })
      spacer(10)
    }

    // ══════════════════════════════════════════════════════════════════════════
    // COVER PAGE
    // ══════════════════════════════════════════════════════════════════════════
    doc.setFillColor(...BRAND)
    doc.rect(0, 0, PW, 160, "F")

    sf("bold", 26, WHITE)
    doc.text("Business Development", ML, 72)
    doc.text("Dashboard Report", ML, 102)

    sf("normal", 9, [180,184,220] as [number,number,number])
    const subtitle = [
      activeFilters.year,
      activeFilters.quarter,
      activeFilters.bdCategory !== "All" ? activeFilters.bdCategory : null,
      `Generated ${new Date().toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"})}`,
    ].filter(Boolean).join("  ·  ")
    doc.text(subtitle, ML, 126)

    // accent line
    doc.setFillColor(255,200,60)
    doc.rect(ML, 140, 60, 4, "F")

    y = 180

    // ── KPI cards ─────────────────────────────────────────────────────────────
    const kpis = [
      { label:"Total Opportunities", value:String(summaryData.totalOpportunities), sub:`${activeFilters.year} · ${activeFilters.quarter}` },
      { label:"RFP / EOI",           value:`${summaryData.rfpCount} / ${summaryData.eoiCount}` },
      { label:"Total Budget",         value:summaryData.totalBudget },
      { label:"Countries Covered",    value:String(summaryData.countriesCount) },
      { label:"Upcoming Deadlines",   value:String(summaryData.upcomingDeadlines), sub:"next 7 days" },
    ]
    const COLS = 3
    const CARD_W = (CONTENT_W - (COLS-1)*8) / COLS
    const CARD_H = 58

    kpis.forEach((k,idx)=>{
      const col = idx % COLS
      const row = Math.floor(idx / COLS)
      const cx = ML + col*(CARD_W+8)
      const cy = y + row*(CARD_H+8)
      // shadow effect
      doc.setFillColor(210,212,235)
      doc.roundedRect(cx+2, cy+2, CARD_W, CARD_H, 4, 4, "F")
      // card
      doc.setFillColor(...LIGHT)
      doc.roundedRect(cx, cy, CARD_W, CARD_H, 4, 4, "F")
      // left accent
      doc.setFillColor(...BRAND)
      doc.rect(cx, cy, 3, CARD_H, "F")

      sf("normal", 7, GRAY)
      doc.text(k.label, cx+10, cy+16)
      sf("bold", 20, BRAND)
      doc.text(k.value, cx+10, cy+38)
      if (k.sub) { sf("normal", 6.5, GRAY); doc.text(k.sub, cx+10, cy+50) }
    })
    y += Math.ceil(kpis.length/COLS)*(CARD_H+8) + 16

    // ══════════════════════════════════════════════════════════════════════════
    // BUSINESS LINE
    // ══════════════════════════════════════════════════════════════════════════
    if (blData.length) {
      heading1("Business Line Distribution")
      barRows(blData)
      drawTable(
        ["Business Line","Count","%"],
        blData.map(b=>[b.name, String(b.value), b.percentage?`${b.percentage}%`:""]),
        [220, 70, 70]
      )
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CLIENT TYPE
    // ══════════════════════════════════════════════════════════════════════════
    if (clientData.length) {
      heading1("Client Type Breakdown")
      barRows(clientData)
      drawTable(["Client Type","Count"], clientData.map(c=>[c.name,String(c.value)]), [290,70])
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GEOGRAPHIC DISTRIBUTION
    // ══════════════════════════════════════════════════════════════════════════
    heading1("Geographic Distribution")
    if (geoData.length) {
      heading2("Top Countries by Opportunities")
      barRows(geoData, "country", "value")
      drawTable(
        ["Country","Count","Business Lines"],
        geoData.map(g=>[g.country, String(g.value), (g.businessLines||[]).join(", ").slice(0,46)]),
        [130, 50, 180]
      )
    } else {
      sf("normal",9,GRAY); doc.text("No geographic data available.", ML, y); y+=18
    }

    // ══════════════════════════════════════════════════════════════════════════
    // BD ORIGIN
    // ══════════════════════════════════════════════════════════════════════════
    if (originData.length) {
      heading1("BD Origin")
      barRows(originData)
      drawTable(["Origin","Count"], originData.map(o=>[o.name,String(o.value)]), [290,70])
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PIPELINE STATUS
    // ══════════════════════════════════════════════════════════════════════════
    heading1("Pipeline Status")
    if (statusData.length) {
      barRows(statusData, "name", "value")
      drawTable(
        ["Status","Count"],
        statusData.map((s:any)=>[s.name||s.status, String(s.value)]),
        [290,70]
      )
    } else {
      sf("normal",9,GRAY); doc.text("No status data available.",ML,y); y+=18
    }

    // ══════════════════════════════════════════════════════════════════════════
    // WIN RATE ANALYSIS
    // ══════════════════════════════════════════════════════════════════════════
    if (winRateData.length) {
      heading1("Win Rate Analysis")
      drawTable(
        ["Category","Win Rate","Won","Lost","Total"],
        winRateData.map((w:any)=>[w.name,`${w.winRate}%`,String(w.won??""),String(w.lost??""),String(w.total??"")]),
        [168, 68, 50, 50, 50]
      )
    }

    // ══════════════════════════════════════════════════════════════════════════
    // OPPORTUNITIES LIST — always starts on a new page
    // ══════════════════════════════════════════════════════════════════════════
    newPage()
    heading1(`Opportunities List  (${rawData.length} of ${filteredData.rawData?.length??0} shown)`)

    if (rawData.length) {
      drawTable(
        ["Type","Yr","Qtr","Project Title","Organisation","Country","Status"],
        rawData.map(r=>[
          r.bd||"",
          r.year||"",
          r.quarter||"",
          (r.title||"").slice(0,36),
          (r.organization||"").slice(0,22),
          (r.country||"").slice(0,18),
          r.status||"",
        ]),
        [30, 26, 26, 190, 120, 96, 55]
      )
    } else {
      sf("normal",9,GRAY)
      doc.text("No data matches the selected filters.",ML,y); y+=18
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE NUMBERS + FOOTER
    // ══════════════════════════════════════════════════════════════════════════
    const totalPages = (doc.internal as any).getNumberOfPages()
    for (let p=1; p<=totalPages; p++) {
      doc.setPage(p)
      // footer bar
      doc.setFillColor(...BRAND)
      doc.rect(0, PH-FOOTER_H, PW, FOOTER_H, "F")
      sf("normal", 7, WHITE)
      doc.text("Business Development Dashboard", ML, PH-10)
      doc.text(`Page ${p} of ${totalPages}`, PW/2, PH-10, {align:"center"})
      doc.text(new Date().toLocaleDateString("en-GB"), PW-MR, PH-10, {align:"right"})
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
      { error:`Failed to generate report: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status:500 }
    )
  }
}
