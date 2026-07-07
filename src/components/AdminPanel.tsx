import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, ShieldCheck, Trash2, Ban, Mail, Bug, 
  MessageSquare, UserX, UserCheck, AlertTriangle, HelpCircle
} from 'lucide-react';
import { Profile, Report, Feedback } from '../types';
import { 
  getAllReports, deleteReport, getAllFeedback, deleteFeedback, 
  banProfile, deletePost as deletePostDb 
} from '../lib/supabase';

interface AdminPanelProps {
  currentProfile: Profile;
  lang: string;
}

export default function AdminPanel({ currentProfile, lang }: AdminPanelProps) {
  // Security verification
  const isAdmin = currentProfile.username === 'richardalexanderdiaz0' || currentProfile.first_name.toLowerCase().includes('richard');

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
        <h2 className="text-lg font-bold text-gray-800">Acceso Restringido</h2>
        <p className="text-xs text-gray-500">Este panel es de uso exclusivo para Richard Alexander Díaz (Administrador Principal de Bloom).</p>
      </div>
    );
  }

  const [reports, setReports] = useState<Report[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    const repData = await getAllReports();
    const feedData = await getAllFeedback();
    setReports(repData);
    setFeedback(feedData);
    setLoading(false);
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleDismissReport = async (reportId: string) => {
    const success = await deleteReport(reportId);
    if (success) {
      setReports(reports.filter(r => r.id !== reportId));
    }
  };

  const handleBanUser = async (targetUserId: string, reportId?: string) => {
    const confirmBan = window.confirm(`¿Estás seguro de que deseas bannear permanentemente a este usuario? Se eliminará su perfil y todas sus publicaciones de Bloom.`);
    if (!confirmBan) return;

    const success = await banProfile(targetUserId);
    if (success) {
      alert("Usuario banneado con éxito.");
      if (reportId) {
        await deleteReport(reportId);
        setReports(reports.filter(r => r.id !== reportId));
      } else {
        fetchAdminData();
      }
    }
  };

  const handleDeletePost = async (postId: string, reportId: string) => {
    const confirmDelete = window.confirm("¿Seguro de que deseas eliminar permanentemente esta publicación?");
    if (!confirmDelete) return;

    const success = await deletePostDb(postId);
    if (success) {
      await deleteReport(reportId);
      setReports(reports.filter(r => r.id !== reportId));
      alert("Publicación eliminada.");
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    const success = await deleteFeedback(id);
    if (success) {
      setFeedback(feedback.filter(f => f.id !== id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      
      {/* HEADER SUMMARY */}
      <div className="bg-gradient-to-r from-pink-600 to-rose-500 rounded-3xl p-6 text-white shadow-lg shadow-pink-100 flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
            <span className="text-xs uppercase font-extrabold tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">
              Consola de Administrador
            </span>
          </div>
          <h2 className="text-xl font-extrabold">¡Bienvenido, Richard Alexander Díaz!</h2>
          <p className="text-[10px] text-white/80">Gestiona reportes, bloqueos globales y sugerencias de errores en tiempo real.</p>
        </div>

        <div className="flex gap-4">
          <div className="bg-white/10 px-4 py-2.5 rounded-2xl text-center border border-white/20 min-w-[100px]">
            <span className="text-[10px] uppercase font-bold text-pink-200 block">Reportes</span>
            <strong className="text-xl">{reports.length}</strong>
          </div>
          <div className="bg-white/10 px-4 py-2.5 rounded-2xl text-center border border-white/20 min-w-[100px]">
            <span className="text-[10px] uppercase font-bold text-pink-200 block">Bugs/Feedback</span>
            <strong className="text-xl">{feedback.length}</strong>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-gray-500 text-xs">Cargando consola de seguridad...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* USER REPORTS SECTION */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Reportes de Comportamiento ({reports.length})</span>
            </h3>

            {reports.length === 0 ? (
              <div className="bg-white border border-pink-50 rounded-2xl p-8 text-center text-xs text-gray-400">
                ✅ Todo despejado. No hay denuncias pendientes de revisión.
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((rep) => {
                  const reporter = rep.reporter_profile;
                  const target = rep.reported_profile;
                  if (!target) return null;

                  return (
                    <div key={rep.id} className="bg-white rounded-3xl border border-rose-100 p-5 shadow-sm space-y-4">
                      
                      <div className="flex items-start justify-between flex-wrap gap-2 text-xs border-b border-gray-100 pb-3">
                        <div>
                          <span className="text-rose-500 font-bold block uppercase text-[9px] tracking-wider mb-1">
                            Motivo del reporte
                          </span>
                          <p className="text-gray-700 italic">"{rep.reason}"</p>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {new Date(rep.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-[10px]">
                        <div className="bg-gray-50 p-2.5 rounded-xl">
                          <span className="text-gray-400 block font-bold uppercase mb-1">Denunciante</span>
                          {reporter ? (
                            <div className="flex items-center gap-1.5">
                              <img src={reporter.avatar_url} className="w-5 h-5 rounded-full" />
                              <strong className="text-gray-700 truncate">{reporter.first_name} (@{reporter.username})</strong>
                            </div>
                          ) : (
                            <span className="text-gray-400 font-semibold">Anónimo</span>
                          )}
                        </div>

                        <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/50">
                          <span className="text-rose-600 block font-bold uppercase mb-1">Acusado/Reportado</span>
                          <div className="flex items-center gap-1.5">
                            <img src={target.avatar_url} className="w-5 h-5 rounded-full" />
                            <strong className="text-gray-800 truncate">{target.first_name} (@{target.username})</strong>
                          </div>
                        </div>
                      </div>

                      {/* Post referenced if any */}
                      {rep.post_id && (
                        <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-100/60 text-[10px]">
                          <span className="font-semibold text-amber-800 block mb-0.5">Publicación Referenciada:</span>
                          <p className="text-gray-600 line-clamp-2">ID: {rep.post_id}</p>
                        </div>
                      )}

                      {/* Control buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button 
                          onClick={() => handleDismissReport(rep.id)}
                          className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Descartar Reporte</span>
                        </button>

                        {rep.post_id && (
                          <button 
                            onClick={() => handleDeletePost(rep.post_id!, rep.id)}
                            className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[10px] rounded-lg transition-colors"
                            title="Eliminar Post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button 
                          onClick={() => handleBanUser(target.id, rep.id)}
                          className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Bannear @{target.username}</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SUGGESTIONS & BUGS SECTION */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <Bug className="w-4 h-4 text-pink-500 animate-bounce" />
              <span>Bugs y Sugerencias ({feedback.length})</span>
            </h3>

            {feedback.length === 0 ? (
              <div className="bg-white border border-pink-50 rounded-2xl p-8 text-center text-xs text-gray-400">
                🛠️ No hay reportes de errores pendientes. Todo funciona con perfección.
              </div>
            ) : (
              <div className="space-y-3">
                {feedback.map((feed) => (
                  <div key={feed.id} className="bg-white rounded-2xl border border-pink-50 p-4 shadow-sm text-xs space-y-2 relative group">
                    <button 
                      onClick={() => handleDeleteFeedback(feed.id)}
                      className="absolute top-3 right-3 text-gray-300 hover:text-red-500 scale-0 group-hover:scale-100 transition-transform cursor-pointer"
                      title="Eliminar Reporte"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
                      <Mail className="w-3.5 h-3.5 text-pink-400" />
                      <span>{feed.user_email}</span>
                      <span>•</span>
                      <span>{new Date(feed.created_at).toLocaleDateString()}</span>
                    </div>

                    <p className="text-gray-700 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 whitespace-pre-wrap">
                      {feed.error_text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
