import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { X, Upload, Search } from 'lucide-react'
import Papa from 'papaparse'

export default function Baza({ onClose, role }: { onClose: () => void, role: string | null }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    loadBaza()
  }, [])

  async function loadBaza() {
    setLoading(true)
    const { data } = await supabase.from('spravochnik').select('*').order('nazvanie')
    if (data) setItems(data)
    setLoading(false)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setLogs(['Начинаем чтение файла...'])

    Papa.parse(file, {
      delimiter: ';',
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as string[][]
        let updatedCount = 0
        let newCount = 0
        let skipped = 0

        setLogs(prev => [...prev, `Прочитано строк: ${rows.length}`])

        for (const row of rows) {
          if (!row[0] || row[0].trim() === '' || row[1]?.includes('Со знач')) {
            skipped++
            continue
          }

          const shtrihkod = row[0].replace(/['"\s]/g, '')
          const nazvanie = row[1]?.replace(/['"]/g, '').trim()
          const edIzm = row[2]?.trim() || 'м²'
          const ostatokStr = row[4]?.replace(/,/g, '.').trim() || '0'
          const ostatok = parseFloat(ostatokStr)

          if (!shtrihkod || !nazvanie || isNaN(ostatok)) {
            skipped++
            continue
          }

          const { data: existing } = await supabase.from('spravochnik').select('id').eq('shtrihkod', shtrihkod).single()

          if (existing) {
            await supabase.from('spravochnik').update({ ostatok, nazvanie, ed_izm: edIzm }).eq('id', existing.id)
            updatedCount++
          } else {
            await supabase.from('spravochnik').insert([{ shtrihkod, nazvanie, ed_izm: edIzm, ostatok }])
            newCount++
          }
        }

        setLogs(prev => [...prev, `Готово! Обновлено: ${updatedCount}, Добавлено: ${newCount}, Пропущено: ${skipped}`])
        setUploading(false)
        loadBaza()
      },
      error: (error) => {
        setLogs(prev => [...prev, `Ошибка: ${error.message}`])
        setUploading(false)
      }
    })
  }

  const filteredItems = items.filter(i => 
    i.nazvanie.toLowerCase().includes(search.toLowerCase()) || 
    i.shtrihkod.includes(search)
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 3000, display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600' }}>База плитки</h2>
        <button onClick={onClose} style={{ background: '#f0f0f0', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer' }}><X size={20} /></button>
      </div>

      {role === 'admin' && (
        <div style={{ padding: '20px', background: '#f0f9ff', borderBottom: '1px solid #eee' }}>
          <p style={{ marginBottom: '12px', fontSize: '14px', color: '#0369a1' }}>
            Загрузите CSV-файл из программы для обновления остатков.
          </p>
          
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: 'white', padding: '12px 20px', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
              <Upload size={20} />
              {uploading ? 'Обработка...' : 'Загрузить CSV'}
            </button>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload} 
              disabled={uploading}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} 
            />
          </div>

          {logs.length > 0 && (
            <div style={{ marginTop: '12px', background: '#1e293b', color: '#10b981', padding: '12px', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace', maxHeight: '100px', overflowY: 'auto' }}>
              {logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          )}
        </div>
      )}

      <div style={{ padding: '12px 20px', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', borderRadius: '12px', padding: '10px 16px', gap: '8px' }}>
          <Search size={20} color="#888" />
          <input type="text" placeholder="Поиск по названию или штрих-коду..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '16px' }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#888' }}>Загрузка базы...</p>
        ) : filteredItems.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888' }}>База пуста или ничего не найдено</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredItems.map(item => (
              <div key={item.id} style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, paddingRight: '10px' }}>
                  <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '4px' }}>{item.nazvanie}</div>
                  <div style={{ color: '#666', fontSize: '13px' }}>Штрих-код: {item.shtrihkod}</div>
                </div>
                <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap' }}>
                  {item.ostatok} {item.ed_izm}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}