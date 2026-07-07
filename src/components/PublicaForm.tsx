import React, { useState } from 'react';
import { PlusCircle, Image as ImageIcon, Sparkles, X, AlertCircle, Check } from 'lucide-react';
import { Profile, Post } from '../types';
import { translations } from '../lib/translations';
import { createPost } from '../lib/supabase';
import { compressImage } from '../lib/utils';

interface PublicaFormProps {
  currentProfile: Profile;
  lang: string;
  onPublishComplete: () => void;
}

export default function PublicaForm({ currentProfile, lang, onPublishComplete }: PublicaFormProps) {
  const t = translations[lang] || translations['es'];
  
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [success, setSuccess] = useState(false);

  const handleImageAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorText('');
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (images.length + filesArray.length > 2) {
        setErrorText("Sólo puedes subir un máximo de 2 fotos por publicación.");
        return;
      }

      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const compressed = await compressImage(reader.result as string, 600, 600);
            setImages(prev => [...prev, compressed]);
          } catch (err) {
            console.error("Error compressing post image:", err);
            setImages(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file as any);
      });
    }
  };

  const removeImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const handlePublish = async () => {
    setErrorText('');
    if (!content.trim() && images.length === 0) {
      setErrorText("La publicación debe contener texto, imágenes o ambos.");
      return;
    }

    if (content.length > 800) {
      setErrorText("El contenido de la publicación supera los 800 caracteres máximos permitidos.");
      return;
    }

    setLoading(true);

    // Extract hashtags from content
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex);
    const hashtags = matches ? matches.map(h => h.toLowerCase()) : [];

    const postData: Partial<Post> = {
      user_id: currentProfile.id,
      content,
      image_urls: images,
      hashtags,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      likes: [],
      shares: []
    };

    const saved = await createPost(postData);
    setLoading(false);

    if (saved) {
      setSuccess(true);
      setContent('');
      setImages([]);
      setTimeout(() => {
        setSuccess(false);
        onPublishComplete();
      }, 1500);
    } else {
      setErrorText("Error al guardar la publicación en Supabase.");
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <div className="bg-white rounded-3xl border border-pink-100 p-6 shadow-md space-y-6">
        
        {/* TAB HEADER */}
        <div className="flex items-center gap-3">
          <div className="bg-pink-100 p-2.5 rounded-2xl text-pink-500">
            <PlusCircle className="w-6 h-6 shrink-0" />
          </div>
          <div>
            <h2 className="text-md font-extrabold text-gray-800">{t.publicaTitle}</h2>
            <p className="text-[10px] text-gray-400">Exprésate libremente y conecta con tu comunidad hoy mismo.</p>
          </div>
        </div>

        {/* NOTIFICATIONS AND STATUS */}
        {errorText && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 text-xs text-red-700 rounded-r-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 text-xs text-emerald-700 rounded-r-lg flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>¡Publicado exitosamente! Volviendo a inicio...</span>
          </div>
        )}

        {/* INPUT CONTAINER */}
        <div className="space-y-3">
          <textarea
            maxLength={800}
            placeholder={t.placeholderPost}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading || success}
            className="w-full h-44 p-4 border border-pink-100/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-200 text-sm bg-gray-50/40 resize-none"
          />
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Usa # para etiquetas y @ para menciones</span>
            <span className={content.length > 750 ? "text-pink-600 font-bold" : ""}>
              {content.length}/800
            </span>
          </div>
        </div>

        {/* PREVIEW ATTACHED IMAGES */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-3 bg-pink-50/20 p-3 rounded-2xl border border-pink-100/40">
            {images.map((img, idx) => (
              <div key={idx} className="relative rounded-xl overflow-hidden aspect-video border border-pink-100 bg-gray-50">
                <img 
                  src={img || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600"} 
                  alt="Attachment draft" 
                  className="w-full h-full object-cover" 
                  onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600"; }}
                />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1 rounded-full shadow-md transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ATTACHMENT AND PUBLISH ACTIONS BAR */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-5">
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageAttachment}
              disabled={images.length >= 2 || loading || success}
              className="hidden"
              id="post-images-upload"
            />
            <label
              htmlFor="post-images-upload"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                images.length >= 2 
                  ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed' 
                  : 'border-pink-200 text-pink-600 hover:bg-pink-50 hover:border-pink-300'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-pink-500" />
              <span>{t.uploadImages}</span>
            </label>
          </div>

          <button
            onClick={handlePublish}
            disabled={loading || success}
            className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold rounded-full shadow-lg hover:shadow-pink-100 text-xs transition-all flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 fill-white text-white" />
            )}
            <span>{t.publishNow}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
