import { useState } from 'react'
import { supabase } from '../supabase'
import { X } from 'lucide-react'
import { logHistory } from '../history'

export default function FormaStola({ onClose, onSave, editStol }: { onClose: () => void, onSave: () => void, editStol?: any }) {
  const [nazvanie, setNazvanie] = useState(editStol ? editStol.nazvanie : '')
  const [zona, setZona] = useState<'zal' | 'sklad'>(editStol ? editStol.zona : 'sklad')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!nazvanie) return alert('Введите название стола')
    setLoading(true)

    if (editStol) {
      await supabase.from('stoly').update({ nazvanie, zona }).eq('id', editStol.id)
      await logHistory('izmenil', 'stol', 0, `Изменен стол "${nazvanie}"`)
    } else {
      // Столы делаем размером 150х80 (прямоугольник)
      await supabase.from('stoly').insert([{ nazvanie, zona, x: 150, y: 150, w: 150, h: 80 }])
      await logHistory('sozdal', 'stol', 0, `Создан стол "${nazvanie}"`)
    }

    setLoading(false)
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'white', width: '100%', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600' }}>{editStol ? 'Редактировать стол' : 'Новый стол'}</h2>
          <button onClick={onClose} style={{ background: '#f0f0f0', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '14px', color: '#666', marginBottom: '4px', display: 'block' }}>Название стола (или номер) *</label>
            <input type="text" value={nazvanie} onChange={e => setNazvanie(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }} placeholder="Например: Мой стол" />
          </div>

          <div>
            <label style={{ fontSize: '14px', color: '#666', marginBottom: '4px', display: 'block' }}>Зона</label>
            <select value={zona} onChange={e => setZona(e.target.value as 'zal'|'sklad')} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}>
              <option value="sklad">Склад</option>
              <option value="zal">Отдел (Плитка)</option>
            </select>
          </div>

          <button onClick={handleSave} disabled={loading} style={{ background: '#3b82f6', color: 'white', padding: '16px', borderRadius: '12px', border: 'none', fontSize: '16px', fontWeight: '600', marginTop: '10px', cursor: 'pointer' }}>
            {loading ? 'Сохранение...' : 'Сохранить стол'}
          </button>
        </div>
      </div>
    </div>
  )
}