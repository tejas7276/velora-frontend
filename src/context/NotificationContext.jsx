import { createContext, useContext, useState, useCallback } from 'react'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [toasts,        setToasts]        = useState([])

  const addNotification = useCallback(function(msg, type) {
    var id = Date.now()
    setNotifications(function(prev) {
      return [{ id: id, msg: msg, type: type || 'info', time: new Date() }]
        .concat(prev.slice(0, 19))
    })
  }, [])

  const clearAll = useCallback(function() { setNotifications([]) }, [])

  const dismiss = useCallback(function(id) {
    setNotifications(function(prev) {
      return prev.filter(function(n) { return n.id !== id })
    })
  }, [])

  const addToast = useCallback(function(msg, type) {
    var id = Date.now() + Math.random()
    setToasts(function(prev) {
      return prev.concat([{ id: id, msg: msg, type: type || 'info' }])
    })
    setNotifications(function(prev) {
      return [{ id: id, msg: msg, type: type || 'info', time: new Date() }]
        .concat(prev.slice(0, 19))
    })
  }, [])

  const removeToast = useCallback(function(id) {
    setToasts(function(prev) {
      return prev.filter(function(t) { return t.id !== id })
    })
  }, [])

  return (
    <NotificationContext.Provider value={{
      notifications:   notifications,
      addNotification: addNotification,
      clearAll:        clearAll,
      dismiss:         dismiss,
      toasts:          toasts,
      addToast:        addToast,
      removeToast:     removeToast,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}