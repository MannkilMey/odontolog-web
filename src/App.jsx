import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'

import { SuscripcionProvider } from './hooks/SuscripcionContext'

import LandingPage from './pages/LandingPage'
import LoginScreen from './pages/LoginScreen'
import RegistrationScreen from './pages/RegistrationScreen'
import DashboardScreen from './pages/DashboardScreen'
import AddPacienteScreen from './pages/AddPacienteScreen'
import ClientesScreen from './pages/ClientesScreen'
import EditPacienteScreen from './pages/EditPacienteScreen'
import PacienteDetailScreen from './pages/PacienteDetailScreen'
import OdontogramaScreen from './pages/OdontogramaScreen'
import MetricasScreen from './pages/MetricasScreen'
import ConfiguracionClinicaScreen from './pages/ConfiguracionClinicaScreen'
import ConfiguracionNotificacionesScreen from './pages/ConfiguracionNotificacionesScreen'
import PresupuestoScreen from './pages/PresupuestoScreen'
import RegistrarPagoScreen from './pages/RegistrarPagoScreen'
import CatalogoProcedimientosScreen from './pages/CatalogoProcedimientosScreen'
import CuentasPorCobrarScreen from './pages/CuentasPorCobrarScreen'
import CrearPlanPagoScreen from './pages/CrearPlanPagoScreen'
import PlanPagoDetailScreen from './pages/PlanPagoDetailScreen'
import CalendarioScreen from './pages/CalendarioScreen'
import CrearCitaScreen from './pages/CrearCitaScreen'
import CitaDetailScreen from './pages/CitaDetailScreen'
import GastosScreen from './pages/GastosScreen'
import HistorialProcedimientosScreen from './pages/HistorialProcedimientosScreen'
import HistorialFinancieroScreen from './pages/HistorialFinancieroScreen'
import TimelineUnificadoScreen from './pages/TimelineUnificadoScreen'
import ReportesScreen from './pages/ReportesScreen'
import MensajesEnviadosScreen from './pages/MensajesEnviadosScreen'
import RecordatoriosScreen from './pages/RecordatoriosScreen'
import BackupsScreen from './pages/BackupsScreen'
import ExportarDatosScreen from './pages/ExportarDatosScreen'
import GestionEquipoScreen from './pages/GestionEquipoScreen'
import DashboardEquipoScreen from './pages/DashboardEquipoScreen'
import MetricasPerfilScreen from './pages/MetricasPerfilScreen'
import PlanesScreen from './pages/PlanesScreen'
import HistorialPagosScreen from './pages/HistorialPagosScreen'
import AdminDashboard from './pages/AdminDashboard'
import AceptarInvitacionScreen from './pages/AceptarInvitacionScreen'
import NotificacionesScreen from './pages/NotificacionesScreen'
import PrivacidadPage from './pages/PrivacidadPage'
import TerminosPage from './pages/TerminosPage'
import ForgotPasswordScreen from './pages/ForgotPasswordScreen'
import ResetPasswordScreen from './pages/ResetPasswordScreen'
import PlanesPagoScreen from './pages/PlanesPagoScreen'
import ConfirmacionExitosaScreen from './pages/ConfirmacionExitosaScreen'
import CancelacionExitosaScreen from './pages/CancelacionExitosaScreen'
import LoadingScreen from './pages/LoadingScreen'

function ProtectedRoute({ children, session }) {
  if (!session) return <Navigate to="/login" replace />
  return children
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()
  const location = useLocation()

  const currentUserIdRef      = useRef(null)
  const locationRef           = useRef(location.pathname)   // ✅ NUEVO
  const isPasswordRecoveryRef = useRef(false)               // ✅ NUEVO

  // ✅ Mantener locationRef siempre actualizado
  useEffect(() => {
    locationRef.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    let mounted = true

    const loadClinicConfig = (userId) => {
      supabase
        .from('configuracion_clinica')
        .select('idioma, moneda')
        .eq('dentista_id', userId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.idioma) {
            localStorage.setItem('odontolog_idioma', data.idioma)
            import('i18next').then(m => m.default.changeLanguage(data.idioma))
          }
          if (data?.moneda) {
            localStorage.setItem('odontolog_moneda', data.moneda)
          }
        })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return

      const newUserId     = newSession?.user?.id || null
      const currentUserId = currentUserIdRef.current

      switch (event) {
        case 'INITIAL_SESSION':
          currentUserIdRef.current = newUserId
          setSession(newSession)
          if (newUserId) loadClinicConfig(newUserId)
          setLoading(false)
          break

        case 'SIGNED_IN':
          // ✅ Si venimos de recovery, no redirigir — solo setear sesión
          if (isPasswordRecoveryRef.current) {
            currentUserIdRef.current = newUserId
            setSession(newSession)
            break
          }

          if (newUserId !== currentUserId) {
            currentUserIdRef.current = newUserId
            setSession(newSession)
            loadClinicConfig(newUserId)

            // ✅ locationRef.current siempre tiene el pathname actual
            if (locationRef.current === '/login' && newSession) {
              if (newSession.user.email === 'president@odontolog.lat') {
                navigate('/admin', { replace: true })
              } else {
                navigate('/dashboard', { replace: true })
              }
            }
          }
          break

        case 'SIGNED_OUT':
          currentUserIdRef.current = null
          setSession(null)
          navigate('/login')
          break

        case 'TOKEN_REFRESHED':
          if (newUserId !== currentUserId) {
            currentUserIdRef.current = newUserId
            setSession(newSession)
          }
          break

        case 'PASSWORD_RECOVERY':
          // ✅ Marcar flujo de recovery + setear sesión + navegar
          isPasswordRecoveryRef.current = true
          currentUserIdRef.current = newUserId
          setSession(newSession)
          navigate('/reset-password')
          break

        case 'USER_UPDATED':
          // ✅ Limpiar flag al completar el cambio de contraseña
          isPasswordRecoveryRef.current = false
          if (newUserId !== currentUserId) {
            currentUserIdRef.current = newUserId
            setSession(newSession)
          }
          break

        default:
          if (newUserId !== currentUserId) {
            currentUserIdRef.current = newUserId
            setSession(newSession)
          }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (loading || !session) return

    if (session.user?.email === 'president@odontolog.lat') {
      if (location.pathname !== '/admin') {
        navigate('/admin', { replace: true })
      }
      return
    }

    if (location.pathname === '/login' || location.pathname === '/') {
      navigate('/dashboard', { replace: true })
    }
  }, [session?.user?.id, location.pathname, navigate, loading])

  if (loading) return <LoadingScreen />

  const userId = session?.user?.id || null

  return (
    <SuscripcionProvider userId={userId}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacidad" element={<PrivacidadPage />} />
        <Route path="/terminos" element={<TerminosPage />} />
        <Route path="/aceptar-invitacion" element={<AceptarInvitacionScreen />} />
        <Route path="/confirm/:token" element={<ConfirmacionExitosaScreen />} />
        <Route path="/cancel/:token" element={<CancelacionExitosaScreen />} />
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <LoginScreen />} />
        <Route path="/register" element={<RegistrationScreen />} />
        <Route path="/registro" element={<RegistrationScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/reset-password" element={<ResetPasswordScreen />} />

        <Route path="/dashboard" element={<ProtectedRoute session={session}><DashboardScreen session={session} /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute session={session}><ClientesScreen /></ProtectedRoute>} />
        <Route path="/agregar-paciente" element={<ProtectedRoute session={session}><AddPacienteScreen /></ProtectedRoute>} />
        <Route path="/editar-paciente/:id" element={<ProtectedRoute session={session}><EditPacienteScreen /></ProtectedRoute>} />
        <Route path="/paciente/:id" element={<ProtectedRoute session={session}><PacienteDetailScreen /></ProtectedRoute>} />
        <Route path="/calendario" element={<ProtectedRoute session={session}><CalendarioScreen /></ProtectedRoute>} />
        <Route path="/crear-cita" element={<ProtectedRoute session={session}><CrearCitaScreen /></ProtectedRoute>} />
        <Route path="/cita/:id" element={<ProtectedRoute session={session}><CitaDetailScreen /></ProtectedRoute>} />
        <Route path="/catalogo-procedimientos" element={<ProtectedRoute session={session}><CatalogoProcedimientosScreen /></ProtectedRoute>} />
        <Route path="/gastos" element={<ProtectedRoute session={session}><GastosScreen /></ProtectedRoute>} />
        <Route path="/cuentas-por-cobrar" element={<ProtectedRoute session={session}><CuentasPorCobrarScreen /></ProtectedRoute>} />
        <Route path="/planes-pago" element={<ProtectedRoute session={session}><PlanesPagoScreen /></ProtectedRoute>} />
        <Route path="/crear-plan-pago/:pacienteId" element={<ProtectedRoute session={session}><CrearPlanPagoScreen /></ProtectedRoute>} />
        <Route path="/plan-pago/:id" element={<ProtectedRoute session={session}><PlanPagoDetailScreen /></ProtectedRoute>} />
        <Route path="/odontograma/:pacienteId" element={<ProtectedRoute session={session}><OdontogramaScreen /></ProtectedRoute>} />
        <Route path="/presupuesto/:pacienteId" element={<ProtectedRoute session={session}><PresupuestoScreen /></ProtectedRoute>} />
        <Route path="/registrar-pago/:pacienteId" element={<ProtectedRoute session={session}><RegistrarPagoScreen /></ProtectedRoute>} />
        <Route path="/configuracion" element={<ProtectedRoute session={session}><ConfiguracionClinicaScreen /></ProtectedRoute>} />
        <Route path="/planes" element={<ProtectedRoute session={session}><PlanesScreen /></ProtectedRoute>} />
        <Route path="/historial-pagos" element={<ProtectedRoute session={session}><HistorialPagosScreen /></ProtectedRoute>} />
        <Route path="/historial-procedimientos" element={<ProtectedRoute session={session}><HistorialProcedimientosScreen /></ProtectedRoute>} />
        <Route path="/historial-financiero" element={<ProtectedRoute session={session}><HistorialFinancieroScreen /></ProtectedRoute>} />
        <Route path="/timeline/:pacienteId" element={<ProtectedRoute session={session}><TimelineUnificadoScreen /></ProtectedRoute>} />
        <Route path="/reportes" element={<ProtectedRoute session={session}><ReportesScreen /></ProtectedRoute>} />
        <Route path="/metricas" element={<ProtectedRoute session={session}><MetricasScreen /></ProtectedRoute>} />
        <Route path="/mensajes-enviados" element={<ProtectedRoute session={session}><MensajesEnviadosScreen /></ProtectedRoute>} />
        <Route path="/recordatorios" element={<ProtectedRoute session={session}><RecordatoriosScreen /></ProtectedRoute>} />
        <Route path="/backups" element={<ProtectedRoute session={session}><BackupsScreen /></ProtectedRoute>} />
        <Route path="/exportar" element={<ProtectedRoute session={session}><ExportarDatosScreen /></ProtectedRoute>} />
        <Route path="/gestion-equipo" element={<ProtectedRoute session={session}><GestionEquipoScreen /></ProtectedRoute>} />
        <Route path="/dashboard-equipo" element={<ProtectedRoute session={session}><DashboardEquipoScreen /></ProtectedRoute>} />
        <Route path="/metricas-perfil/:perfilId" element={<ProtectedRoute session={session}><MetricasPerfilScreen /></ProtectedRoute>} />
        <Route path="/configuracion-notificaciones" element={<ProtectedRoute session={session}><ConfiguracionNotificacionesScreen /></ProtectedRoute>} />
        <Route path="/notificaciones" element={<ProtectedRoute session={session}><NotificacionesScreen /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute session={session}><AdminDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </SuscripcionProvider>
  )
}

export default App