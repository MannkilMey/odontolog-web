import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'

// ✅ AGREGAR CONTEXT API
import { SuscripcionProvider } from './hooks/SuscripcionContext'

// ==================== PÁGINAS PRINCIPALES ====================
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

// 🔐 PANTALLAS PREMIUM
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

// ⚙️ PÁGINAS ADICIONALES
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


// 🆕 SISTEMA DE CONFIRMACIÓN
import ConfirmacionExitosaScreen from './pages/ConfirmacionExitosaScreen'
import CancelacionExitosaScreen from './pages/CancelacionExitosaScreen'

// 🎯 LOADING SIMPLE
import LoadingScreen from './pages/LoadingScreen'

// ✅ COMPONENTE SIMPLE PARA RUTAS PROTEGIDAS
function ProtectedRoute({ children, session }) {
  if (!session) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
   
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
   
  const navigate = useNavigate()
  const location = useLocation()

  // ✅ REF para prevenir procesamiento duplicado
  const currentUserIdRef = useRef(null)

  // ═══════════════════════════════════════════════════════════
  // FIX C: AUTH UNIFICADO - SOLO onAuthStateChange
  // 
  // ANTES: getSession() + onAuthStateChange corrían en paralelo
  //        causando 2 setSession → 2 renders → 2 montajes del Provider
  //
  // AHORA: Solo usamos onAuthStateChange que dispara INITIAL_SESSION
  //        como primer evento, eliminando la race condition
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return

      const newUserId = newSession?.user?.id || null
      const currentUserId = currentUserIdRef.current


      switch (event) {
        case 'INITIAL_SESSION':
          // ✅ Este es el ÚNICO lugar donde procesamos la sesión inicial
          currentUserIdRef.current = newUserId
          setSession(newSession)
          setLoading(false)
          break

        case 'SIGNED_IN':
          // ✅ Solo actualizar si el userId realmente cambió
          if (newUserId !== currentUserId) {
            currentUserIdRef.current = newUserId
            setSession(newSession)
            
            // Redirigir solo si estamos en login
            if (location.pathname === '/login' && newSession) {
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
          // ✅ Solo actualizar la referencia de sesión, NO disparar re-render
          //    si el userId no cambió (que nunca debería en un refresh)
          if (newUserId !== currentUserId) {
            currentUserIdRef.current = newUserId
            setSession(newSession)
          }
          // Si solo cambió el token, actualizar ref silenciosamente
          // para que los queries usen el token nuevo
          break

        case 'PASSWORD_RECOVERY':
          navigate('/reset-password')
          break

        default:
          // USER_UPDATED, etc.
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
  }, []) // ✅ Sin dependencias - se ejecuta UNA sola vez

  // ✅ REDIRECT AUTOMÁTICO (sin cambios funcionales)
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

  // ⏳ LOADING
  if (loading) {
    return <LoadingScreen />
  }

  // ═══════════════════════════════════════════════════════════
  // FIX D: PROVIDER SIEMPRE MONTADO
  //
  // ANTES: {memoizedSession ? <Provider>...</Provider> : <Routes/>}
  //        Cada cambio de sesión DESMONTABA y REMONTABA el Provider,
  //        destruyendo todo el estado interno (cache, subscriptions)
  //
  // AHORA: Provider siempre está en el árbol. Recibe userId que puede
  //        ser null. Internamente maneja el caso sin sesión.
  //        Las rutas públicas funcionan igual, solo sin datos de suscripción.
  // ═══════════════════════════════════════════════════════════
  const userId = session?.user?.id || null

  return (
    <SuscripcionProvider userId={userId}>
      <Routes>
        {/* ==================== RUTAS PÚBLICAS ==================== */}
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

        {/* ==================== RUTAS PROTEGIDAS ==================== */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute session={session}>
              <DashboardScreen session={session} />
            </ProtectedRoute>
          } 
        />

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

        {/* ==================== RUTAS PREMIUM ==================== */}
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

        {/* ==================== ADMIN ==================== */}
        <Route path="/admin" element={<ProtectedRoute session={session}><AdminDashboard /></ProtectedRoute>} />

        {/* ==================== FALLBACK ==================== */}
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </SuscripcionProvider>
  )
}

export default App