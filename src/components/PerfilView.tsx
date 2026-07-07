import React, { useState, useEffect } from 'react';
import { 
  User, Settings, Calendar, Tag, ShieldCheck, LogOut, 
  Trash2, Ban, Globe, ShieldAlert, Sparkles, MessageCircle, 
  MapPin, Image as ImageIcon, Heart, Compass, Check, AlertCircle, X
} from 'lucide-react';
import { Profile, Post } from '../types';
import { translations } from '../lib/translations';
import { 
  getProfile, getUserPosts, updateProfile, getBlockedUsers, 
  unblockUser, createFeedback, blockUser, createReport 
} from '../lib/supabase';
import { getZodiac, calculateAge, formatTimeAgo, DEFAULT_BANNERS, DEFAULT_AVATARS, PRESET_AVATARS_GALLERY, compressImage } from '../lib/utils';

interface PerfilViewProps {
  currentProfile: Profile;
  targetUserId: string | null; // Null means own profile
  lang: string;
  setLang: (lang: string) => void;
  onLogout: () => void;
  onStartChat: (userId: string) => void;
  onBackToFeed: () => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const LOOKING_FOR_OPTIONS = [
  { value: 'cruising', label: 'Cruising', icon: '🌲', desc: 'Encuentros rápidos y discretos' },
  { value: 'citas', label: 'Citas', icon: '🌹', desc: 'Salir y conocer qué fluye' },
  { value: 'relacion seria', label: 'Relación Seria', icon: '💍', desc: 'Estabilidad y compromiso' },
  { value: 'amistad', label: 'Amistad', icon: '🤝', desc: 'Ampliar grupo y aficiones' },
  { value: 'pasar el rato', label: 'Pasar el Rato', icon: '🥂', desc: 'Disfrutar sin etiquetas' },
  { value: 'relación seria, pero no me cierro', label: 'Relación seria, pero flexible', icon: '🎯', desc: 'Busco estabilidad, pero fluyo' }
];

const EMOTIONAL_STATUSES = [
  { value: 'soltero', label: 'Soltero/a', icon: '🔓' },
  { value: 'casado', label: 'Casado/a', icon: '🔒' },
  { value: 'recién casado', label: 'Recién casado/a', icon: '🎉' },
  { value: 'viudo', label: 'Viudo/a', icon: '🖤' },
  { value: 'es difícil decirlo', label: 'Es difícil decirlo', icon: '🧩' },
  { value: 'divorciado', label: 'Divorciado/a', icon: '✂️' }
];

export default function PerfilView({ 
  currentProfile, targetUserId, lang, setLang, onLogout, onStartChat, onBackToFeed, refreshTrigger, triggerRefresh 
}: PerfilViewProps) {
  const t = translations[lang] || translations['es'];
  const isOwn = !targetUserId || targetUserId === currentProfile.id;

  const [profile, setProfile] = useState<Profile>(currentProfile);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings / Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [blockedList, setBlockedList] = useState<Profile[]>([]);
  
  // Bug report
  const [showBugReport, setShowBugReport] = useState(false);
  const [bugText, setBugText] = useState('');
  const [bugSubmitted, setBugSubmitted] = useState(false);

  // Edit fields state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [emotionalStatus, setEmotionalStatus] = useState('');
  const [gustos, setGustos] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [errorText, setErrorText] = useState('');

  // Spectator actions
  const [showSpectatorReport, setShowSpectatorReport] = useState(false);
  const [spectatorReportReason, setSpectatorReportReason] = useState('');

  // Load profile data
  useEffect(() => {
    const loadProfileAndPosts = async () => {
      setLoading(true);
      const uid = targetUserId || currentProfile.id;
      const p = await getProfile(uid);
      if (p) {
        setProfile(p);
        
        // Load edit fields only if own profile
        if (isOwn) {
          setFirstName(p.first_name);
          setLastName(p.last_name);
          setUsername(p.username);
          setBio(p.bio || '');
          setBirthdate(p.birthdate);
          setLookingFor(p.looking_for || '');
          setEmotionalStatus(p.emotional_status || 'soltero');
          setGustos(p.gustos || []);
          setAvatarUrl(p.avatar_url || DEFAULT_AVATARS[0]);
          setBannerUrl(p.banner_url || DEFAULT_BANNERS[0]);
        }
      }
      
      const userPosts = await getUserPosts(uid);
      setPosts(userPosts);
      setLoading(false);
    };
    loadProfileAndPosts();
  }, [targetUserId, currentProfile.id, refreshTrigger]);

  const handleSaveProfile = async () => {
    setErrorText('');
    if (!firstName.trim() || !lastName.trim() || !username.trim() || !birthdate) {
      setErrorText("Por favor, llena los campos básicos obligatorios.");
      return;
    }

    const age = calculateAge(birthdate);
    const zodiacInfo = getZodiac(birthdate);

    const updates: Partial<Profile> = {
      first_name: firstName,
      last_name: lastName,
      username: username.toLowerCase().replace(/\s+/g, ''),
      bio,
      birthdate,
      age,
      zodiac: zodiacInfo.sign,
      zodiac_icon: zodiacInfo.icon,
      looking_for: lookingFor,
      emotional_status: emotionalStatus,
      gustos,
      avatar_url: avatarUrl,
      banner_url: bannerUrl
    };

    const updated = await updateProfile(profile.id, updates);
    if (updated) {
      setProfile(updated);
      setShowEdit(false);
      triggerRefresh();
    } else {
      setErrorText("Error al actualizar. Posiblemente el nombre de usuario ya está tomado.");
    }
  };

  const handleLoadBlocked = async () => {
    const list = await getBlockedUsers(currentProfile.id);
    setBlockedList(list);
    setShowBlocked(true);
  };

  const handleUnblock = async (blockedId: string) => {
    const success = await unblockUser(currentProfile.id, blockedId);
    if (success) {
      setBlockedList(blockedList.filter(u => u.id !== blockedId));
      triggerRefresh();
    }
  };

  const handleSendBug = async () => {
    if (!bugText.trim()) return;
    const success = await createFeedback({
      user_id: currentProfile.id,
      user_email: currentProfile.username + '@bloom.com',
      error_text: bugText
    });

    if (success) {
      setBugSubmitted(true);
      setBugText('');
      setTimeout(() => {
        setBugSubmitted(false);
        setShowBugReport(false);
      }, 2000);
    }
  };

  const handleSpectatorBlock = async () => {
    if (isOwn) return;
    const confirmBlock = window.confirm(t.blockUserPrompt);
    if (confirmBlock) {
      await blockUser(currentProfile.id, profile.id);
      alert('Usuario bloqueado exitosamente.');
      onBackToFeed();
    }
  };

  const handleSpectatorSendReport = async () => {
    if (!spectatorReportReason.trim()) return;
    await createReport({
      reporter_id: currentProfile.id,
      reported_user_id: profile.id,
      reason: spectatorReportReason
    });
    alert('Reporte registrado para richardalexanderdiaz0@gmail.com.');
    setShowSpectatorReport(false);
    setSpectatorReportReason('');
  };

  // Add customized hobbies
  const [customHobbyInput, setCustomHobbyInput] = useState('');
  const addCustomHobby = () => {
    if (!customHobbyInput.trim()) return;
    let val = customHobbyInput.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (!gustos.includes(val)) {
      setGustos([...gustos, val]);
    }
    setCustomHobbyInput('');
  };

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string, 350, 350);
          setAvatarUrl(compressed);
        } catch (err) {
          console.error("Error compressing avatar:", err);
          setAvatarUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string, 700, 350);
          setBannerUrl(compressed);
        } catch (err) {
          console.error("Error compressing banner:", err);
          setBannerUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      
      {/* PROFILE HEADER & IMAGES */}
      <div className="bg-white rounded-3xl border border-pink-100 overflow-hidden shadow-sm relative">
        <div className="h-44 relative bg-pink-100">
          <img 
            src={profile.banner_url || DEFAULT_BANNERS[0]} 
            alt="Banner" 
            className="w-full h-full object-cover" 
            onError={(e) => { e.currentTarget.src = DEFAULT_BANNERS[0]; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          
          {/* Header Actions Buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {isOwn ? (
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2.5 bg-white/90 hover:bg-white text-pink-600 rounded-xl shadow-md transition-transform cursor-pointer"
              >
                <Settings className="w-5 h-5" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowSpectatorReport(true)}
                  className="p-2 bg-white/95 text-rose-600 hover:bg-white rounded-xl shadow-md text-xs font-bold"
                >
                  <ShieldAlert className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleSpectatorBlock}
                  className="p-2 bg-white/95 text-red-600 hover:bg-white rounded-xl shadow-md text-xs font-bold flex items-center gap-1"
                >
                  <Ban className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 relative">
          
          {/* Avatar Offset */}
          <div className="absolute -top-16 left-6">
            <img 
              src={profile.avatar_url || DEFAULT_AVATARS[0]} 
              alt="Avatar" 
              className="w-28 h-28 rounded-full border-4 border-white object-cover shadow-md"
              onError={(e) => { e.currentTarget.src = DEFAULT_AVATARS[0]; }}
            />
          </div>

          <div className="pt-14 space-y-4">
            
            {/* Header info */}
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-800">{profile.first_name} {profile.last_name}</h2>
                  {profile.zodiac_icon && (
                    <span className="text-xl" title={profile.zodiac}>{profile.zodiac_icon}</span>
                  )}
                  {profile.gender_icon && (
                    <span className="text-xl" title={profile.gender}>{profile.gender_icon}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                  <span>@{profile.username}</span>
                  {profile.show_orientation && (
                    <>
                      <span>•</span>
                      <span className="bg-pink-50 text-pink-600 px-2.5 py-0.5 rounded-full font-bold">
                        {profile.orientation_icon} {profile.orientation}
                      </span>
                    </>
                  )}
                  {profile.show_age && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-gray-700">{profile.age} años</span>
                    </>
                  )}
                </div>
              </div>

              {/* Own edit profile button or direct Message triggers */}
              {isOwn ? (
                <button 
                  onClick={() => setShowEdit(true)}
                  className="px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-pink-100"
                >
                  {t.editPerfil}
                </button>
              ) : (
                <button 
                  onClick={() => onStartChat(profile.id)}
                  className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold rounded-2xl shadow-lg hover:shadow-pink-100 text-xs transition-all flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>{t.sendMessage}</span>
                </button>
              )}
            </div>

            {/* Approximate location row */}
            {profile.location_name && (
              <div className="flex items-center gap-1.5 text-xs text-pink-600 font-bold bg-pink-50/50 p-2.5 rounded-xl border border-pink-100/60 inline-flex">
                <MapPin className="w-4 h-4" />
                <span>{profile.location_name}, {profile.country}</span>
              </div>
            )}

            {/* Profile Bio */}
            {profile.bio && (
              <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-1">Sobre mí</span>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 text-center border-y border-gray-100 py-3 text-xs">
              <div>
                <span className="text-gray-400 block uppercase text-[9px] font-bold mb-0.5">Publicaciones</span>
                <strong className="text-base text-gray-800">{posts.length}</strong>
              </div>
              <div>
                <span className="text-gray-400 block uppercase text-[9px] font-bold mb-0.5">Buscando</span>
                <strong className="text-pink-600 font-extrabold capitalize">{profile.looking_for || 'Amistad'}</strong>
              </div>
              <div>
                <span className="text-gray-400 block uppercase text-[9px] font-bold mb-0.5">Estado</span>
                <strong className="text-pink-600 font-extrabold capitalize">{profile.emotional_status}</strong>
              </div>
            </div>

            {/* Interests / Gustos */}
            {profile.gustos && profile.gustos.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Temas de Interés</span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.gustos.map(g => (
                    <span key={g} className="bg-pink-50 text-pink-600 text-xs font-bold px-3 py-1 rounded-full border border-pink-100/60 shadow-sm">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* FEED ZONE OF USER POSTS */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Publicaciones ({posts.length})</h3>
        
        {posts.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-8">No hay publicaciones compartidas.</p>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="bg-white rounded-2xl border border-pink-50 p-4 shadow-sm text-xs space-y-3">
                <div className="flex items-center justify-between text-gray-400 text-[10px]">
                  <span>{formatTimeAgo(post.created_at, lang)}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {post.likes_count}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {post.comments_count}</span>
                  </div>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>

                {post.image_urls && post.image_urls.length > 0 && (
                  <div className="grid gap-1.5 grid-cols-2">
                    {post.image_urls.map((u, idx) => (
                      <img 
                        key={idx} 
                        src={u || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600"} 
                        alt="Post file" 
                        className="rounded-xl object-cover max-h-32 w-full"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600";
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SETTINGS GEAR MODAL DIALOG */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-pink-100 shadow-2xl space-y-5 relative max-h-[85vh] overflow-y-auto">
            <button 
              onClick={() => setShowSettings(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 bg-gray-50 p-1 rounded-full"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <h3 className="text-md font-bold text-gray-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-pink-500" />
              <span>Ajustes y Privacidad</span>
            </h3>

            {/* Language selection switcher */}
            <div className="bg-pink-50/40 p-4 rounded-2xl border border-pink-100/60 space-y-2">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-pink-500" />
                Idioma de la Aplicación
              </span>
              <p className="text-[10px] text-gray-400">Cambia por completo el idioma del panel de Bloom al instante.</p>
              
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { code: 'es', label: 'Español' },
                  { code: 'en', label: 'English' },
                  { code: 'ru', label: 'Русский' },
                  { code: 'de', label: 'Deutsch' }
                ].map(l => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                      lang === l.code 
                        ? 'bg-pink-500 border-pink-500 text-white shadow-sm' 
                        : 'bg-white border-gray-100 text-gray-600 hover:border-pink-200'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Block list trigger */}
            <button 
              onClick={handleLoadBlocked}
              className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 text-xs font-bold text-gray-700 text-left flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Ban className="w-4.5 h-4.5 text-pink-500" />
                <span>{t.blockedList}</span>
              </span>
              <span>➔</span>
            </button>

            {/* Bug report trigger */}
            <button 
              onClick={() => {
                setShowBugReport(true);
                setShowSettings(false);
              }}
              className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 text-xs font-bold text-gray-700 text-left flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-4.5 h-4.5 text-pink-500" />
                <span>{t.reportBug}</span>
              </span>
              <span>➔</span>
            </button>

            {/* Account privacy agreements */}
            <div className="bg-gray-50 p-4 rounded-2xl space-y-2 text-[10px] text-gray-500">
              <span className="font-bold text-gray-700 block text-xs">Políticas y Términos</span>
              <p>Bloom es una marca premium registrada de RUIWORKS. Cumplimos rigurosamente con RGPD y LOPD protegiendo todas las interacciones geográficas mediante encriptación SSL.</p>
              <div className="flex gap-2">
                <span className="underline cursor-pointer">Acuerdo de usuario</span>
                <span>•</span>
                <span className="underline cursor-pointer">Seguridad</span>
              </div>
            </div>

            {/* RUIWORKS Mechanical Key Branding Footer */}
            <div className="text-center py-2 border-t border-gray-100 flex flex-col items-center justify-center">
              <span className="text-pink-600 font-extrabold text-[10px] tracking-widest flex items-center gap-1 uppercase">
                <span>{t.madeBy}</span>
                <span>🛠️</span>
              </span>
              <span className="text-[9px] text-gray-400 mt-0.5">Versión de la app: 1.2.0 (Premium)</span>
            </div>

            {/* Logout button */}
            <button 
              onClick={onLogout}
              className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors border border-red-100"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.logout}</span>
            </button>

          </div>
        </div>
      )}

      {/* EDIT PROFILE DIALOG */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-pink-100 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <button 
              onClick={() => setShowEdit(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 bg-gray-50 p-1 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-md font-bold text-gray-800">Editar Perfil Bloom</h3>

            {errorText && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorText}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Nombre</label>
                <input 
                  type="text" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full p-2.5 border border-pink-50 rounded-xl text-xs focus:ring-2 focus:ring-pink-300 focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Apellido</label>
                <input 
                  type="text" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full p-2.5 border border-pink-50 rounded-xl text-xs focus:ring-2 focus:ring-pink-300 focus:outline-none" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Nombre de usuario</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2.5 border border-pink-50 rounded-xl text-xs focus:ring-2 focus:ring-pink-300 focus:outline-none" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Fecha de Nacimiento</label>
              <input 
                type="date" 
                value={birthdate} 
                onChange={(e) => setBirthdate(e.target.value)}
                className="w-full p-2.5 border border-pink-50 rounded-xl text-xs focus:ring-2 focus:ring-pink-300 focus:outline-none" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Biografía (Máx 180 chars)</label>
              <textarea 
                maxLength={180}
                value={bio} 
                onChange={(e) => setBio(e.target.value)}
                className="w-full p-2.5 border border-pink-50 rounded-xl text-xs h-20 resize-none focus:ring-2 focus:ring-pink-300 focus:outline-none" 
              />
            </div>

            {/* Busco & Estado Emocional Premium Grids */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 mb-2 uppercase tracking-wider">¿Qué buscas en Bloom?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1 border border-pink-50 rounded-2xl bg-pink-50/10">
                  {LOOKING_FOR_OPTIONS.map(opt => {
                    const isSelected = lookingFor === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setLookingFor(opt.value)}
                        className={`flex items-start text-left p-2 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-pink-500/5 border-pink-500 ring-1 ring-pink-500/20'
                            : 'bg-white border-gray-100 hover:border-pink-200'
                        }`}
                      >
                        <span className="text-md mr-2" role="img" aria-label={opt.label}>
                          {opt.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className={`block font-bold text-[10px] ${isSelected ? 'text-pink-600' : 'text-gray-700'}`}>
                            {opt.label}
                          </span>
                          <span className="block text-[8px] text-gray-400 leading-none mt-0.5 truncate">
                            {opt.desc}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="self-center bg-pink-500 text-white rounded-full p-0.5">
                            <Check className="w-2.5 h-2.5" strokeWidth={3.5} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 mb-2 uppercase tracking-wider">Estado Emocional</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {EMOTIONAL_STATUSES.map(opt => {
                    const isSelected = emotionalStatus === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEmotionalStatus(opt.value)}
                        className={`flex items-center gap-1.5 text-left p-2 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-pink-500/5 border-pink-500 ring-1 ring-pink-500/20'
                            : 'bg-white border-gray-100 hover:border-pink-200'
                        }`}
                      >
                        <span className="text-sm" role="img" aria-label={opt.label}>
                          {opt.icon}
                        </span>
                        <span className={`block font-bold text-[9px] truncate ${isSelected ? 'text-pink-600' : 'text-gray-700'}`}>
                          {opt.label}
                        </span>
                        {isSelected && (
                          <span className="ml-auto bg-pink-500 text-white rounded-full p-0.5">
                            <Check className="w-2.5 h-2.5" strokeWidth={3.5} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* PRESET AVATARS GALLERY */}
            <div className="space-y-2 pt-2">
              <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                Selecciona un Avatar Premium o sube una foto personalizada
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-transparent">
                {PRESET_AVATARS_GALLERY.map(preset => {
                  const isSelected = avatarUrl === preset.url;
                  return (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => setAvatarUrl(preset.url)}
                      className={`relative flex-shrink-0 group rounded-2xl p-0.5 border-2 transition-all ${
                        isSelected ? 'border-pink-500 bg-pink-50' : 'border-transparent hover:scale-105'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-gray-100"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 rounded-b-2xl py-0.5 text-center">
                        <span className="text-[7px] font-bold text-white block truncate px-0.5">
                          {preset.style}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 bg-pink-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                          <Check className="w-2 h-2" strokeWidth={3.5} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* EDIT IMAGES UPLOADS */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 mb-1 uppercase">Subir Foto de Perfil</label>
                <div className="flex items-center gap-2">
                  <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-pink-100" referrerPolicy="no-referrer" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleCustomAvatarUpload}
                    className="hidden" 
                    id="edit-avatar-upload" 
                  />
                  <label htmlFor="edit-avatar-upload" className="px-2.5 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-600 text-[9px] font-bold rounded-lg cursor-pointer transition-colors border border-pink-100">
                    Cambiar
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 mb-1 uppercase">Subir Portada / Banner</label>
                <div className="flex items-center gap-2">
                  <img src={bannerUrl} alt="Banner" className="w-14 h-9 rounded object-cover border border-pink-100" referrerPolicy="no-referrer" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleCustomBannerUpload}
                    className="hidden" 
                    id="edit-banner-upload" 
                  />
                  <label htmlFor="edit-banner-upload" className="px-2.5 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-600 text-[9px] font-bold rounded-lg cursor-pointer transition-colors border border-pink-100">
                    Cambiar
                  </label>
                </div>
              </div>
            </div>

            {/* Custom hobbies selector */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Tus Gustos (#Hashtags)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ej: #lgbt, #viajes" 
                  value={customHobbyInput}
                  onChange={(e) => setCustomHobbyInput(e.target.value)}
                  className="flex-1 p-2 border border-pink-50 rounded-xl text-xs focus:ring-2 focus:ring-pink-300 focus:outline-none"
                />
                <button 
                  onClick={addCustomHobby}
                  className="px-4 py-2 bg-pink-500 text-white font-bold rounded-xl text-xs"
                >
                  +
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {gustos.map(g => (
                  <span key={g} className="bg-pink-50 text-pink-600 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border border-pink-100">
                    <span>{g}</span>
                    <button 
                      onClick={() => setGustos(gustos.filter(x => x !== g))}
                      className="text-pink-400 hover:text-pink-600 font-extrabold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button 
                onClick={handleSaveProfile}
                className="flex-1 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-xs transition-colors shadow-lg"
              >
                {t.save}
              </button>
              <button 
                onClick={() => setShowEdit(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BLOCKED USERS LIST MODAL */}
      {showBlocked && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-pink-100 shadow-2xl relative max-h-[80vh] overflow-y-auto">
            <button 
              onClick={() => setShowBlocked(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 bg-gray-50 p-1 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-gray-800 mb-4">{t.blockedList}</h3>

            <div className="space-y-2">
              {blockedList.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-6">{t.noBlocked}</p>
              ) : (
                blockedList.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2">
                      <img src={u.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                      <div className="text-[10px]">
                        <span className="font-bold text-gray-700 block">{u.first_name} {u.last_name}</span>
                        <span className="text-gray-400 block">@{u.username}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleUnblock(u.id)}
                      className="px-3 py-1 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-lg text-[9px] transition-colors"
                    >
                      {t.unblock}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* REPORT BUG DIALOG WITH CHECK ANIMATION */}
      {showBugReport && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-pink-100 shadow-2xl relative">
            <button 
              onClick={() => setShowBugReport(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 bg-gray-50 p-1 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            {!bugSubmitted ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-pink-500" />
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">{t.reportBug}</h3>
                </div>
                
                <textarea 
                  placeholder={t.bugPlaceholder}
                  value={bugText}
                  onChange={(e) => setBugText(e.target.value)}
                  className="w-full p-3 border border-pink-100 rounded-xl h-28 focus:outline-none focus:ring-2 focus:ring-pink-300 text-xs bg-gray-50/50 resize-none"
                />

                <button 
                  onClick={handleSendBug}
                  className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-extrabold rounded-2xl text-xs shadow-md"
                >
                  {t.send}
                </button>
              </div>
            ) : (
              <div className="text-center py-6 space-y-4 flex flex-col items-center justify-center">
                
                {/* CHECK ANIMATION SPHERE */}
                <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                  <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-800">¡Enviado con Éxito!</h4>
                  <p className="text-[10px] text-gray-500 mt-1">{t.bugReported}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SPECTATOR REPORT TRIGGER MODAL */}
      {showSpectatorReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-pink-100 shadow-2xl relative">
            <h4 className="text-xs font-bold text-gray-800 mb-2">Reportar a @{profile.username}</h4>
            <textarea 
              placeholder="Describe detalladamente el motivo de tu denuncia..."
              value={spectatorReportReason}
              onChange={(e) => setSpectatorReportReason(e.target.value)}
              className="w-full p-3 border border-pink-100 rounded-xl h-24 focus:outline-none focus:ring-2 focus:ring-pink-300 text-xs bg-gray-50/50 resize-none mb-4"
            />
            <div className="flex items-center gap-2">
              <button 
                onClick={handleSpectatorSendReport}
                className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-xs"
              >
                {t.report}
              </button>
              <button 
                onClick={() => {
                  setShowSpectatorReport(false);
                  setSpectatorReportReason('');
                }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
