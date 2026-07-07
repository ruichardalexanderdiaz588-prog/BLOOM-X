import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, Heart, MessageCircle, Navigation, ShieldAlert, Ban, Sparkles, 
  ChevronRight, Calendar, Info, Smile, Frown, Compass, Star, X
} from 'lucide-react';
import { Profile, Post } from '../types';
import { translations } from '../lib/translations';
import { getAllProfiles, getUserPosts, blockUser, createReport } from '../lib/supabase';
import { getDistanceKm, formatTimeAgo, DEFAULT_BANNERS } from '../lib/utils';

interface ConectaMapProps {
  currentProfile: Profile;
  lang: string;
  onVisitProfile: (userId: string) => void;
  onStartChat: (userId: string) => void;
  onBlockUser: (targetId: string) => void;
  refreshTrigger: number;
}

export default function ConectaMap({ 
  currentProfile, lang, onVisitProfile, onStartChat, onBlockUser, refreshTrigger 
}: ConectaMapProps) {
  const t = translations[lang] || translations['es'];
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedUserPosts, setSelectedUserPosts] = useState<Post[]>([]);
  
  // Dialogs
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    const loadProfiles = async () => {
      setLoading(true);
      const data = await getAllProfiles(currentProfile.id);
      setProfiles(data);
      setLoading(false);
    };
    loadProfiles();
  }, [currentProfile.id, refreshTrigger]);

  const handleSelectUser = async (user: Profile) => {
    setSelectedUser(user);
    // Fetch up to 4 posts to see if we have more than 3 (to show blur and "Ver más" button)
    const posts = await getUserPosts(user.id);
    setSelectedUserPosts(posts);
  };

  const handleBlock = async () => {
    if (!selectedUser) return;
    await blockUser(currentProfile.id, selectedUser.id);
    onBlockUser(selectedUser.id);
    setProfiles(profiles.filter(p => p.id !== selectedUser.id));
    setSelectedUser(null);
  };

  const handleReport = async () => {
    if (!selectedUser || !reportReason.trim()) return;
    
    await createReport({
      reporter_id: currentProfile.id,
      reported_user_id: selectedUser.id,
      reason: reportReason
    });

    alert('Reporte enviado exitosamente. Se ha copiado la notificación para richardalexanderdiaz0@gmail.com');
    setShowReport(false);
    setReportReason('');
  };

  // Helper to determine distance badge and styles
  const getDistanceDetails = (user: Profile) => {
    const km = getDistanceKm(
      currentProfile.location_lat, 
      currentProfile.location_lng, 
      user.location_lat, 
      user.location_lng
    );

    if (km === null) {
      return {
        kmStr: "Oculta",
        label: t.neutral,
        color: "bg-gray-100 text-gray-600",
        icon: '🧭'
      };
    }

    if (km <= 5) {
      return {
        kmStr: `${km} km`,
        label: t.veryClose,
        color: "bg-red-500 text-white animate-pulse",
        icon: '🔥'
      };
    } else if (km <= 15) {
      return {
        kmStr: `${km} km`,
        label: t.close,
        color: "bg-pink-500 text-white",
        icon: '💖'
      };
    } else if (km <= 100) {
      return {
        kmStr: `${km} km`,
        label: t.neutral,
        color: "bg-pink-100 text-pink-700",
        icon: '😏'
      };
    } else {
      return {
        kmStr: `${km} km`,
        label: t.far,
        color: "bg-gray-200 text-gray-600",
        icon: '😢'
      };
    }
  };

  // Check if profile is new (joined in last 2 days)
  const isNewInBloom = (joinedAt: string) => {
    try {
      const d = new Date(joinedAt);
      const diffMs = new Date().getTime() - d.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays <= 2;
    } catch {
      return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 grid grid-cols-1 md:grid-cols-12 gap-6">
      
      {/* MAP & EXPLORE CONTAINER */}
      <div className="md:col-span-7 space-y-4">
        <div className="bg-white rounded-3xl border border-pink-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-md font-bold text-gray-800 flex items-center gap-2">
              <Compass className="w-5 h-5 text-pink-500 animate-spin" style={{ animationDuration: '6s' }} />
              <span>{t.conectaTitle}</span>
            </h2>
            <span className="text-xs bg-pink-50 text-pink-600 px-3 py-1 rounded-full font-bold">
              {profiles.length} Activos
            </span>
          </div>

          {/* DYNAMIC VISUAL INTERACTIVE RADAR STAGE */}
          <div className="relative w-full h-80 bg-pink-50/50 rounded-2xl overflow-hidden border border-pink-100/60 flex items-center justify-center">
            
            {/* Pulsing center radar circles */}
            <div className="absolute w-64 h-64 border border-pink-200/50 rounded-full animate-ping opacity-25" style={{ animationDuration: '3s' }} />
            <div className="absolute w-44 h-44 border border-pink-200/70 rounded-full opacity-40" />
            <div className="absolute w-24 h-24 border border-pink-300/40 rounded-full opacity-60" />
            
            {/* Radar scanner sweep line */}
            <div className="absolute inset-0 bg-gradient-to-tr from-pink-300/10 via-transparent to-transparent origin-center animate-spin" style={{ animationDuration: '8s' }} />

            {/* Current user center point */}
            <div className="absolute z-10 flex flex-col items-center">
              <div className="relative">
                <img 
                  src={currentProfile.avatar_url} 
                  alt="Me" 
                  className="w-10 h-10 rounded-full border-2 border-pink-500 object-cover shadow-md"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <span className="text-[10px] font-bold text-pink-700 bg-white/90 px-2 py-0.5 rounded-full border border-pink-100 mt-1 shadow-sm">
                Tú
              </span>
            </div>

            {/* FLOATING USER NODES ON MAP */}
            {profiles.map((p, idx) => {
              // Calculate semi-randomized polar angles and coordinates derived from their database coordinates or index
              const angle = (idx * 57 + 35) % 360;
              const radius = 35 + ((idx * 23 + 40) % 95); // radius % from center
              
              const xVal = Math.cos((angle * Math.PI) / 180) * radius;
              const yVal = Math.sin((angle * Math.PI) / 180) * radius;

              return (
                <motion.button
                  key={p.id}
                  onClick={() => handleSelectUser(p)}
                  className="absolute z-20 hover:scale-125 transition-transform cursor-pointer"
                  style={{
                    transform: `translate(${xVal}px, ${yVal}px)`
                  }}
                  whileHover={{ y: -5 }}
                >
                  <div className="relative">
                    <img 
                      src={p.avatar_url || 'https://via.placeholder.com/150'} 
                      alt={p.username} 
                      className={`w-9 h-9 rounded-full object-cover border-2 shadow-md ${
                        selectedUser?.id === p.id 
                          ? 'border-pink-600 scale-110 shadow-pink-200' 
                          : 'border-white'
                      }`}
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150";
                      }}
                    />
                    {isNewInBloom(p.created_at) && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-pink-500 rounded-full border border-white" />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
          
          <p className="text-[10px] text-gray-400 text-center mt-3">
            📍 El radar de Bloom muestra a las personas más cercanas de tu región flotando de manera interactiva.
          </p>
        </div>

        {/* LIST ALTERNATIVE */}
        <div className="bg-white rounded-3xl border border-pink-100 p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Explorar Lista</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {profiles.map((p) => {
              const dInfo = getDistanceDetails(p);
              return (
                <div 
                  key={p.id} 
                  onClick={() => handleSelectUser(p)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedUser?.id === p.id 
                      ? 'bg-pink-50/50 border-pink-300' 
                      : 'bg-gray-50/50 border-gray-100 hover:border-pink-200 hover:bg-pink-50/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={p.avatar_url} 
                      alt={p.username} 
                      className="w-10 h-10 rounded-full object-cover border border-pink-100 shadow-sm" 
                    />
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                        <span>{p.first_name} {p.last_name}</span>
                        {p.zodiac_icon && <span>{p.zodiac_icon}</span>}
                      </div>
                      <span className="text-[10px] text-gray-400">@{p.username}</span>
                    </div>
                  </div>
                  
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-xs font-bold text-pink-600">{dInfo.kmStr}</span>
                    <span className="text-[9px] text-gray-400">{p.location_name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FLOAT PREMIUM CARD (SIDEBAR IN DESKTOP, FLOATING MODAL OVERLAY IN MOBILE) */}
      <div className="md:col-span-5">
        <AnimatePresence>
          {selectedUser ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-white rounded-3xl border border-pink-200/80 shadow-xl overflow-hidden sticky top-24"
            >
              
              {/* BRAND HEADER BANNER */}
              <div className="bg-gradient-to-r from-pink-500 to-rose-400 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-white text-white" />
                  <span className="text-xs font-extrabold tracking-wider">BLOOM PREMIUM</span>
                </div>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="text-white hover:bg-white/10 p-1 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* USER COVER BANNER */}
              <div className="h-28 relative">
                <img 
                  src={selectedUser.banner_url || DEFAULT_BANNERS[0]} 
                  alt="Banner" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                
                {/* Distance indicators overlay */}
                <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                  {isNewInBloom(selectedUser.created_at) && (
                    <span className="bg-rose-500 text-white text-[9px] font-extrabold px-2.5 py-1 rounded-full shadow-sm">
                      {t.conectaBadgeNew}
                    </span>
                  )}
                  <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 ${getDistanceDetails(selectedUser).color}`}>
                    <span>{getDistanceDetails(selectedUser).icon}</span>
                    <span>{getDistanceDetails(selectedUser).label}</span>
                  </span>
                </div>
              </div>

              {/* CARD DETAILS */}
              <div className="p-5 relative">
                
                {/* User photo offset */}
                <div className="absolute -top-12 left-5">
                  <img 
                    src={selectedUser.avatar_url} 
                    alt={selectedUser.username} 
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                  />
                </div>

                <div className="pt-8 space-y-4">
                  
                  {/* Name and Zodiac */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-800">
                        {selectedUser.first_name} {selectedUser.last_name}
                      </h3>
                      {selectedUser.zodiac_icon && (
                        <span className="text-lg" title={`Zodiac: ${selectedUser.zodiac}`}>{selectedUser.zodiac_icon}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <span>@{selectedUser.username}</span>
                      <span>•</span>
                      <span>{selectedUser.gender}</span>
                    </div>
                  </div>

                  {/* Distance details row */}
                  <div className="bg-pink-50/40 p-3.5 rounded-2xl border border-pink-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-pink-500 shrink-0" />
                      <div>
                        <span className="text-gray-500 block">Lugar Aproximado</span>
                        <strong className="text-gray-800">{selectedUser.location_name}, {selectedUser.country}</strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500 block">Distancia</span>
                      <strong className="text-pink-600 text-sm font-extrabold">
                        {getDistanceDetails(selectedUser).kmStr}
                      </strong>
                    </div>
                  </div>

                  {/* Looking for / status */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[9px] uppercase font-semibold">Busca</span>
                      <strong className="text-gray-700">{selectedUser.looking_for || 'Amistad'}</strong>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[9px] uppercase font-semibold">Estado Emocional</span>
                      <strong className="text-gray-700">{selectedUser.emotional_status}</strong>
                    </div>
                  </div>

                  {/* Bio */}
                  {selectedUser.bio && (
                    <div className="text-xs text-gray-600 bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                      <p className="italic">"{selectedUser.bio}"</p>
                    </div>
                  )}

                  {/* Gustos */}
                  {selectedUser.gustos && selectedUser.gustos.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedUser.gustos.map(g => (
                        <span key={g} className="bg-pink-50 text-pink-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-pink-100">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* LAST POSTS (MAX 3) */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <span className="text-xs font-bold text-gray-700 block">Publicaciones de @{selectedUser.username}</span>
                    
                    {selectedUserPosts.length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic">No hay publicaciones disponibles.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedUserPosts.slice(0, 3).map((post, idx) => (
                          <div 
                            key={post.id} 
                            className="text-[11px] bg-gray-50 p-2 rounded-xl border border-gray-100 flex items-center justify-between gap-3"
                          >
                            <span className="text-gray-600 line-clamp-1">{post.content}</span>
                            <span className="text-[9px] text-gray-400 shrink-0">{formatTimeAgo(post.created_at, lang)}</span>
                          </div>
                        ))}

                        {/* Blur overlay if posts count > 3 */}
                        {selectedUserPosts.length > 3 && (
                          <div className="relative pt-1 text-center">
                            <div className="bg-gradient-to-t from-white via-white/80 to-transparent absolute inset-x-0 -top-8 h-12" />
                            <button 
                              onClick={() => onVisitProfile(selectedUser.id)}
                              className="w-full py-2 bg-pink-100 hover:bg-pink-200 text-pink-700 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1"
                            >
                              <span>{t.viewMorePosts.replace('{name}', selectedUser.first_name)}</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* PRIVATE CHAT TRIGGER */}
                  <div className="pt-2 flex gap-2">
                    <button 
                      onClick={() => onStartChat(selectedUser.id)}
                      className="flex-1 py-3 bg-pink-500 hover:bg-pink-600 text-white font-extrabold rounded-2xl shadow-lg shadow-pink-100 text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>{t.sendMessage}</span>
                    </button>

                    <button 
                      onClick={() => onVisitProfile(selectedUser.id)}
                      className="px-4 py-3 border border-pink-200 hover:bg-pink-50 text-pink-500 font-bold rounded-2xl text-xs transition-all"
                    >
                      Perfil
                    </button>
                  </div>

                  {/* REPORT / BLOCK FOOTER */}
                  <div className="flex items-center justify-between text-[10px] text-gray-400 pt-3 border-t border-gray-100">
                    <button 
                      onClick={() => setShowReport(true)}
                      className="hover:text-rose-600 flex items-center gap-1 font-semibold"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Reportar</span>
                    </button>
                    <button 
                      onClick={handleBlock}
                      className="hover:text-red-600 flex items-center gap-1 font-semibold"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Bloquear</span>
                    </button>
                  </div>

                </div>
              </div>

            </motion.div>
          ) : (
            <div className="bg-pink-50 border border-dashed border-pink-200 rounded-3xl p-8 text-center text-xs text-gray-400 flex flex-col items-center justify-center h-80">
              <Compass className="w-12 h-12 text-pink-300 mb-2 animate-bounce" />
              <span>Toca a alguien en el radar o en la lista para ver su tarjeta de Bloom Premium.</span>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* REPORT CONECTA DIALOG */}
      {showReport && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-pink-100 shadow-2xl">
            <h3 className="text-md font-bold text-gray-800 mb-2">Reportar a @{selectedUser.username}</h3>
            <p className="text-xs text-gray-500 mb-3">Escribe el motivo del reporte. Este será notificado inmediatamente.</p>
            <textarea 
              placeholder="Ej. Comportamiento inadecuado, información falsa..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full p-3 border border-pink-100 rounded-xl h-24 focus:outline-none focus:ring-2 focus:ring-pink-300 text-xs bg-gray-50/50 resize-none mb-4"
            />
            <div className="flex items-center gap-3">
              <button 
                onClick={handleReport}
                className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-xs transition-colors"
              >
                {t.report}
              </button>
              <button 
                onClick={() => {
                  setShowReport(false);
                  setReportReason('');
                }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
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
