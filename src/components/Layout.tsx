import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'

interface LayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Главная', path: '/', icon: '🏠' },
  { name: 'Студенты', path: '/students', icon: '👥' },
  { name: 'Преподаватели', path: '/teachers', icon: '👨‍🏫' },
  { name: 'Расписание', path: '/schedule', icon: '📅' },
  { name: 'Посещаемость', path: '/attendance', icon: '✅' },
  { name: 'Отчёты', path: '/reports', icon: '📊' },
  { name: 'Недельный отчёт', path: '/weekly-report', icon: '🗓️' },
  { name: 'Приглашения', path: '/invitations', icon: '✉️' },
  { name: 'Графики', path: '/charts', icon: '📈' },
  { name: 'Заметки', path: '/notes', icon: '📝' },
  { name: 'Логи', path: '/logs', icon: '📋' },
  { name: 'Настройки', path: '/settings', icon: '⚙️' },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { signOut, user } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Определяем, мобильное ли устройство
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Закрывать при клике на ссылку на мобильных
  const handleLinkClick = () => {
    if (isMobile) {
      setIsSidebarOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex overflow-hidden">
        {/* Mobile menu button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-white shadow-md hover:bg-gray-100 transition-colors"
          aria-label="Открыть меню"
        >
          <motion.svg
            className="w-6 h-6 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{ rotate: isSidebarOpen ? 90 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {isSidebarOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </motion.svg>
        </button>

        {/* Overlay для мобильных */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              />
            </>
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{
            x: isMobile ? (isSidebarOpen ? 0 : -256) : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
          className="w-64 bg-white shadow-sm min-h-screen fixed left-0 top-0 z-40 lg:relative lg:z-auto lg:translate-x-0 flex-shrink-0"
        >
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Панель учёта</h1>
                  <p className="text-sm text-gray-500 mt-1">Посещаемость</p>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden p-1 rounded hover:bg-gray-100 transition-colors"
                  aria-label="Закрыть меню"
                >
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <nav className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {navigation.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
              <div className="mb-2 px-4 py-2 text-sm text-gray-600">
                {user?.email}
              </div>
              <button
                onClick={() => signOut()}
                className="w-full btn-secondary text-sm"
              >
                Выйти
              </button>
            </div>
          </motion.aside>

        {/* Main content */}
        <main className="flex-1 w-full min-w-0 lg:ml-0">
          <div className="p-4 lg:p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}

