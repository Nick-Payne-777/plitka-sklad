import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { X, Trash2, Search, ScanLine } from 'lucide-react'
import { logHistory } from '../history'
import Skaner from './Skaner'

export default function FormaPoddona({ onClose, onSave, editPoddon }: { onClose: () => void, onSave: () => void, editPoddon?: any }) {
  const [nomer, setNomer] = useState(editPoddon ? editPoddon.nomer.toString() : '')
  const [zona, setZona] = useState<'zal' | 'sklad'>(editPoddon ? editPoddon.zona : 'sklad')
  
  const [pozicii, setPozicii] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Состояния для выбора из базы
  const [isBazaPickerOpen, setIsBazaPickerOpen] = useState(false)
  const [bazaItems, setBazaItems] = useState<any[]>([])
  const [bazaSearch, setBazaSearch] = useState('')
  const [activePozIndex, setActivePozIndex] = useState<number | null>(null)

  // Состояния для сканера
  const [isSkanerOpen, setIsSkanerOpen] = useState(false)
  const [scanTargetIndex, setScanTargetIndex] = useState<number | null>(null)

  useEffect(() => {
    if (editPoddon) {
      supabase.from('pozicii').select('*').eq('poddon_id', editPoddon.id).then(({ data }) => {
        if (data && data.length > 0) {
          setPozicii(data)
        } else {
          setPozicii([{ id: 'new_' + Date.now(), nazvanie: '', razmer: '', shtrihkod: '', primerno_m2: '' }])
        }
      })
    } else {
      setPozicii([{ id: 'new_' + Date.now(), nazvanie: '', razmer: '', shtrihkod: '', primerno_m2: '' }])
    }
  }, [editPoddon])

  useEffect(() => {
    if (isBazaPickerOpen) {
      supabase.from('spravochnik').select('*').order('nazvanie').then(({ data }) => {
        if (data) setBazaItems(data)
      })
    }
  }, [isBazaPickerOpen])

  const handleAddPozicia = () => {
    setPozicii([...pozicii, { id: 'new_' + Date.now(), nazvanie: '', razmer: '', shtrihkod: '', primerno_m2: '' }])
  }

  const handleRemovePozicia = (id: string) => {
    if (pozicii.length === 1) return alert('Должна остаться хотя бы одна плитка')
    setPozicii(pozicii.filter(p => p.id !== id))
  }

  const handleChangePozicia = (id: string, field: string, value: string) => {
    setPozicii(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const openBazaPicker = (index: number) => {
    setActivePozIndex(index)
    setIsBazaPickerOpen(true)
    setBazaSearch('')
  }

  const selectFromBaza = (item: any) => {
    if (activePozIndex === null) return
    const poz = pozicii[activePozIndex]
    
    const sizeMatch = item.nazvanie.match(/\d+[xх]\d+/i)
    const razmer = sizeMatch ? sizeMatch[0] : poz.razmer

    handleChangePozicia(poz.id, 'nazvanie', item.nazvanie)
    handleChangePozicia(poz.id, 'shtrihkod', item.shtrihkod)
    if (razmer) handleChangePozicia(poz.id, 'razmer', razmer)

    setIsBazaPickerOpen(false)
  }

  // Открытие сканера для конкретной позиции
  const openSkaner = (index: number) => {
    setScanTargetIndex(index)
    setIsSkanerOpen(true)
  }

  // Обработка отсканированного кода
  const handleScanResult = async (scannedText: string) => {
    setIsSkanerOpen(false)
    if (scanTargetIndex === null) return

    // Очищаем код от возможных пробелов и кавычек, которые могут быть в базе
    const cleanCode = scannedText.replace(/['"\s]/g, '')

    alert("Ищем в базе код: " + cleanCode)

    // Ищем плитку в базе по штрих-коду
    const { data: item, error } = await supabase.from('spravochnik').select('*').eq('shtrihkod', cleanCode).single()

    if (item) {
      alert("Нашли в базе: " + item.nazvanie)
      selectFromBaza(item) // Если нашли, подставляем
    } else {
      alert("Не нашли в базе. Ошибка: " + (error?.message || "неизвестно"))
      // Если не нашли, просто вставляем штрих-код и просим ввести название
      const poz = pozicii[scanTargetIndex]
      handleChangePozicia(poz.id, 'shtrihkod', cleanCode)
    }
    setScanTargetIndex(null)
  }
  async function handleSave() {
    if (!nomer) return alert('Введите номер поддона')
    
    const hasValidPozicia = pozicii.some(p => p.nazvanie && p.nazvanie.trim() !== '')
    if (!hasValidPozicia) return alert('Введите название хотя бы для одной плитки')

    setLoading(true)

    try {
      let currentPoddonId = editPoddon?.id

      if (editPoddon) {
        const { error } = await supabase.from('poddony').update({ nomer: parseInt(nomer), zona }).eq('id', editPoddon.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('poddony').insert([{ nomer: parseInt(nomer), zona, x: 100, y: 100, w: 100, h: 100 }]).select()
        if (error) throw error
        if (!data || data.length === 0) throw new Error('Не удалось создать поддон')
        currentPoddonId = data[0].id
      }

      let existingIds: string[] = []
      if (editPoddon) {
        const { data: currentDbPoz } = await supabase.from('pozicii').select('id').eq('poddon_id', currentPoddonId)
        if (currentDbPoz) existingIds = currentDbPoz.map(p => p.id)
      }

      const savedIds: string[] = []

      for (const poz of pozicii) {
        if (!poz.nazvanie || !poz.nazvanie.trim()) continue

        const pozData = {
          poddon_id: currentPoddonId,
          nazvanie: poz.nazvanie,
          razmer: poz.razmer || null,
          shtrihkod: poz.shtrihkod || null,
          primerno_m2: poz.primerno_m2 ? parseFloat(poz.primerno_m2) : 0
        }

        if (poz.id.startsWith('new_')) {
          const { data } = await supabase.from('pozicii').insert([pozData]).select()
          if (data && data.length > 0) savedIds.push(data[0].id)
        } else {
          await supabase.from('pozicii').update(pozData).eq('id', poz.id)
          savedIds.push(poz.id)
        }
      }

      const idsToDelete = existingIds.filter(id => !savedIds.includes(id))
      if (idsToDelete.length > 0) {
        await supabase.from('pozicii').delete().in('id', idsToDelete)
      }

      await logHistory(
        editPoddon ? 'izmenil' : 'sozdal', 
        'poddon', 
        parseInt(nomer), 
        `${editPoddon ? 'Изменен' : 'Создан'} поддон №${nomer} (позиций: ${savedIds.length})`
      )

      onSave()
    } catch (err: any) {
      alert('Ошибка: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredBaza = bazaItems.filter(i => 
    i.nazvanie.toLowerCase().includes(bazaSearch.toLowerCase()) || 
    i.shtrihkod.includes(bazaSearch)
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      
      <div style={{ background: 'white', width: '100%', height: '95vh', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', flexShrink: 0 }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600' }}>{editPoddon ? `Редактировать поддон №${editPoddon.nomer}` : 'Новый поддон'}</h2>
          <button onClick={onClose} style={{ background: '#f0f0f0', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div>
              <label style={{ fontSize: '14px', color: '#666', marginBottom: '4px', display: 'block' }}>Номер поддона *</label>
              <input type="number" value={nomer} onChange={e => setNomer(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }} placeholder="Например: 2" />
            </div>

            <div>
              <label style={{ fontSize: '14px', color: '#666', marginBottom: '4px', display: 'block' }}>Зона</label>
              <select value={zona} onChange={e => setZona(e.target.value as 'zal'|'sklad')} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}>
                <option value="sklad">Склад</option>
                <option value="zal">Отдел (Плитка)</option>
              </select>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #eee' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontWeight: '600', fontSize: '16px' }}>Плитка на поддоне:</p>
              <button onClick={handleAddPozicia} style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                + Добавить плитку
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pozicii.map((poz, index) => (
                <div key={poz.id} style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb', position: 'relative' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#888' }}>Плитка #{index + 1}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      
                      {/* НОВАЯ КНОПКА СКАНЕРА */}
                      <button onClick={() => openSkaner(index)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ScanLine size={14} /> Скан
                      </button>

                      <button onClick={() => openBazaPicker(index)} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Search size={14} /> База
                      </button>
                      {pozicii.length > 1 && (
                        <button onClick={() => handleRemovePozicia(poz.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: '#ef4444' }}>
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '13px', color: '#666', marginBottom: '4px', display: 'block' }}>Название плитки *</label>
                      <input type="text" value={poz.nazvanie || ''} onChange={e => handleChangePozicia(poz.id, 'nazvanie', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px' }} placeholder="Керамогранит серый" />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '13px', color: '#666', marginBottom: '4px', display: 'block' }}>Размер</label>
                        <input type="text" value={poz.razmer || ''} onChange={e => handleChangePozicia(poz.id, 'razmer', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px' }} placeholder="60x60" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '13px', color: '#666', marginBottom: '4px', display: 'block' }}>Штрих-код</label>
                        <input type="text" value={poz.shtrihkod || ''} onChange={e => handleChangePozicia(poz.id, 'shtrihkod', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px' }} placeholder="123456789" />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '13px', color: '#666', marginBottom: '4px', display: 'block' }}>Примерно м²</label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {[10, 20, 40, 50].map(val => (
                          <button key={val} onClick={() => handleChangePozicia(poz.id, 'primerno_m2', val.toString())} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #ccc', background: poz.primerno_m2?.toString() === val.toString() ? '#3b82f6' : 'white', color: poz.primerno_m2?.toString() === val.toString() ? 'white' : '#333', cursor: 'pointer', fontSize: '14px' }}>
                            ~{val}
                          </button>
                        ))}
                      </div>
                      <input type="number" value={poz.primerno_m2 || ''} onChange={e => handleChangePozicia(poz.id, 'primerno_m2', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px' }} placeholder="Или введите точное число" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 20px', paddingBottom: '30px', borderTop: '1px solid #eee', background: 'white', flexShrink: 0 }}>
          <button onClick={handleSave} disabled={loading} style={{ width: '100%', background: '#3b82f6', color: 'white', padding: '16px', borderRadius: '12px', border: 'none', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
            {loading ? 'Сохранение...' : (editPoddon ? 'Сохранить изменения' : 'Сохранить поддон')}
          </button>
        </div>
      </div>

      {/* МОДАЛКА ВЫБОРА ИЗ БАЗЫ */}
      {isBazaPickerOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 4000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Выбор из базы</h2>
            <button onClick={() => setIsBazaPickerOpen(false)} style={{ background: '#f0f0f0', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer' }}><X size={20} /></button>
          </div>

          <div style={{ padding: '12px 20px', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', borderRadius: '12px', padding: '10px 16px', gap: '8px' }}>
              <Search size={20} color="#888" />
              <input type="text" placeholder="Поиск по названию или штрих-коду..." value={bazaSearch} onChange={(e) => setBazaSearch(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '16px' }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', WebkitOverflowScrolling: 'touch' }}>
            {filteredBaza.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#888' }}>Ничего не найдено</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredBaza.map(item => (
                  <div key={item.id} onClick={() => selectFromBaza(item)} style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <div style={{ flex: 1, paddingRight: '10px' }}>
                      <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '4px' }}>{item.nazvanie}</div>
                      <div style={{ color: '#666', fontSize: '13px' }}>Штрих-код: {item.shtrihkod}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* СКАНЕР */}
      {isSkanerOpen && (
        <Skaner 
          onClose={() => { setIsSkanerOpen(false); setScanTargetIndex(null); }} 
          onScan={handleScanResult} 
        />
      )}

    </div>
  )
}