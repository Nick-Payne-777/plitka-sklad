import { useState, useEffect, useRef } from 'react'
import { Search, ScanLine, Edit2, X, History, Trash2, Database, Monitor } from 'lucide-react'
import { supabase } from './supabase'
import FormaPoddona from './components/FormaPoddona'
import FormaStola from './components/FormaStola'
import Skaner from './components/Skaner'
import Login from './components/Login'
import Baza from './components/Baza'
import { logHistory } from './history'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

function App() {
  const [session, setSession] = useState<any>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [role, setRole] = useState<'admin' | 'smena' | 'viewer' | null>(null)

  const [search, setSearch] = useState('')
  const [poddony, setPoddony] = useState<any[]>([])
  const [stoly, setStoly] = useState<any[]>([])
  const [pozicii, setPozicii] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [zona, setZona] = useState<'zal' | 'sklad'>('sklad')
  const [selectedPoddon, setSelectedPoddon] = useState<any | null>(null)
  const [contextMenuPoddon, setContextMenuPoddon] = useState<any | null>(null) 
  const [contextMenuStol, setContextMenuStol] = useState<any | null>(null) 
  
  const [isRedactorOpen, setIsRedactorOpen] = useState(false)
  const [isFormaOpen, setIsFormaOpen] = useState(false)
  const [isStolFormaOpen, setIsStolFormaOpen] = useState(false)
  const [editPoddonData, setEditPoddonData] = useState<any | null>(null)
  const [editStolData, setEditStolData] = useState<any | null>(null)
  const [isSkanerOpen, setIsSkanerOpen] = useState(false)
  const [isBazaOpen, setIsBazaOpen] = useState(false)

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [draggingType, setDraggingType] = useState<'poddon' | 'stol' | null>(null)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const itemStartPos = useRef({ x: 0, y: 0 })
  const longPressTimer = useRef<any>(null)
  const isLongPress = useRef(false)

  const [highlightedPoddonId, setHighlightedPoddonId] = useState<string | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyList, setHistoryList] = useState<any[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user?.email) {
        if (session.user.email === 'nick.payne@vk.ru') setRole('admin')
        else if (session.user.email === 'smena@plitka.local') setRole('smena')
        else setRole('viewer')
      }
      setLoadingAuth(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user?.email) {
        if (session.user.email === 'nick.payne@vk.ru') setRole('admin')
        else if (session.user.email === 'smena@plitka.local') setRole('smena')
        else setRole('viewer')
      } else {
        setRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadData() {
    const { data: pData } = await supabase.from('poddony').select('*')
    const { data: sData } = await supabase.from('stoly').select('*')
    const { data: pozData } = await supabase.from('pozicii').select('*')
    if (pData) setPoddony(pData)
    if (sData) setStoly(sData)
    if (pozData) setPozicii(pozData)
    setLoading(false)
  }

  useEffect(() => {
    if (session) loadData()
  }, [session])

  // === ЛОГИКА ДОЛГОГО НАЖАТИЯ И ПЕРЕТАСКИВАНИЯ ===
  const handlePointerDown = (e: React.PointerEvent, item: any, type: 'poddon' | 'stol') => {
    // Теперь разрешено ВСЕГДА (даже не в редакторе)
    e.stopPropagation(); 
    e.preventDefault(); 
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isLongPress.current = false;
    
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (type === 'poddon') setContextMenuPoddon(item);
      else setContextMenuStol(item);
      if (navigator.vibrate) navigator.vibrate(50); 
    }, 600); 

    setDraggingId(item.id);
    setDraggingType(type);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    itemStartPos.current = { x: item.x, y: item.y };
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !draggingType) return;
    if (isLongPress.current) return; 
    
    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;
    
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }

    const GRID_SIZE = 50;
    const MAP_SIZE = 3500;
    const ITEM_SIZE = draggingType === 'poddon' ? 100 : 150;

    if (draggingType === 'poddon') {
      setPoddony(prev => prev.map(p => {
        if (p.id === draggingId) {
          let newX = itemStartPos.current.x + deltaX;
          let newY = itemStartPos.current.y + deltaY;
          newX = Math.max(0, Math.min(newX, MAP_SIZE - ITEM_SIZE));
          newY = Math.max(0, Math.min(newY, MAP_SIZE - ITEM_SIZE));
          return { ...p, x: Math.round(newX / GRID_SIZE) * GRID_SIZE, y: Math.round(newY / GRID_SIZE) * GRID_SIZE }
        }
        return p;
      }));
    } else {
      setStoly(prev => prev.map(s => {
        if (s.id === draggingId) {
          let newX = itemStartPos.current.x + deltaX;
          let newY = itemStartPos.current.y + deltaY;
          newX = Math.max(0, Math.min(newX, MAP_SIZE - ITEM_SIZE));
          newY = Math.max(0, Math.min(newY, MAP_SIZE - ITEM_SIZE));
          return { ...s, x: Math.round(newX / GRID_SIZE) * GRID_SIZE, y: Math.round(newY / GRID_SIZE) * GRID_SIZE }
        }
        return s;
      }));
    }
  }

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    
    if (!draggingId || !draggingType) return;
    if (e.target) { try { (e.target as HTMLElement).releasePointerCapture(e.pointerId) } catch(err) {} }
    
    if (!isLongPress.current) {
      if (draggingType === 'poddon') {
        const dragged = poddony.find(p => p.id === draggingId);
        if (dragged && (dragged.x !== itemStartPos.current.x || dragged.y !== itemStartPos.current.y)) {
          await supabase.from('poddony').update({ x: dragged.x, y: dragged.y }).eq('id', draggingId);
          await logHistory('peremestil', 'poddon', dragged.nomer, `Перемещен поддон №${dragged.nomer}`);
        }
      } else {
        const dragged = stoly.find(s => s.id === draggingId);
        if (dragged && (dragged.x !== itemStartPos.current.x || dragged.y !== itemStartPos.current.y)) {
          await supabase.from('stoly').update({ x: dragged.x, y: dragged.y }).eq('id', draggingId);
          await logHistory('peremestil', 'stol', 0, `Перемещен стол "${dragged.nazvanie}"`);
        }
      }
    }
    setDraggingId(null);
    setDraggingType(null);
  }

  const handleDeletePoddon = async (poddonToDelete: any) => {
    if (!poddonToDelete) return;
    if (window.confirm(`Вы уверены, что хотите удалить поддон №${poddonToDelete.nomer}?`)) {
      await supabase.from('poddony').delete().eq('id', poddonToDelete.id);
      await logHistory('udalil', 'poddon', poddonToDelete.nomer, `Удален поддон №${poddonToDelete.nomer}`);
      setContextMenuPoddon(null);
      setSelectedPoddon(null);
      loadData();
    }
  }

  const handleDeleteStol = async (stolToDelete: any) => {
    if (!stolToDelete) return;
    if (window.confirm(`Вы уверены, что хотите удалить стол "${stolToDelete.nazvanie}"?`)) {
      await supabase.from('stoly').delete().eq('id', stolToDelete.id);
      await logHistory('udalil', 'stol', 0, `Удален стол "${stolToDelete.nazvanie}"`);
      setContextMenuStol(null);
      loadData();
    }
  }

  const openHistory = async () => {
    const { data } = await supabase.from('istoriya').select('*').order('created_at', { ascending: false }).limit(50)
    if (data) setHistoryList(data)
    setIsHistoryOpen(true)
  }

  const foundPozicii = search.trim() === '' ? [] : pozicii.filter(p => 
    (p.nazvanie && p.nazvanie.toLowerCase().includes(search.toLowerCase())) ||
    (p.shtrihkod && p.shtrihkod.includes(search)) ||
    (p.razmer && p.razmer.includes(search))
  )

  const foundPoddony = foundPozicii.map(poz => {
    const poddon = poddony.find(pd => pd.id === poz.poddon_id)
    return { poz, poddon }
  }).filter(item => item.poddon)

  const goToPoddon = (poddon: any) => {
    setZona(poddon.zona)
    setHighlightedPoddonId(poddon.id)
    setSearch('')
    setTimeout(() => setHighlightedPoddonId(null), 15000)
  }

  if (loadingAuth) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>Загрузка...</div>
  if (!session) return <Login />

  const filteredPoddony = poddony.filter(p => p.zona === zona)
  const filteredStoly = stoly.filter(s => s.zona === zona)
  const selectedPozicii = selectedPoddon ? pozicii.filter(p => p.poddon_id === selectedPoddon.id) : []
  const canEdit = role === 'admin' || role === 'smena'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', userSelect: 'none', overflow: 'hidden' }}>
      
      <div style={{ background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', zIndex: 10, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid #eee' }}>
          <span style={{ fontSize: '13px', color: '#666', fontWeight: '500' }}>
            {role === 'admin' ? '👑 Админ' : role === 'smena' ? '👷 Сменщик' : '👁 Просмотр'}
          </span>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            
            <button onClick={() => setIsBazaOpen(true)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#8b5cf6', cursor: 'pointer', fontWeight: '600' }}>
              <Database size={14} /> База
            </button>

            {role === 'admin' && (
              <button onClick={openHistory} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#3b82f6', cursor: 'pointer' }}>
                <History size={14} /> История
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
          <button onClick={() => setZona('zal')} style={{ flex: 1, padding: '14px', background: 'none', border: 'none', fontSize: '16px', fontWeight: zona === 'zal' ? '600' : '400', color: zona === 'zal' ? '#3b82f6' : '#888', borderBottom: zona === 'zal' ? '3px solid #3b82f6' : '3px solid transparent' }}>
            Плитка (Отдел)
          </button>
          <button onClick={() => setZona('sklad')} style={{ flex: 1, padding: '14px', background: 'none', border: 'none', fontSize: '16px', fontWeight: zona === 'sklad' ? '600' : '400', color: zona === 'sklad' ? '#3b82f6' : '#888', borderBottom: zona === 'sklad' ? '3px solid #3b82f6' : '3px solid transparent' }}>
            Склад
          </button>
        </div>

        <div style={{ padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', borderRadius: '12px', padding: '10px 16px', gap: '8px' }}>
            <Search size={20} color="#888" />
            <input type="text" placeholder="Поиск по названию, размеру или штрих-коду..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '16px' }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={18} color="#888" /></button>
            )}
          </div>
        </div>

        {search.trim() !== '' && (
          <div className="scrollable-content" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxHeight: '50vh', overflowY: 'auto', zIndex: 50, WebkitOverflowScrolling: 'touch' }}>
            {foundPoddony.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Ничего не найдено</div>
            ) : (
              foundPoddony.map(({ poz, poddon }) => (
                <div key={poz.id} onClick={() => goToPoddon(poddon)} style={{ padding: '16px', borderBottom: '1px solid #eee', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '15px' }}>{poz.nazvanie} {poz.razmer ? `(${poz.razmer})` : ''}</div>
                    <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{poddon.zona === 'zal' ? '🏪 Отдел' : '🏭 Склад'} • Поддон №{poddon.nomer} • Штрих-код: {poz.shtrihkod || '—'}</div>
                  </div>
                  <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap' }}>~{poz.primerno_m2 || 0} м²</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, position: 'relative', backgroundColor: '#f0f2f5', overflow: 'hidden' }}>
        <TransformWrapper initialScale={0.8} minScale={0.3} maxScale={2} doubleClick={{ disabled: true }} panning={{ velocityDisabled: true, disabled: draggingId !== null }}>
          <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
            <div 
              style={{ position: 'relative', width: '3500px', height: '3500px', backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)', backgroundSize: '100px 100px', border: '2px dashed #ccc', touchAction: 'none' }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {/* СТОЛЫ */}
              {filteredStoly.map(s => (
                <div
                  key={s.id}
                  onPointerDown={(e) => handlePointerDown(e, s, 'stol')}
                  onContextMenu={(e) => e.preventDefault()} 
                  style={{
                    position: 'absolute', left: s.x, top: s.y, width: 150, height: 80, 
                    backgroundColor: '#e2e8f0', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: '600', color: '#475569', 
                    border: draggingId === s.id ? '2px solid #3b82f6' : '1px dashed #94a3b8', 
                    cursor: 'grab',
                    zIndex: draggingId === s.id ? 50 : 1,
                    touchAction: 'none'
                  }}
                >
                  <Monitor size={20} style={{ marginBottom: '4px' }} />
                  {s.nazvanie}
                </div>
              ))}

              {/* ПОДДОНЫ */}
              {loading ? (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#888' }}>Загрузка карты...</div>
              ) : filteredPoddony.length === 0 && filteredStoly.length === 0 ? (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#888' }}>В этой зоне пока ничего нет</div>
              ) : (
                filteredPoddony.map(p => (
                  <div
                    key={p.id}
                    onPointerDown={(e) => handlePointerDown(e, p, 'poddon')}
                    onContextMenu={(e) => e.preventDefault()} 
                    onClick={() => { if(!draggingId) setSelectedPoddon(p) }}
                    style={{
                      position: 'absolute', left: p.x, top: p.y, width: 100, height: 100, 
                      backgroundColor: highlightedPoddonId === p.id ? '#fef08a' : (draggingId === p.id ? '#eff6ff' : '#eaddd3'), 
                      borderRadius: '8px', 
                      boxShadow: highlightedPoddonId === p.id ? '0 0 0 4px #eab308, 0 10px 25px rgba(0,0,0,0.2)' : (draggingId === p.id ? '0 10px 25px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.08)'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '24px', fontWeight: '600', color: '#5c4033', 
                      border: draggingId === p.id ? '2px solid #3b82f6' : '1px solid #c4b5a6', 
                      cursor: 'grab',
                      zIndex: highlightedPoddonId === p.id ? 100 : (draggingId === p.id ? 50 : 1),
                      transition: highlightedPoddonId === p.id ? 'all 0.3s ease' : 'none',
                      touchAction: 'none'
                    }}
                  >
                    {p.nomer}
                  </div>
                ))
              )}
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>

      {!selectedPoddon && !isRedactorOpen && (
        <div style={{ padding: '16px', background: 'white', display: 'flex', gap: '12px', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)', zIndex: 10 }}>
          <button onClick={() => setIsSkanerOpen(true)} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '14px', borderRadius: '12px', border: 'none', background: '#e2e8f0', color: '#333', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
            <ScanLine size={20} /> Сканировать
          </button>
          {canEdit && (
            <button onClick={() => setIsRedactorOpen(true)} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '14px', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
              <Edit2 size={20} /> Редактор
            </button>
          )}
        </div>
      )}

      {isRedactorOpen && !selectedPoddon && canEdit && (
        <div style={{ padding: '16px', background: '#1e293b', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
          <span style={{ fontWeight: '500' }}>Режим редактора</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setEditPoddonData(null); setIsFormaOpen(true); }} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
              + Поддон
            </button>
            <button onClick={() => { setEditStolData(null); setIsStolFormaOpen(true); }} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
              + Стол
            </button>
            <button onClick={() => setIsRedactorOpen(false)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
              Выйти
            </button>
          </div>
        </div>
      )}

      {/* МЕНЮ ПОДДОНА */}
      {contextMenuPoddon && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }} onClick={() => setContextMenuPoddon(null)}>
          <div style={{ background: 'white', width: '100%', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '40px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', textAlign: 'center', marginBottom: '8px' }}>Поддон №{contextMenuPoddon.nomer}</h3>
            <button onClick={() => { setEditPoddonData(contextMenuPoddon); setIsFormaOpen(true); setContextMenuPoddon(null); }} style={{ padding: '16px', borderRadius: '12px', border: 'none', background: '#f0f9ff', color: '#0369a1', fontSize: '16px', fontWeight: '500' }}>
              Редактировать поддон
            </button>
            <button onClick={() => { const newZona = contextMenuPoddon.zona === 'zal' ? 'sklad' : 'zal'; supabase.from('poddony').update({ zona: newZona }).eq('id', contextMenuPoddon.id).then(() => { setContextMenuPoddon(null); loadData(); }); }} style={{ padding: '16px', borderRadius: '12px', border: 'none', background: '#fef3c7', color: '#b45309', fontSize: '16px', fontWeight: '500' }}>
              Переместить на {contextMenuPoddon.zona === 'zal' ? 'Склад' : 'Отдел'}
            </button>
            <button onClick={() => handleDeletePoddon(contextMenuPoddon)} style={{ padding: '16px', borderRadius: '12px', border: 'none', background: '#fee2e2', color: '#b91c1c', fontSize: '16px', fontWeight: '500' }}>
              Удалить
            </button>
            <button onClick={() => setContextMenuPoddon(null)} style={{ padding: '16px', borderRadius: '12px', border: 'none', background: '#f3f4f6', color: '#374151', fontSize: '16px', fontWeight: '500', marginTop: '8px' }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* МЕНЮ СТОЛА */}
      {contextMenuStol && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }} onClick={() => setContextMenuStol(null)}>
          <div style={{ background: 'white', width: '100%', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '40px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', textAlign: 'center', marginBottom: '8px' }}>Стол "{contextMenuStol.nazvanie}"</h3>
            <button onClick={() => { setEditStolData(contextMenuStol); setIsStolFormaOpen(true); setContextMenuStol(null); }} style={{ padding: '16px', borderRadius: '12px', border: 'none', background: '#f0f9ff', color: '#0369a1', fontSize: '16px', fontWeight: '500' }}>
              Редактировать стол
            </button>
            <button onClick={() => { const newZona = contextMenuStol.zona === 'zal' ? 'sklad' : 'zal'; supabase.from('stoly').update({ zona: newZona }).eq('id', contextMenuStol.id).then(() => { setContextMenuStol(null); loadData(); }); }} style={{ padding: '16px', borderRadius: '12px', border: 'none', background: '#fef3c7', color: '#b45309', fontSize: '16px', fontWeight: '500' }}>
              Переместить на {contextMenuStol.zona === 'zal' ? 'Склад' : 'Отдел'}
            </button>
            <button onClick={() => handleDeleteStol(contextMenuStol)} style={{ padding: '16px', borderRadius: '12px', border: 'none', background: '#fee2e2', color: '#b91c1c', fontSize: '16px', fontWeight: '500' }}>
              Удалить
            </button>
            <button onClick={() => setContextMenuStol(null)} style={{ padding: '16px', borderRadius: '12px', border: 'none', background: '#f3f4f6', color: '#374151', fontSize: '16px', fontWeight: '500', marginTop: '8px' }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {selectedPoddon && !contextMenuPoddon && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'white', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.15)', padding: '20px', zIndex: 200, maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Поддон №{selectedPoddon.nomer}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {canEdit && (
                <button onClick={() => handleDeletePoddon(selectedPoddon)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Удалить поддон">
                  <Trash2 size={20} />
                </button>
              )}
              <button onClick={() => setSelectedPoddon(null)} style={{ background: '#f0f0f0', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={20} color="#555" />
              </button>
            </div>
          </div>
          
          <div className="scrollable-content" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', WebkitOverflowScrolling: 'touch' }}>
            {selectedPozicii.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center', marginTop: '20px' }}>На этом поддоне пока нет плитки</p>
            ) : (
              selectedPozicii.map((poz) => (
                <div key={poz.id} style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>{poz.nazvanie}</div>
                    <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap' }}>~{poz.primerno_m2 || 0} м²</div>
                  </div>
                  <div style={{ color: '#666', fontSize: '14px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {poz.razmer && <span>📏 {poz.razmer}</span>}
                    {poz.shtrihkod && <span>🏷 {poz.shtrihkod}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isFormaOpen && (
        <FormaPoddona 
          editPoddon={editPoddonData}
          onClose={() => { setIsFormaOpen(false); setEditPoddonData(null); }} 
          onSave={() => { setIsFormaOpen(false); setEditPoddonData(null); loadData(); }} 
        />
      )}

      {isStolFormaOpen && (
        <FormaStola 
          editStol={editStolData}
          onClose={() => { setIsStolFormaOpen(false); setEditStolData(null); }} 
          onSave={() => { setIsStolFormaOpen(false); setEditStolData(null); loadData(); }} 
        />
      )}

      {isSkanerOpen && (
        <Skaner onClose={() => setIsSkanerOpen(false)} onScan={(text) => { setIsSkanerOpen(false); setSearch(text); }} />
      )}

      {isBazaOpen && (
        <Baza role={role} onClose={() => setIsBazaOpen(false)} />
      )}

      {isHistoryOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600' }}>История изменений</h2>
              <button onClick={() => setIsHistoryOpen(false)} style={{ background: '#f0f0f0', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div className="scrollable-content" style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', WebkitOverflowScrolling: 'touch' }}>
              {historyList.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888' }}>История пуста</p>
              ) : (
                historyList.map(h => (
                  <div key={h.id} style={{ background: '#f9f9f9', padding: '12px', borderRadius: '8px', border: '1px solid #eee' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>{h.opisanie}</div>
                    <div style={{ fontSize: '12px', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                      <span>👤 {h.user_email}</span>
                      <span>{new Date(h.created_at).toLocaleString('ru-RU')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App