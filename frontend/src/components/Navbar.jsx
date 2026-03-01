import React, { useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, LayoutDashboard, MapPin, TrendingUp, GitCompare, Map, Info, ChevronLeft } from 'lucide-react'

const Navbar = React.memo(() => {
  const navigate = useNavigate()
  const location = useLocation()

  // Memoize menu items to prevent re-creation on every render
  const menuItems = useMemo(() => [
    { path: '/home', label: 'Home', icon: Home },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/city-analysis', label: 'City Analysis', icon: MapPin },
    { path: '/prediction', label: 'Prediction', icon: TrendingUp },
    { path: '/comparison', label: 'Comparison', icon: GitCompare },
    { path: '/heatmap', label: 'Heatmap', icon: Map },
    { path: '/about', label: 'About', icon: Info },
  ], [])

  // Memoize navigation handler
  const handleNavigate = useCallback((path) => {
    navigate(path)
  }, [navigate])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 h-16 flex items-center transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full flex items-center justify-between">

        {/* Logo (Left side) */}
        <div
          onClick={() => handleNavigate('/home')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors duration-300">
            CivicSentinel
          </span>
        </div>

        {/* Navigation Items (Right side) */}
        <div className="flex items-center gap-8">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`
                  flex items-center space-x-2 py-2 text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'text-indigo-400'
                    : 'text-slate-400 hover:text-white'
                  }
                `}
              >
                <Icon size={16} />
                <span className="hidden md:inline-block">{item.label}</span>
              </button>
            )
          })}

          {/* Back to Landing */}
          <button
            onClick={() => handleNavigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400 text-xs font-semibold transition-all duration-200 ml-2"
          >
            <ChevronLeft size={13} />
            <span className="hidden md:inline-block">Back</span>
          </button>
        </div>

      </div>
    </nav>
  )
})

Navbar.displayName = 'Navbar'

export default Navbar
