import React, { useState, useEffect } from 'react';
import { 
  Heart, MessageCircle, Share2, MoreVertical, Trash2, Edit3, 
  BarChart2, ShieldAlert, Ban, Search, Send, X, CornerDownRight, Check
} from 'lucide-react';
import { Profile, Post, Comment } from '../types';
import { translations } from '../lib/translations';
import { 
  getPosts, toggleLikePost, incrementShares, deletePost as deletePostDb, 
  updatePost, getComments, addComment, deleteComment 
} from '../lib/supabase';
import { formatTimeAgo } from '../lib/utils';

interface HomeFeedProps {
  currentProfile: Profile;
  lang: string;
  onVisitProfile: (userId: string) => void;
  onBlockUser: (targetId: string) => void;
  onReport: (reportData: { reportedUserId: string; postId?: string; reason: string }) => void;
  // Trigger update across tabs
  refreshTrigger: number;
}

export default function HomeFeed({ 
  currentProfile, lang, onVisitProfile, onBlockUser, onReport, refreshTrigger 
}: HomeFeedProps) {
  const t = translations[lang] || translations['es'];
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Comments State
  const [activePostComments, setActivePostComments] = useState<string | null>(null);
  const [commentsList, setCommentsList] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);

  // Post Actions State
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showMenuId, setShowMenuId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showBlockPrompt, setShowBlockPrompt] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAllPosts = async () => {
    setLoading(true);
    const data = await getPosts(currentProfile.id, searchQuery);
    setPosts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllPosts();
  }, [currentProfile.id, searchQuery, refreshTrigger]);

  const handleLike = async (post: Post) => {
    // Optimistic UI update
    const isLiked = post.likes.includes(currentProfile.id);
    const updatedLikes = isLiked 
      ? post.likes.filter(id => id !== currentProfile.id)
      : [...post.likes, currentProfile.id];
      
    setPosts(posts.map(p => p.id === post.id ? { 
      ...p, 
      likes: updatedLikes, 
      likes_count: updatedLikes.length 
    } : p));

    // Persist to DB
    await toggleLikePost(post.id, currentProfile.id);
  };

  const handleShare = async (post: Post) => {
    const shareText = `Mira mi publicación en BLOOM😍✨️: ${post.content || ''}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'BLOOM',
          text: shareText,
          url: window.location.href, // Or a specific post URL if you have one
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopiedId(post.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (e) {
      console.error('Failed to share/copy', e);
    }
    
    // Update count
    setPosts(posts.map(p => p.id === post.id ? { ...p, shares_count: p.shares_count + 1 } : p));
    await incrementShares(post.id, currentProfile.id);
  };

  const handleOpenComments = async (postId: string) => {
    if (activePostComments === postId) {
      setActivePostComments(null);
      setCommentsList([]);
    } else {
      setActivePostComments(postId);
      const comments = await getComments(postId);
      setCommentsList(comments);
    }
  };

  const handleSendComment = async (postId: string) => {
    if (!newCommentText.trim()) return;
    
    const newComment: Partial<Comment> = {
      post_id: postId,
      user_id: currentProfile.id,
      content: newCommentText,
      parent_id: replyingToCommentId // supports nested replies
    };

    // Optimistic comment
    const optComment: Comment = {
      id: 'opt_' + Math.random(),
      post_id: postId,
      user_id: currentProfile.id,
      content: newCommentText,
      parent_id: replyingToCommentId,
      created_at: new Date().toISOString(),
      profiles: currentProfile
    };

    setCommentsList([...commentsList, optComment]);
    setNewCommentText('');
    setReplyingToCommentId(null);

    // Save in DB
    const saved = await addComment(newComment);
    if (saved) {
      // Reload actual comments and update posts count
      const updatedComments = await getComments(postId);
      setCommentsList(updatedComments);
      setPosts(posts.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
    }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    setCommentsList(commentsList.filter(c => c.id !== commentId));
    const success = await deleteComment(commentId, postId);
    if (success) {
      setPosts(posts.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p));
    }
  };

  const handleDeletePost = async (post: Post) => {
    setPosts(posts.filter(p => p.id !== post.id));
    await deletePostDb(post.id);
    setShowMenuId(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedPost || !editContent.trim()) return;
    const updated = await updatePost(selectedPost.id, { content: editContent });
    if (updated) {
      setPosts(posts.map(p => p.id === selectedPost.id ? { ...p, content: editContent } : p));
      setShowEdit(false);
      setSelectedPost(null);
      setShowMenuId(null);
    }
  };

  const handleSendReport = () => {
    if (!selectedPost || !reportReason.trim()) return;
    onReport({
      reportedUserId: selectedPost.user_id,
      postId: selectedPost.id,
      reason: reportReason
    });
    setShowReport(false);
    setReportReason('');
    setShowMenuId(null);
    alert('Reporte enviado con éxito al panel de administración.');
  };

  const handleConfirmBlock = () => {
    if (!selectedPost) return;
    onBlockUser(selectedPost.user_id);
    setPosts(posts.filter(p => p.user_id !== selectedPost.user_id));
    setShowBlockPrompt(false);
    setSelectedPost(null);
    setShowMenuId(null);
  };

  return (
    <div className="max-w-xl mx-auto py-6 px-4 space-y-6">
      
      {/* SEARCH BAR */}
      <div className="relative">
        <span className="absolute left-4 top-3.5 text-pink-400">
          <Search className="w-5 h-5" />
        </span>
        <input 
          type="text" 
          placeholder={t.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-pink-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 shadow-sm"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* FEED LIST */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-gray-500 text-xs">{t.loading}</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-pink-50 p-8 shadow-sm">
          <Ban className="w-12 h-12 text-pink-300 mx-auto mb-3" />
          <p className="text-gray-600 font-bold mb-1">{t.noResults}</p>
          <p className="text-gray-400 text-xs">Intenta buscando otros temas o sube tu propia publicación.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => {
            const author = post.profiles;
            if (!author) return null;
            const isLiked = post.likes.includes(currentProfile.id);
            const isMyPost = post.user_id === currentProfile.id;

            return (
              <div key={post.id} className="bg-white rounded-3xl border border-pink-100/60 shadow-sm hover:shadow-md transition-shadow p-5 relative">
                
                {/* POST AUTHOR HEADER */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={author.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=60'} 
                      alt="Avatar" 
                      onClick={() => onVisitProfile(author.id)}
                      className="w-11 h-11 rounded-full object-cover border border-pink-100 shadow-sm cursor-pointer hover:opacity-90"
                      onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=60'; }}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span 
                          onClick={() => onVisitProfile(author.id)}
                          className="font-bold text-gray-800 text-sm cursor-pointer hover:text-pink-600"
                        >
                          {author.first_name} {author.last_name}
                        </span>
                        {author.zodiac_icon && (
                          <span className="text-xs" title={author.zodiac}>{author.zodiac_icon}</span>
                        )}
                        {author.gender_icon && (
                          <span className="text-xs" title={author.gender}>{author.gender_icon}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                        <span>@{author.username}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(post.created_at, lang)}</span>
                        {author.country && (
                          <>
                            <span>•</span>
                            <span className="text-pink-400 font-semibold">{author.country}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ACTION TRIGGER BUTTON */}
                  <div className="relative">
                    <button 
                      onClick={() => setShowMenuId(showMenuId === post.id ? null : post.id)}
                      className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-600"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {/* THREE DOTS ACTIONS DROPDOWN */}
                    {showMenuId === post.id && (
                      <div className="absolute right-0 top-8 bg-white border border-pink-100 rounded-2xl shadow-xl py-2 w-48 z-10 text-xs">
                        {isMyPost ? (
                          <>
                            <button 
                              onClick={() => {
                                setSelectedPost(post);
                                setEditContent(post.content);
                                setShowEdit(true);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-pink-50 flex items-center gap-2 text-gray-700"
                            >
                              <Edit3 className="w-4 h-4 text-pink-500" />
                              <span>{t.edit}</span>
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedPost(post);
                                setShowStats(true);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-pink-50 flex items-center gap-2 text-gray-700"
                            >
                              <BarChart2 className="w-4 h-4 text-pink-500" />
                              <span>Estadísticas</span>
                            </button>
                            <button 
                              onClick={() => handleDeletePost(post)}
                              className="w-full px-4 py-2.5 text-left hover:bg-red-50 flex items-center gap-2 text-red-600 font-bold border-t border-gray-50 mt-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>{t.delete}</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => {
                                setSelectedPost(post);
                                setShowReport(true);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-pink-50 flex items-center gap-2 text-gray-700"
                            >
                              <ShieldAlert className="w-4 h-4 text-rose-500" />
                              <span>Reportar Publicación</span>
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedPost(post);
                                setShowBlockPrompt(true);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-red-50 flex items-center gap-2 text-red-600 font-semibold"
                            >
                              <Ban className="w-4 h-4" />
                              <span>{t.block} @{author.username}</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* POST CONTENT */}
                <div className="space-y-3 mb-4">
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{post.content}</p>
                  
                  {/* IMAGES COLLAGE */}
                  {post.image_urls && post.image_urls.length > 0 && (
                    <div className={`grid gap-2 ${post.image_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {post.image_urls.map((url, idx) => (
                        <div key={idx} className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-video border border-pink-50">
                          <img 
                            src={url || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600"} 
                            alt={`Post attachment ${idx + 1}`} 
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              // Prevent broken preview boxes
                              e.currentTarget.src = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600";
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* HASHTAGS */}
                  {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {post.hashtags.map(h => (
                        <span 
                          key={h} 
                          onClick={() => setSearchQuery(h)}
                          className="text-xs font-bold text-pink-600 hover:underline cursor-pointer bg-pink-50 px-2 py-0.5 rounded-full"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ACTIONS COUNTERS AND BUTTONS */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400">
                  <button 
                    onClick={() => handleLike(post)}
                    className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition-all ${
                      isLiked ? 'text-pink-600 font-bold bg-pink-50' : 'hover:text-pink-600 hover:bg-pink-50/40'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-pink-600 text-pink-600' : ''}`} />
                    <span>{post.likes_count}</span>
                  </button>

                  <button 
                    onClick={() => handleOpenComments(post.id)}
                    className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition-all ${
                      activePostComments === post.id ? 'text-pink-600 font-bold bg-pink-50' : 'hover:text-pink-600 hover:bg-pink-50/40'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.comments_count}</span>
                  </button>

                  <button 
                    onClick={() => handleShare(post)}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl hover:text-pink-600 hover:bg-pink-50/40 transition-all"
                  >
                    {copiedId === post.id ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-500 font-bold">{t.copied}</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>{post.shares_count}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* COMMENTS SECTION */}
                {activePostComments === post.id && (
                  <div className="border-t border-gray-100 mt-4 pt-4 space-y-4">
                    {commentsList.length > 0 && (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {commentsList.map((comment) => {
                          const cUser = comment.profiles;
                          if (!cUser) return null;
                          return (
                            <div key={comment.id} className="text-xs bg-gray-50/60 p-3 rounded-2xl border border-gray-100/50">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <img 
                                    src={cUser.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=60'} 
                                    alt="Comment Avatar" 
                                    className="w-6 h-6 rounded-full object-cover shadow-sm cursor-pointer"
                                    onClick={() => onVisitProfile(cUser.id)}
                                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=60'; }}
                                  />
                                  <span 
                                    onClick={() => onVisitProfile(cUser.id)}
                                    className="font-bold text-gray-700 cursor-pointer hover:text-pink-600"
                                  >
                                    {cUser.first_name} {cUser.last_name}
                                  </span>
                                  <span className="text-gray-400">@{cUser.username}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-gray-400">{formatTimeAgo(comment.created_at, lang)}</span>
                                  {(comment.user_id === currentProfile.id || isMyPost) && (
                                    <button 
                                      onClick={() => handleDeleteComment(comment.id, post.id)}
                                      className="text-gray-400 hover:text-rose-500"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-gray-600 ml-8 whitespace-pre-wrap">{comment.content}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* SEND COMMENT BAR */}
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        placeholder={t.writeComment}
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendComment(post.id);
                        }}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-pink-300"
                      />
                      <button 
                        onClick={() => handleSendComment(post.id)}
                        className="bg-pink-500 hover:bg-pink-600 text-white p-2 rounded-xl transition-all shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* STATS DIALOG BOX */}
      {showStats && selectedPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-pink-100 shadow-2xl relative">
            <button 
              onClick={() => {
                setShowStats(false);
                setSelectedPost(null);
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 bg-gray-50 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-md font-bold text-gray-800 flex items-center gap-2 mb-4">
              <BarChart2 className="w-5 h-5 text-pink-500" />
              <span>{t.statsTitle}</span>
            </h3>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-pink-50/50 p-3 rounded-2xl text-center border border-pink-100">
                <span className="text-xs text-gray-500 block">{t.likes}</span>
                <strong className="text-lg text-pink-600">{selectedPost.likes_count}</strong>
              </div>
              <div className="bg-pink-50/50 p-3 rounded-2xl text-center border border-pink-100">
                <span className="text-xs text-gray-500 block">{t.comments}</span>
                <strong className="text-lg text-pink-600">{selectedPost.comments_count}</strong>
              </div>
              <div className="bg-pink-50/50 p-3 rounded-2xl text-center border border-pink-100">
                <span className="text-xs text-gray-500 block">{t.shares}</span>
                <strong className="text-lg text-pink-600">{selectedPost.shares_count}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT POST DIALOG */}
      {showEdit && selectedPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-pink-100 shadow-2xl">
            <h3 className="text-md font-bold text-gray-800 mb-3">{t.editPost}</h3>
            <textarea 
              maxLength={800}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-3 border border-pink-100 rounded-2xl h-36 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm bg-gray-50/50 resize-none"
            />
            <div className="text-right text-[10px] text-gray-400 mb-4">{editContent.length}/800</div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-xs transition-colors"
              >
                {t.save}
              </button>
              <button 
                onClick={() => {
                  setShowEdit(false);
                  setSelectedPost(null);
                }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT USER DIALOG */}
      {showReport && selectedPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-pink-100 shadow-2xl">
            <h3 className="text-md font-bold text-gray-800 mb-2">{t.reportUser}</h3>
            <p className="text-xs text-gray-500 mb-3">Tu reporte se enviará de forma anónima para revisión de seguridad.</p>
            <textarea 
              placeholder={t.reasonPlaceholder}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full p-3 border border-pink-100 rounded-xl h-24 focus:outline-none focus:ring-2 focus:ring-pink-300 text-xs bg-gray-50/50 resize-none mb-4"
            />
            <div className="flex items-center gap-3">
              <button 
                onClick={handleSendReport}
                className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-xs transition-colors"
              >
                {t.report}
              </button>
              <button 
                onClick={() => {
                  setShowReport(false);
                  setReportReason('');
                  setSelectedPost(null);
                }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BLOCK CONFIRM DIALOG */}
      {showBlockPrompt && selectedPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-pink-100 shadow-2xl">
            <h3 className="text-md font-bold text-gray-800 mb-2">Bloquear Usuario</h3>
            <p className="text-xs text-gray-500 mb-4">{t.blockUserPrompt}</p>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleConfirmBlock}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors"
              >
                {t.block}
              </button>
              <button 
                onClick={() => {
                  setShowBlockPrompt(false);
                  setSelectedPost(null);
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
