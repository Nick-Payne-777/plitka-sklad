import { useEffect, useState } from 'react'
import { X, ScanLine } from 'lucide-react'
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning'

export default function Skaner({ onClose, onScan }: { onClose: () => void, onScan: (text: string) => void }) {
  const [status, setStatus] = useState<'loading' | 'installing' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let isMounted = true

    const initScanner = async () => {
      try {
        // 1. Проверяем разрешение на камеру
        const { camera } = await BarcodeScanner.requestPermissions()
        if (camera !== 'granted' && camera !== 'limited') {
          if (isMounted) {
            setErrorMsg('Нет доступа к камере. Разрешите в настройках телефона.')
            setStatus('error')
          }
          return
        }

        // 2. Проверяем наличие модуля Google
        const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
        if (!available) {
          if (isMounted) setStatus('installing')
          await BarcodeScanner.installGoogleBarcodeScannerModule()
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

        // 3. Запускаем камеру
        const result = await BarcodeScanner.scan()
        
        if (isMounted) {
          if (result.barcodes.length > 0) {
            // ВИБРАЦИЯ ПРИ УСПЕХЕ
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]) 
            onScan(result.barcodes[0].rawValue || '')
          } else {
            onClose()
          }
        }
      } catch (e: any) {
        if (isMounted) {
          setErrorMsg('Ошибка: ' + e.message)
          setStatus('error')
        }
      }
    }

    initScanner()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0f172a', zIndex: 4000, display: 'flex', flexDirection: 'column' }}>
      
      {/* Шапка */}
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ScanLine size={24} color="#3b82f6" /> Сканирование
        </h2>
        <button onClick={onClose} style={{ background: '#1e293b', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={20} />
        </button>
      </div>

      {/* Центральная часть с анимацией */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        
        {status === 'loading' && (
          <>
            {/* Красивая рамка (заглушка, пока открывается нативная камера) */}
            <div style={{ width: '250px', height: '250px', border: '2px solid #3b82f6', borderRadius: '20px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100%', height: '2px', background: '#3b82f6', position: 'absolute', top: '50%', boxShadow: '0 0 10px #3b82f6' }} />
              <p style={{ color: 'white', fontSize: '18px', marginTop: '280px' }}>Открываем камеру...</p>
            </div>
          </>
        )}
        
        {status === 'installing' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', border: '4px solid #1e293b', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
            <p style={{ color: '#3b82f6', fontSize: '18px', marginBottom: '10px' }}>Установка модуля Google...</p>
            <p style={{ color: '#888', fontSize: '14px' }}>Это займет несколько секунд при первом запуске.</p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: '#ef4444', fontSize: '16px', marginBottom: '20px' }}>{errorMsg}</p>
            <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontSize: '16px', fontWeight: '600' }}>
              Закрыть
            </button>
          </div>
        )}
      </div>

      {/* CSS для анимации */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}