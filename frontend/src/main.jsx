import React from 'react'
import ReactDOM from 'react-dom/client'

const API_BASE = 'http://localhost:3000/api'

function App() {
  const [user, setUser] = React.useState(null)
  const [view, setView] = React.useState('login')
  const [requests, setRequests] = React.useState([])

  React.useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) { setUser(JSON.parse(userData)); setView('dashboard'); loadRequests() }
  }, [])

  const api = async (method, url, data) => {
    const token = localStorage.getItem('token')
    const res = await fetch(API_BASE + url, {
      method, headers: { 'Content-Type': 'application/json', 
      ...(token && {Authorization: `Bearer ${token}`}) },
      body: data ? JSON.stringify(data) : undefined
    })
    return res.json()
  }

  const login = async (email, password) => {
    const res = await api('POST', '/auth/login', {email, password})
    if (res.user) {
      setUser(res.user)
      localStorage.setItem('user', JSON.stringify(res.user))
      localStorage.setItem('token', res.tokens.accessToken)
      setView('dashboard')
      loadRequests()
    }
  }

  const loadRequests = async () => {
    const res = await api('GET', '/requests')
    setRequests(res.data || [])
  }

  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow max-w-sm w-full">
        <h1 className="text-xl font-bold mb-4">Scrap Pickup</h1>
        <LoginForm onLogin={login} />
        <p className="text-xs mt-2">Demo: customer@demo.com / demo123</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-600 text-white p-4 flex justify-between">
        <h1 className="font-bold">Scrap Pickup - {user.role}</h1>
        <button onClick={() => {setUser(null); localStorage.clear()}} className="bg-red-500 px-3 py-1">Logout</button>
      </nav>
      <div className="p-4">
        <Dashboard requests={requests} user={user} onUpdate={loadRequests} />
      </div>
    </div>
  )
}

function LoginForm({onLogin}) {
  const [email, setEmail] = React.useState('customer@demo.com')
  const [password, setPassword] = React.useState('demo123')
  return (
    <form onSubmit={e => {e.preventDefault(); onLogin(email, password)}}>
      <input className="w-full border p-2 mb-2" placeholder="Email" 
             value={email} onChange={e => setEmail(e.target.value)} />
      <input className="w-full border p-2 mb-2" type="password" placeholder="Password"
             value={password} onChange={e => setPassword(e.target.value)} />
      <button className="w-full bg-blue-500 text-white p-2">Login</button>
    </form>
  )
}

function Dashboard({requests, user}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Dashboard</h2>
      {requests.map(r => (
        <div key={r.id} className="bg-white p-4 mb-2 rounded shadow">
          <h3 className="font-bold">{r.description}</h3>
          <p>{r.address}</p>
          <span className="text-sm bg-gray-200 px-2 py-1 rounded">{r.status}</span>
        </div>
      ))}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
