import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setError('Неверный email или пароль')
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '24px', background: '#f0f2f5' }}>
      <div style={{ background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px', textAlign: 'center' }}>Плитка</h1>
        <p style={{ color: '#888', textAlign: 'center', marginBottom: '24px' }}>Вход в систему</p>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            style={{ padding: '14px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
          />
          <input 
            type="password" 
            placeholder="Пароль" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            style={{ padding: '14px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
          />
          {error && <p style={{ color: 'red', fontSize: '14px', margin: 0 }}>{error}</p>}
          <button disabled={loading} type="submit" style={{ background: '#3b82f6', color: 'white', padding: '16px', borderRadius: '12px', border: 'none', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}