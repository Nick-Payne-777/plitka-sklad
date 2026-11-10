import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function Skaner({ onClose, onScan }: { onClose: () => void, onScan: (text: string) => void }) {
  const [error, setError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        // Вот эта строчка заставляет использовать заднюю камеру
        videoConstraints: {
          facingMode: "environment"
        }
      },
      /* verbose= */ false
    )

    scanner.render(
      (text) => {
        scanner.clear()
        onScan(text)
      },
      (err) => {
        if (err?.includes('NotReadableError') || err?.includes('Permission')) {
          setError('Камера недоступна в этом приложении. Введите код вручную.')
          scanner.clear()
        }
      }
    )

    return () => {
      scanner.clear().catch(e => console.error("Failed to clear scanner", e))
    }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#111', zIndex: 4000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Сканер</h2>
        <button onClick={onClose} style={{ background: '#333', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', color: 'white' }}><X size={20} /></button>
      </div>

      {!error ? (
        <div id="reader" style={{ width: '100%', flex: 1 }}></div>
      ) : (
        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ color: '#ef4444', textAlign: 'center', marginBottom: '20px' }}>{error}</p>
          <input 
            type="text" 
            placeholder="Введите штрих-код" 
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            style={{ padding: '16px', borderRadius: '12px', border: 'none', fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}
          />
          <button 
            onClick={() => { if(manualCode) onScan(manualCode) }}
            style={{ padding: '16px', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontSize: '18px', fontWeight: '600' }}
          >
            Найти
          </button>
        </div>
      )}
    </div>
  )
}