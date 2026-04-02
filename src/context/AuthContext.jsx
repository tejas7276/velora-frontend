import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(function() {
    var token  = localStorage.getItem('token')
    var userId = localStorage.getItem('userId')
    var name   = localStorage.getItem('name')
    var email  = localStorage.getItem('email')
    var avatar = localStorage.getItem('avatar')
    if (token) {
      setUser({ token: token, userId: userId, name: name, email: email, avatar: avatar })
    }
    setLoading(false)
  }, [])

  function saveAuth(data) {
    if (data.token)  localStorage.setItem('token',  data.token)
    if (data.userId) localStorage.setItem('userId', String(data.userId))
    if (data.name)   localStorage.setItem('name',   data.name)
    if (data.email)  localStorage.setItem('email',  data.email)
    if (data.avatar) localStorage.setItem('avatar', data.avatar)
    setUser(data)
  }

  function logout() {
    localStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user: user, loading: loading, saveAuth: saveAuth, logout: logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}