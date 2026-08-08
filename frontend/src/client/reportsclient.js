'use client';

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, FileSpreadsheet, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import Navbar from '@/components/Navbars';
import { dashboardService, transactionService } from '@/services';

const fmt = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

const fmtShort = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}rb`
  return String(Math.round(n))
}

const ALLOC_CONFIG = {
  pribadi:  { label: 'Pribadi',  color: '#6366f1', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  keluarga: { label: 'Keluarga', color: '#ec4899', badge: 'bg-pink-100 text-pink-700 border-pink-200'       },
  tabungan: { label: 'Tabungan', color: '#22c55e', badge: 'bg-green-100 text-green-700 border-green-200'    },
}

const MONTHS_FULL = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
]

// ── Kartu alokasi dengan persentase + expandable list ─────────
function AllocCard({ type, current, previous, totalExpense, transactions }) {
  const [expanded, setExpanded] = useState(false)
  const cfg      = ALLOC_CONFIG[type]
  const diff     = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null
  const Icon     = diff === null ? Minus : diff > 0 ? TrendingUp : TrendingDown
  const trendCls = diff === null ? 'text-gray-400' : diff > 0 ? 'text-red-500' : 'text-green-500'
  const pct      = totalExpense > 0 ? Math.round((current / totalExpense) * 100) : 0

  const typeTx = transactions
    .filter(t => t.allocationType === type && t.type === 'expense')
    .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.badge}`}>{cfg.label}</span>
          <div className={`flex items-center gap-1 text-xs font-semibold ${trendCls}`}>
            <Icon size={13} />
            {diff !== null ? `${Math.abs(diff)}%` : '—'}
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-800 mb-1">{fmt(current)}</p>
        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
          <span>vs bulan lalu: {fmt(previous)}</span>
          <span className="font-bold text-gray-600">{pct}% dari total</span>
        </div>

        {/* Progress bar persentase */}
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: cfg.color }}
          />
        </div>
      </div>

      {/* Tombol expand transaksi */}
      {typeTx.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between px-5 py-2.5 border-t border-gray-50 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <span>{typeTx.length} transaksi</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* List transaksi expandable */}
          {expanded && (
            <div className="border-t border-gray-50 max-h-52 overflow-y-auto">
              {typeTx.map(t => (
                <div key={t.id} className="flex items-center justify-between px-5 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <div className="min-w-0 mr-3">
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {t.category?.name || '—'}
                    </p>
                    {t.contextNote && (
                      <p className="text-xs text-gray-400 truncate">{t.contextNote}</p>
                    )}
                    <p className="text-xs text-gray-300">{t.transactionDate}</p>
                  </div>
                  <span className="text-xs font-bold text-red-500 flex-shrink-0">
                    -{fmt(parseFloat(t.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-gray-700">{d.name}</p>
      <p className="font-bold" style={{ color: d.payload?.color || d.fill }}>{fmt(d.value)}</p>
    </div>
  )
}

// ── Halaman Laporan ────────────────────────────────────────────
export default function Report() {
  const [loading,      setLoading]      = useState(true)
  const [loaded,       setLoaded]       = useState(false) // data sudah berhasil dimuat (cegah flash Rp0)
  const [exporting,    setExporting]    = useState(null) // 'pdf' | 'excel' | null
  const [summary,      setSummary]      = useState(null)
  const [insight,      setInsight]      = useState([])
  const [transactions, setTransactions] = useState([])
  const [activeTab,    setActiveTab]    = useState('alokasi')
  const [loadError,    setLoadError]    = useState(null)

  const now  = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  useEffect(() => { loadAll() }, [month, year])

  async function loadAll() {
    setLoading(true)
    setLoadError(null)
    try {
      const [s, i, t] = await Promise.all([
        dashboardService.getSummary(month, year),
        dashboardService.getInsight(month, year),
        transactionService.getAll({ month, year }),
      ])
      setSummary(s.data.data)
      setInsight(i.data.data)
      setTransactions(t.data.data)
      setLoaded(true)
    } catch (e) {
      console.error(e)
      setLoaded(false)
      setLoadError('Gagal memuat data. Pastikan backend berjalan, lalu coba lagi.')
    }
    setLoading(false)
  }

  // ── Export Excel (powerfull) ──────────────────────────────────
  async function exportExcel() {
    setExporting('excel')
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb      = new ExcelJS.Workbook()
      wb.creator    = 'Fin Smart'
      wb.created    = new Date()

      const periodLabel = `${MONTHS_FULL[month-1]} ${year}`
      const totalExp    = summary?.expense || 0

      // ── Warna palette ──
      const C = {
        teal:       'FF14B8A6',
        tealLight:  'FFE6FFFA',
        tealDark:   'FF0D9488',
        white:      'FFFFFFFF',
        gray50:     'FFF9FAFB',
        gray100:    'FFF3F4F6',
        gray400:    'FF9CA3AF',
        gray700:    'FF374151',
        gray800:    'FF1F2937',
        green:      'FF16A34A',
        greenLight: 'FFF0FDF4',
        red:        'FFDC2626',
        redLight:   'FFFEF2F2',
        indigo:     'FF6366F1',
        indigoLight:'FFEEF2FF',
        pink:       'FFEC4899',
        pinkLight:  'FFFDF2F8',
        emerald:    'FF10B981',
        emeraldLight:'FFF0FDF4',
        yellow:     'FFFBBF24',
      }

      const border = (color = 'FFE5E7EB') => ({
        style: 'thin', color: { argb: color }
      })
      const allBorders = (color) => ({
        top: border(color), bottom: border(color),
        left: border(color), right: border(color),
      })

      // ════════════════════════════════════════
      // SHEET 1 — RINGKASAN EKSEKUTIF
      // ════════════════════════════════════════
      const ws1 = wb.addWorksheet('Ringkasan', {
        properties: { tabColor: { argb: C.teal } }
      })
      ws1.views = [{ showGridLines: false }]
      ws1.columns = [
        { key: 'a', width: 3  },
        { key: 'b', width: 28 },
        { key: 'c', width: 22 },
        { key: 'd', width: 18 },
        { key: 'e', width: 3  },
      ]

      // ── Banner judul ──
      ws1.mergeCells('B1:D1')
      ws1.getCell('B1').value = '  FIN SMART'
      ws1.getCell('B1').font  = { bold: true, size: 18, color: { argb: C.white }, name: 'Calibri' }
      ws1.getCell('B1').fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.teal } }
      ws1.getCell('B1').alignment = { vertical: 'middle' }
      ws1.getRow(1).height = 36

      ws1.mergeCells('B2:D2')
      ws1.getCell('B2').value = `  LAPORAN KEUANGAN — ${periodLabel.toUpperCase()}`
      ws1.getCell('B2').font  = { size: 10, color: { argb: C.white }, name: 'Calibri' }
      ws1.getCell('B2').fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.tealDark } }
      ws1.getCell('B2').alignment = { vertical: 'middle' }
      ws1.getRow(2).height = 22

      ws1.addRow([])

      // ── Ringkasan utama ──
      const summaryRows = [
        { label: 'Total Pemasukan',   value: summary?.income  || 0, color: C.green,  bg: C.greenLight  },
        { label: 'Total Pengeluaran', value: summary?.expense || 0, color: C.red,    bg: C.redLight    },
        { label: 'Saldo Bersih',      value: summary?.balance || 0, color: C.teal,   bg: C.tealLight   },
      ]

      summaryRows.forEach(({ label, value, color, bg }) => {
        const r = ws1.addRow(['', label, '', value, ''])
        r.height = 28
        r.getCell(2).font      = { bold: true, size: 11, color: { argb: color }, name: 'Calibri' }
        r.getCell(2).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
        r.getCell(2).alignment = { vertical: 'middle', indent: 1 }
        r.getCell(3).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
        r.getCell(4).value     = value
        r.getCell(4).numFmt    = '"Rp"#,##0'
        r.getCell(4).font      = { bold: true, size: 12, color: { argb: color }, name: 'Calibri' }
        r.getCell(4).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
        r.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' }
        ws1.mergeCells(`B${r.number}:C${r.number}`)
      })

      ws1.addRow([])

      // ── Header tabel alokasi ──
      const ah = ws1.addRow(['', 'TIPE ALOKASI', 'NOMINAL', 'PERSENTASE', ''])
      ah.height = 24
      ;['B','C','D'].forEach(col => {
        ah.getCell(col).font      = { bold: true, size: 10, color: { argb: C.white }, name: 'Calibri' }
        ah.getCell(col).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.teal } }
        ah.getCell(col).alignment = { vertical: 'middle', horizontal: col === 'B' ? 'left' : 'right', indent: col === 'B' ? 1 : 0 }
        ah.getCell(col).border    = allBorders(C.teal)
      })

      const allocColors = { pribadi: C.indigo, keluarga: C.pink, tabungan: C.emerald }
      const allocBg     = { pribadi: C.indigoLight, keluarga: C.pinkLight, tabungan: C.emeraldLight }

      ;['pribadi','keluarga','tabungan'].forEach((type, idx) => {
        const ins = insight.find(i => i.allocationType === type)
        const val = ins?.current || 0
        const pct = totalExp > 0 ? (val / totalExp * 100).toFixed(1) : '0.0'
        const r   = ws1.addRow(['', ALLOC_CONFIG[type].label, val, `${pct}%`, ''])
        r.height  = 22

        r.getCell('B').font      = { bold: true, size: 10, color: { argb: allocColors[type] }, name: 'Calibri' }
        r.getCell('B').fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? allocBg[type] : C.white } }
        r.getCell('B').alignment = { vertical: 'middle', indent: 1 }
        r.getCell('B').border    = allBorders()

        r.getCell('C').value     = val
        r.getCell('C').numFmt    = '"Rp"#,##0'
        r.getCell('C').font      = { size: 10, name: 'Calibri', color: { argb: C.gray700 } }
        r.getCell('C').fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? allocBg[type] : C.white } }
        r.getCell('C').alignment = { vertical: 'middle', horizontal: 'right' }
        r.getCell('C').border    = allBorders()

        r.getCell('D').font      = { bold: true, size: 10, name: 'Calibri', color: { argb: allocColors[type] } }
        r.getCell('D').fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? allocBg[type] : C.white } }
        r.getCell('D').alignment = { vertical: 'middle', horizontal: 'right' }
        r.getCell('D').border    = allBorders()
      })

      ws1.addRow([])

      // ── Insight ──
      const insightItems = insight.filter(i => i.message)
      if (insightItems.length > 0) {
        const ih = ws1.addRow(['', 'INSIGHT BULAN INI', '', '', ''])
        ih.getCell('B').font  = { bold: true, size: 10, color: { argb: C.white }, name: 'Calibri' }
        ih.getCell('B').fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.teal } }
        ih.height = 22
        ws1.mergeCells(`B${ih.number}:D${ih.number}`)

        insightItems.forEach((item, idx) => {
          const r = ws1.addRow(['', `  ${idx + 1}. ${item.message}`, '', '', ''])
          r.getCell('B').font      = { size: 10, name: 'Calibri', color: { argb: C.gray700 } }
          r.getCell('B').fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? C.gray50 : C.white } }
          r.getCell('B').alignment = { vertical: 'middle', wrapText: true }
          r.height = 20
          ws1.mergeCells(`B${r.number}:D${r.number}`)
        })
      }

      // Footer
      ws1.addRow([])
      const fr = ws1.addRow(['', `Digenerate oleh Fin Smart pada ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`, '', '', ''])
      fr.getCell('B').font      = { italic: true, size: 9, color: { argb: C.gray400 }, name: 'Calibri' }
      fr.getCell('B').alignment = { indent: 1 }
      ws1.mergeCells(`B${fr.number}:D${fr.number}`)

      // ════════════════════════════════════════
      // SHEET 2 — DETAIL TRANSAKSI
      // ════════════════════════════════════════
      const ws2 = wb.addWorksheet('Transaksi', {
        properties: { tabColor: { argb: C.indigo } }
      })
      ws2.views = [{ showGridLines: false, state: 'frozen', ySplit: 3 }]
      ws2.columns = [
        { key: 'no',     width: 5  },
        { key: 'date',   width: 14 },
        { key: 'cat',    width: 22 },
        { key: 'type',   width: 14 },
        { key: 'alloc',  width: 14 },
        { key: 'amount', width: 20 },
        { key: 'note',   width: 32 },
      ]

      // Banner
      ws2.mergeCells('A1:G1')
      ws2.getCell('A1').value     = `DETAIL TRANSAKSI — ${periodLabel.toUpperCase()}`
      ws2.getCell('A1').font      = { bold: true, size: 13, color: { argb: C.white }, name: 'Calibri' }
      ws2.getCell('A1').fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.teal } }
      ws2.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' }
      ws2.getRow(1).height = 30

      // Sub header info
      ws2.mergeCells('A2:G2')
      ws2.getCell('A2').value     = `Total ${transactions.length} transaksi  |  Pemasukan: ${fmt(summary?.income || 0)}  |  Pengeluaran: ${fmt(summary?.expense || 0)}`
      ws2.getCell('A2').font      = { size: 9, color: { argb: C.white }, name: 'Calibri' }
      ws2.getCell('A2').fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.tealDark } }
      ws2.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' }
      ws2.getRow(2).height = 18

      // Header kolom
      const headers = ['No', 'Tanggal', 'Kategori', 'Tipe', 'Alokasi', 'Nominal', 'Catatan']
      const hRow = ws2.addRow(headers)
      hRow.height = 22
      hRow.eachCell(cell => {
        cell.font      = { bold: true, size: 10, color: { argb: C.white }, name: 'Calibri' }
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border    = allBorders('FF4B5563')
      })

      // Data rows
      transactions
        .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
        .forEach((t, idx) => {
          const isIncome  = t.type === 'income'
          const isEven    = idx % 2 === 0
          const rowBg     = isEven ? C.white : C.gray50
          const amountColor = isIncome ? C.green : C.red

          const r = ws2.addRow([
            idx + 1,
            t.transactionDate,
            t.category?.name || '—',
            isIncome ? 'Pemasukan' : 'Pengeluaran',
            ALLOC_CONFIG[t.allocationType]?.label || t.allocationType,
            parseFloat(t.amount),
            t.contextNote || '',
          ])
          r.height = 20

          r.eachCell((cell, colNum) => {
            cell.font      = { size: 10, name: 'Calibri', color: { argb: C.gray800 } }
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } }
            cell.alignment = { vertical: 'middle' }
            cell.border    = {
              bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              left:   { style: 'thin', color: { argb: 'FFE5E7EB' } },
              right:  { style: 'thin', color: { argb: 'FFE5E7EB' } },
            }
          })

          // No — center
          r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }
          r.getCell(1).font      = { size: 9, color: { argb: C.gray400 }, name: 'Calibri' }

          // Amount — format + warna
          r.getCell(6).numFmt    = '"Rp"#,##0'
          r.getCell(6).font      = { bold: true, size: 10, color: { argb: amountColor }, name: 'Calibri' }
          r.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' }

          // Tipe — badge style
          const typeBg    = isIncome ? C.greenLight : C.redLight
          r.getCell(4).font = { bold: true, size: 9, color: { argb: amountColor }, name: 'Calibri' }
          r.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: typeBg } }
          r.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' }

          // Alokasi — badge style
          const allocColor = allocColors[t.allocationType] || C.gray700
          const allocBgColor = allocBg[t.allocationType] || C.gray100
          r.getCell(5).font = { bold: true, size: 9, color: { argb: allocColor }, name: 'Calibri' }
          r.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: allocBgColor } }
          r.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' }

          // Catatan — italic abu
          r.getCell(7).font = { italic: true, size: 9, color: { argb: C.gray400 }, name: 'Calibri' }
        })

      // Total row
      ws2.addRow([])
      const totRow = ws2.addRow(['', '', '', '', 'TOTAL PENGELUARAN', summary?.expense || 0, ''])
      totRow.height = 24
      totRow.getCell(5).font      = { bold: true, size: 10, color: { argb: C.white }, name: 'Calibri' }
      totRow.getCell(5).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.red } }
      totRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' }
      totRow.getCell(6).numFmt    = '"Rp"#,##0'
      totRow.getCell(6).font      = { bold: true, size: 11, color: { argb: C.white }, name: 'Calibri' }
      totRow.getCell(6).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.red } }
      totRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' }

      // Download
      const buf  = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `laporan-finsmart-${year}-${String(month).padStart(2,'0')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { console.error(e); alert('Gagal export Excel: ' + e.message) }
    setExporting(null)
  }

  // ── Export PDF — pure jsPDF, tanpa html2canvas (fix oklch) ────
  async function exportPDF() {
    setExporting('pdf')
    try {
      const { default: jsPDF } = await import('jspdf')

      const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW  = pdf.internal.pageSize.getWidth()
      const pageH  = pdf.internal.pageSize.getHeight()
      const ml     = 14  // margin left
      const mr     = 14  // margin right
      const cw     = pageW - ml - mr  // content width
      let   y      = 0

      const periodLabel = `${MONTHS_FULL[month-1]} ${year}`
      const totalExp    = summary?.expense || 0

      // ── Helpers ──────────────────────────────────────────────
      function checkPage(needed = 10) {
        if (y + needed > pageH - 12) {
          pdf.addPage()
          y = 14
          drawPageHeader()
        }
      }

      function drawPageHeader() {
        pdf.setFillColor(20, 184, 166)
        pdf.rect(0, 0, pageW, 10, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
        pdf.setTextColor(255, 255, 255)
        pdf.text('FIN SMART', ml, 6.5)
        pdf.setFont('helvetica', 'normal')
        pdf.text(`${periodLabel}`, pageW - mr, 6.5, { align: 'right' })
      }

      function sectionTitle(text) {
        checkPage(14)
        pdf.setFillColor(20, 184, 166)
        pdf.roundedRect(ml, y, cw, 8, 1.5, 1.5, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.setTextColor(255, 255, 255)
        pdf.text(text, ml + 3, y + 5.5)
        y += 11
      }

      function row3(label, value, sub, bgR, bgG, bgB) {
        checkPage(14)
        const h = 13
        pdf.setFillColor(bgR, bgG, bgB)
        pdf.roundedRect(ml, y, cw, h, 1.5, 1.5, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.setTextColor(50, 50, 50)
        pdf.text(label, ml + 3, y + 5)
        pdf.setFontSize(11)
        pdf.text(value, ml + 3, y + 10.5)
        if (sub) {
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(7)
          pdf.setTextColor(120, 120, 120)
          pdf.text(sub, pageW - mr, y + 10.5, { align: 'right' })
        }
        y += h + 2
      }

      // Truncasi teks agar pas dengan lebar kolom (menggunakan ukuran font aktual)
      function fitText(text, width) {
        const str  = String(text ?? '')
        const padX = 3 // ruang aman kiri+kanan
        const maxW = Math.max(width - padX, 1)
        if (pdf.getTextWidth(str) <= maxW) return str
        let result = str
        while (result.length > 1 && pdf.getTextWidth(result + '…') > maxW) {
          result = result.slice(0, -1)
        }
        return result + '…'
      }

      function tableRow(cols, data, isEven) {
        checkPage(7)
        const h = 8
        pdf.setFillColor(isEven ? 249 : 255, isEven ? 250 : 255, isEven ? 251 : 255)
        pdf.rect(ml, y, cw, h, 'F')
        pdf.setDrawColor(229, 231, 235)
        pdf.rect(ml, y, cw, h, 'S')
        let x = ml
        // Simpan font aktif untuk perhitungan yang konsisten
        const activeSize = pdf.getFontSize()
        cols.forEach(({ w, align }, i) => {
          pdf.setFontSize(activeSize)
          const val  = fitText(data[i], w)
          const opts = align === 'right' ? { align: 'right' } : {}
          const tx   = align === 'right' ? x + w - 2 : x + 2
          pdf.text(val, tx, y + 5.2, opts)
        })
        y += h
      }

      function tableHeader(cols) {
        checkPage(8)
        const h = 8
        pdf.setFillColor(55, 65, 81)
        pdf.rect(ml, y, cw, h, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
        pdf.setTextColor(255, 255, 255)
        let x = ml
        cols.forEach(({ label, w, align }) => {
          const str = String(label ?? '')
          if (align === 'right') {
            pdf.text(str, x + w - 2, y + 5.2, { align: 'right' })
          } else {
            pdf.text(str, x + 2, y + 5.2)
          }
          x += w
        })
        y += h
      }

      // ── HALAMAN 1 ─────────────────────────────────────────────
      // Cover header
      pdf.setFillColor(20, 184, 166)
      pdf.rect(0, 0, pageW, 32, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(22)
      pdf.setTextColor(255, 255, 255)
      pdf.text('FIN SMART', ml, 15)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text('LAPORAN KEUANGAN', ml, 22)
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.text(periodLabel.toUpperCase(), pageW - mr, 22, { align: 'right' })
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Digenerate: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`, pageW - mr, 29, { align: 'right' })
      y = 38

      // ── Ringkasan ──
      sectionTitle('RINGKASAN KEUANGAN')
      const summaryData = [
        { label: 'Total Pemasukan',   value: fmt(summary?.income  || 0), r: 240, g: 253, b: 244 },
        { label: 'Total Pengeluaran', value: fmt(summary?.expense || 0), r: 254, g: 242, b: 242 },
        { label: 'Saldo Bersih',      value: fmt(summary?.balance || 0), r: 240, g: 253, b: 250 },
      ]
      summaryData.forEach(d => row3(d.label, d.value, '', d.r, d.g, d.b))

      y += 4

      // ── Alokasi ──
      sectionTitle('BREAKDOWN ALOKASI')
      const allocCols = [
        { label: 'Tipe',       w: 40 },
        { label: 'Nominal',    w: 60, align: 'right' },
        { label: 'Persentase', w: 30, align: 'right' },
        { label: 'vs Bln Lalu',w: cw - 130, align: 'right' },
      ]
      tableHeader(allocCols)

      ;['pribadi','keluarga','tabungan'].forEach((type, idx) => {
        const ins   = insight.find(i => i.allocationType === type)
        const val   = ins?.current  || 0
        const prev  = ins?.previous || 0
        const pct   = totalExp > 0 ? (val / totalExp * 100).toFixed(1) + '%' : '0%'
        const trend = ins?.changePercent !== null && ins?.changePercent !== undefined
          ? (ins.changePercent > 0 ? `▲ ${ins.changePercent}%` : ins.changePercent < 0 ? `▼ ${Math.abs(ins.changePercent)}%` : 'Stabil')
          : '—'

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(50, 50, 50)
        tableRow(allocCols, [ALLOC_CONFIG[type].label, fmt(val), pct, trend], idx % 2 === 0)
      })

      y += 6

      // ── Insight ──
      const insightItems = insight.filter(i => i.message)
      if (insightItems.length > 0) {
        sectionTitle('INSIGHT BULAN INI')
        insightItems.forEach((item, idx) => {
          checkPage(8)
          pdf.setFillColor(idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 251 : 255)
          pdf.rect(ml, y, cw, 7, 'F')
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(8.5)
          pdf.setTextColor(55, 65, 81)
          pdf.text(`${idx + 1}.  ${item.message}`, ml + 3, y + 4.8)
          y += 7.5
        })
        y += 4
      }

      // ── Detail Transaksi ──
      checkPage(20)
      sectionTitle(`DETAIL TRANSAKSI (${transactions.length} transaksi)`)

      const txCols = [
        { label: 'No',       w: 10, align: 'right' },
        { label: 'Tanggal',  w: 24 },
        { label: 'Kategori', w: 38 },
        { label: 'Alokasi',  w: 24 },
        { label: 'Nominal',  w: cw - 118, align: 'right' },
        { label: 'Catatan',  w: 22 },
      ]
      tableHeader(txCols)

      const sorted = [...transactions].sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))

      sorted.forEach((t, idx) => {
        const isIncome = t.type === 'income'
        const note     = (t.contextNote || '').substring(0, 12) + (t.contextNote?.length > 12 ? '…' : '')
        const nominal  = (isIncome ? '+' : '-') + fmt(parseFloat(t.amount))

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7.5)
        pdf.setTextColor(isIncome ? 22 : 220, isIncome ? 163 : 38, isIncome ? 74 : 38)

        tableRow(txCols, [
          idx + 1,
          t.transactionDate,
          (t.category?.name || '—').substring(0, 18),
          ALLOC_CONFIG[t.allocationType]?.label || t.allocationType,
          nominal,
          note,
        ], idx % 2 === 0)

        pdf.setTextColor(50, 50, 50)
      })

      // ── Footer tiap halaman ──
      const pageCount = pdf.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setFillColor(243, 244, 246)
        pdf.rect(0, pageH - 8, pageW, 8, 'F')
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7)
        pdf.setTextColor(156, 163, 175)
        pdf.text(
          `Fin Smart  •  Laporan ${periodLabel}  •  Halaman ${i} / ${pageCount}`,
          pageW / 2, pageH - 3, { align: 'center' }
        )
      }

      pdf.save(`laporan-finsmart-${year}-${String(month).padStart(2,'0')}.pdf`)
    } catch (e) { console.error(e); alert('Gagal export PDF: ' + e.message) }
    setExporting(null)
  }

  // ── Computed data ─────────────────────────────────────────────
  const allocPieData = useMemo(() => {
    if (!summary?.byAllocation) return []
    return summary.byAllocation
      .filter(a => parseFloat(a.total) > 0)
      .map(a => ({
        name:  ALLOC_CONFIG[a.allocationType]?.label || a.allocationType,
        value: parseFloat(a.total),
        color: ALLOC_CONFIG[a.allocationType]?.color || '#888',
      }))
  }, [summary])

  const categoryPieData = useMemo(() => {
    if (!summary?.byCategory) return []
    return summary.byCategory
      .filter(c => parseFloat(c.total) > 0)
      .map(c => ({ name: c.categoryName || 'Lainnya', value: parseFloat(c.total), color: c.color || '#888' }))
  }, [summary])

  const barData = useMemo(() => {
    return ['pribadi','keluarga','tabungan'].map(type => {
      const exp = transactions.filter(t => t.type === 'expense' && t.allocationType === type).reduce((s, t) => s + parseFloat(t.amount), 0)
      const inc = transactions.filter(t => t.type === 'income'  && t.allocationType === type).reduce((s, t) => s + parseFloat(t.amount), 0)
      return { name: ALLOC_CONFIG[type].label, Pemasukan: inc, Pengeluaran: exp }
    }).filter(d => d.Pemasukan > 0 || d.Pengeluaran > 0)
  }, [transactions])

  const trendData = useMemo(() => {
    const days = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const d = t.transactionDate?.slice(8, 10)
      if (d) days[d] = (days[d] || 0) + parseFloat(t.amount)
    })
    return Object.entries(days).sort(([a],[b]) => parseInt(a)-parseInt(b)).map(([day, total]) => ({ day: parseInt(day), total }))
  }, [transactions])

  const insightItems = insight.filter(i => i.message)
  const totalExpense = summary?.expense || 0

  const TABS = [
    { key: 'alokasi',  label: 'Split Alokasi' },
    { key: 'kategori', label: 'Per Kategori'  },
    { key: 'tren',     label: 'Tren Harian'   },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="w-full px-6 lg:px-10 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-wide text-gray-800">LAPORAN</h1>
            <p className="text-sm text-gray-400 mt-0.5">{MONTHS_FULL[month-1]} {year}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Filter periode */}
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
            >
              {MONTHS_FULL.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {/* Export Excel */}
            <button onClick={exportExcel} disabled={!!exporting || loading}
              className="flex items-center gap-2 px-4 py-2 border-2 border-green-500 text-green-600 rounded-xl text-sm font-bold hover:bg-green-50 transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet size={15} />
              {exporting === 'excel' ? 'Mengekspor...' : 'Excel'}
            </button>

            {/* Export PDF */}
            <button onClick={exportPDF} disabled={!!exporting || loading}
              className="flex items-center gap-2 px-4 py-2 border-2 border-red-400 text-red-500 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <FileText size={15} />
              {exporting === 'pdf' ? 'Mengekspor...' : 'PDF'}
            </button>
          </div>
        </div>

        {loadError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <button onClick={loadAll}
              className="flex-shrink-0 px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
            >
              Muat Ulang
            </button>
          </div>
        )}

        {loading || !loaded ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-gray-400 animate-pulse">Memuat laporan...</p>
          </div>
        ) : (

          /* Konten yang di-capture untuk PDF */
          <div className="flex flex-col gap-6">

            {/* Ringkasan pemasukan / pengeluaran / saldo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Pemasukan',   value: summary?.income,  color: 'text-green-600', bg: 'bg-green-50 border-green-100'  },
                { label: 'Total Pengeluaran', value: summary?.expense, color: 'text-red-500',   bg: 'bg-red-50 border-red-100'      },
                { label: 'Saldo',             value: summary?.balance, color: 'text-teal-600',  bg: 'bg-teal-50 border-teal-100'    },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`border rounded-2xl p-5 ${bg}`}>
                  <p className="text-xs font-bold text-gray-500 tracking-wide mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{fmt(value)}</p>
                </div>
              ))}
            </div>

            {/* 3 Kartu alokasi dengan persentase + expandable transaksi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {['pribadi','keluarga','tabungan'].map(type => {
                const ins = insight.find(i => i.allocationType === type)
                return (
                  <AllocCard
                    key={type}
                    type={type}
                    current={ins?.current   || 0}
                    previous={ins?.previous || 0}
                    totalExpense={totalExpense}
                    transactions={transactions}
                  />
                )
              })}
            </div>

            {/* Insight */}
            {insightItems.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h2 className="font-bold text-sm tracking-wide mb-3 text-gray-700">INSIGHT BULAN INI</h2>
                <div className="flex flex-col gap-2">
                  {insightItems.map((item, i) => {
                    const isUp   = item.changePercent > 0
                    const isDown = item.changePercent < 0
                    return (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: ALLOC_CONFIG[item.allocationType]?.color || '#888' }}
                        />
                        <span className="text-gray-600 flex-1">{item.message}</span>
                        {item.changePercent !== null && (
                          <span className={`text-xs font-bold flex-shrink-0 ${isUp ? 'text-red-500' : isDown ? 'text-green-500' : 'text-gray-400'}`}>
                            {isUp ? '▲' : isDown ? '▼' : '—'} {Math.abs(item.changePercent)}%
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Chart tabs */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100">
                {TABS.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-3.5 text-xs font-bold tracking-wide transition-colors ${
                      activeTab === tab.key ? 'text-teal-600 border-b-2 border-teal-500' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">

                {/* Split Alokasi */}
                {activeTab === 'alokasi' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    {allocPieData.length === 0 ? (
                      <div className="col-span-2 text-center py-12 text-gray-400 text-sm">Belum ada pengeluaran bulan ini</div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie data={allocPieData} cx="50%" cy="50%" outerRadius={100} innerRadius={50}
                              dataKey="value" paddingAngle={3} labelLine={false}
                              label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                            >
                              {allocPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-col gap-3">
                          {allocPieData.map((d, i) => {
                            const pct = Math.round((d.value / totalExpense) * 100)
                            return (
                              <div key={i}>
                                <div className="flex justify-between mb-1.5 text-sm">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                                    <span className="font-medium text-gray-700">{d.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-gray-400 text-xs">{pct}%</span>
                                    <span className="font-bold text-gray-800">{fmt(d.value)}</span>
                                  </div>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                  <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Per Kategori */}
                {activeTab === 'kategori' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    {categoryPieData.length === 0 ? (
                      <div className="col-span-2 text-center py-12 text-gray-400 text-sm">Belum ada pengeluaran bulan ini</div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie data={categoryPieData} cx="50%" cy="50%" outerRadius={100} innerRadius={50}
                              dataKey="value" paddingAngle={2} labelLine={false}
                            >
                              {categoryPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                          {[...categoryPieData].sort((a,b) => b.value - a.value).map((d, i) => {
                            const pct = Math.round((d.value / totalExpense) * 100)
                            return (
                              <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                                  <span className="text-gray-700 font-medium">{d.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-gray-400 text-xs">{pct}%</span>
                                  <span className="font-bold text-gray-800 min-w-[80px] text-right">{fmt(d.value)}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Tren Harian */}
                {activeTab === 'tren' && (
                  trendData.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">Belum ada data harian bulan ini</div>
                  ) : (
                    <div>
                      <p className="text-xs text-gray-400 mb-4">Pengeluaran per hari — {MONTHS_FULL[month-1]} {year}</p>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={45} />
                          <Tooltip formatter={(v) => [fmt(v), 'Pengeluaran']} labelFormatter={d => `Tanggal ${d}`}
                            contentStyle={{ borderRadius: 8, border: '1px solid #f0f0f0', fontSize: 12 }}
                          />
                          <Bar dataKey="total" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )
                )}

              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}