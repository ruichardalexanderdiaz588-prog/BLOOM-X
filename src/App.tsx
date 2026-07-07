import React, { useState, useEffect } from 'react';
import { 
  auth, googleProvider, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged 
} from './lib/firebase';
import { 
  getProfile, createProfile, blockUser, createReport 
} from './lib/supabase';
import { Profile } from './types';
import { translations } from './lib/translations';

// Components
import Onboarding from './components/Onboarding';
import Navbar from './components/Navbar';
import HomeFeed from './components/HomeFeed';
import ConectaMap from './components/ConectaMap';
import PublicaForm from './components/PublicaForm';
import ChatsView from './components/ChatsView';
import PerfilView from './components/PerfilView';
import AdminPanel from './components/AdminPanel';

// Icons
import { Sparkles, Mail, Lock, Eye, EyeOff, Globe, ShieldCheck, Heart, User, Star, X } from 'lucide-react';

function getFirebaseErrorMessage(err: any): string {
  const code = err?.code || '';
  const message = err?.message || '';
  const fullString = err?.toString() || '';

  // 1. auth/invalid-credential
  if (code === 'auth/invalid-credential' || fullString.includes('invalid-credential') || message.includes('invalid-credential')) {
    return 'Las credenciales ingresadas son inválidas, incorrectas o han caducado. Por favor, verifique su correo electrónico y contraseña.';
  }

  // 2. auth/email-already-in-use
  if (code === 'auth/email-already-in-use' || fullString.includes('email-already-in-use') || message.includes('email-already-in-use')) {
    return 'Este correo electrónico ya se encuentra registrado. Por favor, intente iniciar sesión o use otra dirección.';
  }

  // 3. auth/unauthorized-domain
  if (code === 'auth/unauthorized-domain' || fullString.includes('unauthorized-domain') || message.includes('unauthorized-domain')) {
    return 'Dominio no autorizado para autenticación. Por favor, agregue este dominio a la lista de dominios autorizados en la consola de Firebase Authentication.';
  }

  // 4. auth/network-request-failed
  if (code === 'auth/network-request-failed' || fullString.includes('network-request-failed') || message.includes('network-request-failed')) {
    return 'Error de red: Falló la conexión con los servidores de autenticación de Firebase. Por favor, verifique su conexión a internet.';
  }

  // Otros errores comunes de Firebase Auth
  if (code === 'auth/weak-password' || message.includes('weak-password')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (code === 'auth/wrong-password' || message.includes('wrong-password')) {
    return 'La contraseña ingresada es incorrecta.';
  }
  if (code === 'auth/user-not-found' || message.includes('user-not-found')) {
    return 'No se encontró ningún usuario con este correo electrónico.';
  }
  if (code === 'auth/popup-closed-by-user' || message.includes('popup-closed-by-user')) {
    return 'El inicio de sesión fue cancelado al cerrar la ventana emergente de Google.';
  }
  if (code === 'auth/operation-not-allowed' || message.includes('operation-not-allowed')) {
    return 'Este método de inicio de sesión no está habilitado actualmente en Firebase.';
  }

  return err?.message || 'Ocurrió un error inesperado al procesar la autenticación.';
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // App navigation
  const [activeTab, setActiveTab] = useState('home');
  const [targetUserId, setTargetUserId] = useState<string | null>(null); // for PerfilView target
  const [activeContactId, setActiveContactId] = useState<string | null>(null); // for ChatsView target

  // Global settings
  const [lang, setLang] = useState('es');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Login form state
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Policy Viewers
  const [showPolicies, setShowPolicies] = useState<'none' | 'tos' | 'privacy'>('none');

  // Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch profile
        const userProfile = await getProfile(firebaseUser.uid);
        if (userProfile) {
          setProfile(userProfile);
          setNeedsOnboarding(false);
        } else {
          setNeedsOnboarding(true);
        }
      } else {
        setUser(null);
        setProfile(null);
        setNeedsOnboarding(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [refreshTrigger]);

  const handleSetLang = (newLang: string) => {
    setLang(newLang);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!email.trim() || !password.trim()) {
      setLoginError('Por favor complete todos los campos.');
      return;
    }

    setLoginLoading(true);
    try {
      if (isRegisterMode) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      const msg = getFirebaseErrorMessage(err);
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    setLoginLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      const msg = getFirebaseErrorMessage(err);
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setNeedsOnboarding(false);
    setActiveTab('home');
    setTargetUserId(null);
    setActiveContactId(null);
  };

  const handleOnboardingComplete = async () => {
    setRefreshTrigger(prev => prev + 1);
    setNeedsOnboarding(false);
    setActiveTab('home');
  };

  const handleVisitProfile = (userId: string) => {
    setTargetUserId(userId);
    setActiveTab('perfil');
  };

  const handleStartChat = (userId: string) => {
    setActiveContactId(userId);
    setActiveTab('chats');
  };

  const handleBlockUser = async (targetId: string) => {
    if (!user) return;
    await blockUser(user.uid, targetId);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleReport = async (reportData: { reportedUserId: string; postId?: string; reason: string }) => {
    if (!user) return;
    await createReport({
      reporter_id: user.uid,
      reported_user_id: reportData.reportedUserId,
      post_id: reportData.postId || null,
      reason: reportData.reason
    });
    setRefreshTrigger(prev => prev + 1);
  };

  const t = translations[lang] || translations['es'];
  const isAdmin = profile?.username === 'richardalexanderdiaz0' || profile?.first_name.toLowerCase().includes('richard');

  // RENDER LOADING SCREEN
  if (loading) {
    return (
      <div className="min-h-screen bg-pink-50/20 flex flex-col items-center justify-center p-4">
        <div className="bg-gradient-to-r from-pink-500 to-rose-400 p-4 rounded-3xl text-white shadow-xl animate-pulse mb-4">
          <Sparkles className="w-8 h-8 fill-white animate-spin" style={{ animationDuration: '4s' }} />
        </div>
        <span className="text-sm font-extrabold tracking-widest bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent uppercase">
          BLOOM
        </span>
        <span className="text-[10px] text-gray-400 mt-2">Conectando de manera premium...</span>
      </div>
    );
  }

  // RENDER LOGIN / REGISTER SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-pink-50/25 flex flex-col justify-between p-6">
        
        {/* TOP BAR / LANGUAGE SWITCHER */}
        <div className="max-w-md w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="bg-pink-500 p-1.5 rounded-lg text-white">
              <Sparkles className="w-3.5 h-3.5 fill-white" />
            </div>
            <span className="text-xs font-bold tracking-wider text-pink-600">BLOOM</span>
          </div>

          <div className="flex items-center gap-1 bg-white border border-pink-100 rounded-xl px-2.5 py-1 text-xs text-gray-500 shadow-sm">
            <Globe className="w-3.5 h-3.5 text-pink-400" />
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value)}
              className="bg-transparent focus:outline-none text-[10px] font-bold text-gray-700"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="ru">Русский</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </div>

        {/* AUTH CARD */}
        <div className="max-w-md w-full mx-auto bg-white rounded-3xl border border-pink-100 p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">
              {isRegisterMode ? t.register : t.login}
            </h1>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              {isRegisterMode ? 'Crea tu cuenta de Bloom Premium hoy mismo.' : t.welcomeText}
            </p>
          </div>

          {loginError && (
            <div className="bg-red-50 text-red-700 text-xs p-3.5 rounded-2xl border border-red-100 font-semibold">
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.email}</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-pink-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input 
                  type="email" 
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-pink-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-pink-200 bg-gray-50/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.password}</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-pink-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-pink-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-pink-200 bg-gray-50/50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-extrabold rounded-2xl shadow-lg hover:shadow-pink-100 text-xs transition-all flex items-center justify-center gap-1.5"
            >
              {loginLoading ? (
                <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>{isRegisterMode ? 'Registrarme' : 'Entrar Premium'}</span>
            </button>
          </form>

          {/* CHOOSE GOOGLE ACCORDION */}
          <div className="relative flex items-center justify-center text-[10px] text-gray-400 uppercase font-bold py-2">
            <span className="absolute inset-x-0 h-px bg-pink-100/60" />
            <span className="relative bg-white px-3 text-pink-400">O ingresa de forma segura con</span>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loginLoading}
            className="w-full py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-bold rounded-2xl text-xs transition-colors flex items-center justify-center gap-2"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="w-4 h-4 shrink-0" />
            <span>Continuar con Google</span>
          </button>

          {/* TOGGLE MODE */}
          <div className="text-center text-xs text-gray-500">
            <span>{isRegisterMode ? '¿Ya tienes una cuenta?' : '¿Eres nuevo en Bloom?'} </span>
            <button
              onClick={() => setIsRegisterMode(!isRegisterMode)}
              className="text-pink-600 font-extrabold hover:underline"
            >
              {isRegisterMode ? 'Inicia Sesión' : 'Regístrate Gratis'}
            </button>
          </div>

        </div>

        {/* POLICIES AND FOOTER MANDATE */}
        <div className="max-w-md w-full mx-auto text-center text-[10px] text-gray-400 space-y-2">
          <p>Al unirte a Bloom, confirmas que eres mayor de 18 años y aceptas nuestras políticas de comunidad de respeto mutuo.</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setShowPolicies('tos')} className="hover:underline font-semibold text-pink-500">Términos de Servicio</button>
            <span>•</span>
            <button onClick={() => setShowPolicies('privacy')} className="hover:underline font-semibold text-pink-500">Políticas de Privacidad</button>
          </div>
          <p className="text-[9px] opacity-75">Copyright © 2026 Bloom by RUIWORKS. Todos los derechos reservados. 🛠️</p>
        </div>

        {/* LEGAL MODALS POLICY POPUP */}
        {showPolicies !== 'none' && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-pink-100 shadow-2xl relative max-h-[80vh] overflow-y-auto space-y-4 text-xs text-gray-600">
              <button 
                onClick={() => setShowPolicies('none')}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 bg-gray-50 p-1.5 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>

              <h2 className="text-md font-bold text-gray-800 uppercase tracking-wider">
                {showPolicies === 'tos' ? 'Términos de Servicio - Bloom' : 'Política de Privacidad y Geolocalización'}
              </h2>

              {showPolicies === 'tos' ? (
                <div className="space-y-3 leading-relaxed">
                  <p><strong>1. Uso Aceptable:</strong> Bloom es una plataforma premium diseñada exclusivamente para personas mayores de 18 años interesadas en conectar, conversar y forjar relaciones bajo un estándar absoluto de consentimiento y educación.</p>
                  <p><strong>2. Comportamiento Prohibido:</strong> Se prohíbe terminantemente el acoso, la suplantación de identidad, la discriminación LGTBIQ+fóbica, racista o de cualquier otra índole, y el spam. Cualquier conducta de riesgo resultará en el banneo irreversible de la cuenta por Richard Alexander Díaz.</p>
                  <p><strong>3. Responsabilidad:</strong> Bloom no se hace responsable por encuentros offline o de terceras actividades. Por favor use el botón de reportar y bloquee usuarios dudosos de inmediato.</p>
                </div>
              ) : (
                <div className="space-y-3 leading-relaxed">
                  <p><strong>1. Geolocalización y Datos:</strong> En Bloom solicitamos tus coordenadas geográficas de manera precisa para calcular la distancia aproximada en kilómetros (km) respecto a otros usuarios en la sección "Conecta".</p>
                  <p><strong>2. Privacidad de Coordenadas:</strong> Tus coordenadas precisas nunca se revelan a otros usuarios de forma explícita ni se comparten con terceras empresas publicitarias. Toda distancia es estimativa.</p>
                  <p><strong>3. Retención de Contenido:</strong> Las imágenes adjuntas en chats privados y publicaciones públicas se guardan de forma encriptada bajo la base de datos oficial y se purgan al eliminar la cuenta.</p>
                </div>
              )}

              <button 
                onClick={() => setShowPolicies('none')}
                className="w-full py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-center block mt-4"
              >
                Entendido y de acuerdo
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // RENDER ONBOARDING FOR NEW USERS
  if (needsOnboarding) {
    return (
      <div className="min-h-screen bg-pink-50/10">
        <Onboarding 
          userId={user.uid} 
          lang={lang} 
          onComplete={handleOnboardingComplete} 
        />
      </div>
    );
  }

  // RENDER MAIN APPLICATION SHELL
  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 md:pb-6 font-sans">
      
      {/* NAVBAR */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'perfil') {
            setTargetUserId(null); // Own profile
          }
        }} 
        lang={lang} 
        isAdmin={isAdmin}
      />

      {/* CORE ROUTING STAGE */}
      <main className="container mx-auto">
        {activeTab === 'home' && (
          <HomeFeed 
            currentProfile={profile} 
            lang={lang} 
            onVisitProfile={handleVisitProfile} 
            onBlockUser={handleBlockUser} 
            onReport={handleReport} 
            refreshTrigger={refreshTrigger} 
          />
        )}

        {activeTab === 'conecta' && (
          <ConectaMap 
            currentProfile={profile} 
            lang={lang} 
            onVisitProfile={handleVisitProfile} 
            onStartChat={handleStartChat} 
            onBlockUser={handleBlockUser} 
            refreshTrigger={refreshTrigger} 
          />
        )}

        {activeTab === 'publica' && (
          <PublicaForm 
            currentProfile={profile} 
            lang={lang} 
            onPublishComplete={() => {
              setActiveTab('home');
              setRefreshTrigger(p => p + 1);
            }} 
          />
        )}

        {activeTab === 'chats' && (
          <ChatsView 
            currentProfile={profile} 
            lang={lang} 
            activeContactId={activeContactId} 
            setActiveContactId={setActiveContactId} 
            refreshTrigger={refreshTrigger} 
          />
        )}

        {activeTab === 'perfil' && (
          <PerfilView 
            currentProfile={profile} 
            targetUserId={targetUserId} 
            lang={lang} 
            setLang={handleSetLang} 
            onLogout={handleLogout} 
            onStartChat={handleStartChat} 
            onBackToFeed={() => {
              setTargetUserId(null);
              setActiveTab('home');
            }} 
            refreshTrigger={refreshTrigger} 
            triggerRefresh={() => setRefreshTrigger(p => p + 1)} 
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel 
            currentProfile={profile} 
            lang={lang} 
          />
        )}
      </main>

    </div>
  );
}
