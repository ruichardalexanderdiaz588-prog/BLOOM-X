import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, Send, Image as ImageIcon, MapPin, AlertTriangle, 
  Trash2, ShieldCheck, Check, CheckCheck, Loader, X, Navigation
} from 'lucide-react';
import { Profile, Message } from '../types';
import { translations } from '../lib/translations';
import { 
  getMessages, sendMessage, markMessagesAsRead, deleteMessageForMe, 
  deleteMessageForEveryone, getAllProfiles 
} from '../lib/supabase';
import { compressImage } from '../lib/utils';

interface ChatsViewProps {
  currentProfile: Profile;
  lang: string;
  activeContactId: string | null;
  setActiveContactId: (id: string | null) => void;
  refreshTrigger: number;
}

export default function ChatsView({ 
  currentProfile, lang, activeContactId, setActiveContactId, refreshTrigger 
}: ChatsViewProps) {
  const t = translations[lang] || translations['es'];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [contacts, setContacts] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedContact, setSelectedContact] = useState<Profile | null>(null);

  // Form states
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [sendingState, setSendingState] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Dialog states
  const [showLocationWarning, setShowLocationWarning] = useState(false);
  const [showDeleteMenuMsg, setShowDeleteMenuMsg] = useState<Message | null>(null);

  // Load contacts (all profiles in the app)
  useEffect(() => {
    const loadContacts = async () => {
      const data = await getAllProfiles(currentProfile.id);
      setContacts(data);

      if (activeContactId) {
        const found = data.find(p => p.id === activeContactId);
        if (found) {
          setSelectedContact(found);
          loadChatMessages(found.id);
        }
      }
    };
    loadContacts();
  }, [currentProfile.id, activeContactId, refreshTrigger]);

  const loadChatMessages = async (contactId: string) => {
    const msgs = await getMessages(currentProfile.id, contactId);
    setMessages(msgs);
    // Mark incoming messages as read
    await markMessagesAsRead(contactId, currentProfile.id);
  };

  // Poll chat messages every 3 seconds for real-time look
  useEffect(() => {
    if (!selectedContact) return;
    
    loadChatMessages(selectedContact.id);
    const interval = setInterval(() => {
      loadChatMessages(selectedContact.id);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedContact, refreshTrigger]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sendingState]);

  const handleSelectContact = (contact: Profile) => {
    setSelectedContact(contact);
    setActiveContactId(contact.id);
    loadChatMessages(contact.id);
  };

  const handleImageAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (images.length + filesArray.length > 2) {
        alert("Máximo 2 fotos.");
        return;
      }
      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const compressed = await compressImage(reader.result as string, 500, 500);
            setImages(prev => [...prev, compressed]);
          } catch (err) {
            console.error("Error compressing chat image:", err);
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

  const handleSend = async (locationPayload?: { lat: number; lng: number; name: string }) => {
    if (!selectedContact) return;
    if (!text.trim() && images.length === 0 && !locationPayload) return;
    if (text.length > 300) {
      alert("Máximo 300 caracteres.");
      return;
    }

    setSendingState('sending');

    const msgData: Partial<Message> = {
      sender_id: currentProfile.id,
      receiver_id: selectedContact.id,
      content: locationPayload ? `📍 Ubicación compartida: ${locationPayload.name}` : text,
      image_urls: images,
      location_lat: locationPayload?.lat || null,
      location_lng: locationPayload?.lng || null,
      location_name: locationPayload?.name || null,
      deleted_for: []
    };

    // Optimistic message append
    const optMsg: Message = {
      id: 'opt_' + Math.random(),
      sender_id: currentProfile.id,
      receiver_id: selectedContact.id,
      content: msgData.content || '',
      image_urls: images,
      location_lat: msgData.location_lat || null,
      location_lng: msgData.location_lng || null,
      location_name: msgData.location_name || null,
      status: 'sending',
      deleted_for: [],
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optMsg]);
    setText('');
    setImages([]);

    const saved = await sendMessage(msgData);
    if (saved) {
      setSendingState('sent');
      setTimeout(() => setSendingState('idle'), 1500);
      loadChatMessages(selectedContact.id);
    } else {
      setSendingState('idle');
    }
  };

  const handleShareLocationGPS = () => {
    setShowLocationWarning(false);
    
    if (!navigator.geolocation) {
      alert("Tu dispositivo no soporta geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        let name = "Coordenadas GPS";
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`);
          const data = await res.json();
          if (data && data.address) {
            name = data.address.road || data.address.suburb || data.address.city || "Ubicación Geográfica";
          }
        } catch {
          name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }

        handleSend({ lat, lng, name });
      },
      (error) => {
        console.error(error);
        alert("Permisos de ubicación denegados o error de GPS.");
      }
    );
  };

  const handleDeleteMsg = async (option: 'me' | 'everyone') => {
    if (!showDeleteMenuMsg) return;

    if (option === 'me') {
      // Update local state first
      setMessages(messages.filter(m => m.id !== showDeleteMenuMsg.id));
      await deleteMessageForMe(showDeleteMenuMsg.id, currentProfile.id);
    } else {
      // Para todos
      setMessages(messages.map(m => m.id === showDeleteMenuMsg.id ? { 
        ...m, 
        content: 'Mensaje eliminado', 
        image_urls: [], 
        location_lat: null, 
        location_lng: null, 
        location_name: null 
      } : m));
      await deleteMessageForEveryone(showDeleteMenuMsg.id);
    }
    setShowDeleteMenuMsg(null);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 grid grid-cols-1 md:grid-cols-12 gap-6 h-[85vh]">
      
      {/* CONTACTS COLUMN */}
      <div className={`${selectedContact ? 'hidden md:flex' : 'flex'} md:col-span-4 bg-white rounded-3xl border border-pink-100 p-5 flex-col h-full shadow-sm`}>
        <div className="mb-4">
          <h2 className="text-md font-bold text-gray-800 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-pink-500 fill-pink-500" />
            <span>{t.chatsTitle}</span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {contacts.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-8">No hay contactos disponibles aún.</p>
          ) : (
            contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => handleSelectContact(contact)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                  selectedContact?.id === contact.id 
                    ? 'bg-pink-50/50 border-pink-300 ring-1 ring-pink-300' 
                    : 'bg-gray-50/40 border-gray-100 hover:border-pink-100 hover:bg-pink-50/10'
                }`}
              >
                <div className="relative">
                  <img 
                    src={contact.avatar_url} 
                    alt={contact.username} 
                    className="w-10 h-10 rounded-full object-cover border border-pink-100 shadow-sm" 
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-pink-500 border-2 border-white rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 text-xs block truncate">
                      {contact.first_name} {contact.last_name}
                    </span>
                    {contact.zodiac_icon && <span className="text-xs">{contact.zodiac_icon}</span>}
                  </div>
                  <span className="text-[10px] text-gray-400 block truncate">@{contact.username}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* CHAT AREA COLUMN */}
      <div className={`${!selectedContact ? 'hidden md:flex' : 'flex'} md:col-span-8 bg-white rounded-3xl border border-pink-100 flex-col h-full overflow-hidden shadow-sm`}>
        {selectedContact ? (
          <>
            {/* CHAT BAR HEADER */}
            <div className="p-4 border-b border-pink-100 flex items-center justify-between bg-pink-50/30">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setSelectedContact(null);
                    setActiveContactId(null);
                  }}
                  className="md:hidden p-1.5 hover:bg-pink-100 text-pink-600 rounded-xl mr-1"
                >
                  ◀
                </button>
                <img 
                  src={selectedContact.avatar_url} 
                  alt={selectedContact.username} 
                  className="w-9 h-9 rounded-full object-cover border border-pink-100 shadow-sm" 
                />
                <div>
                  <strong className="text-xs text-gray-800 block">
                    {selectedContact.first_name} {selectedContact.last_name}
                  </strong>
                  <span className="text-[9px] text-pink-500 font-semibold">@{selectedContact.username} • {selectedContact.emotional_status}</span>
                </div>
              </div>

              {/* Quick Info */}
              <div className="text-xs bg-white border border-pink-100 px-3 py-1 rounded-full text-pink-600 font-bold flex items-center gap-1.5 shadow-sm">
                <span>{selectedContact.zodiac_icon}</span>
                <span>{selectedZodiacSign(selectedContact)}</span>
              </div>
            </div>

            {/* MESSAGES LOG */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-pink-50/10">
              {messages.map((m) => {
                const isMe = m.sender_id === currentProfile.id;
                const isDeleted = m.content === 'Mensaje eliminado';

                return (
                  <div 
                    key={m.id} 
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="relative group max-w-[85%]">
                      {/* Delete Msg Option Trigger */}
                      {!isDeleted && (
                        <button 
                          onClick={() => setShowDeleteMenuMsg(m)}
                          className="absolute -top-1.5 -right-1.5 bg-white text-gray-400 hover:text-red-500 p-1 rounded-full border border-pink-50 shadow-sm scale-0 group-hover:scale-100 transition-transform cursor-pointer z-10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}

                      {/* Content bubble */}
                      <div className={`p-3.5 rounded-2xl text-xs space-y-2 ${
                        isDeleted 
                          ? 'bg-gray-100 text-gray-400 italic'
                          : isMe 
                            ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-br-none shadow-sm' 
                            : 'bg-white text-gray-700 border border-pink-100 rounded-bl-none shadow-sm'
                      }`}>
                        
                        <p className="whitespace-pre-wrap">{m.content}</p>

                        {/* Photo attachments */}
                        {m.image_urls && m.image_urls.length > 0 && (
                          <div className="grid gap-1 grid-cols-2 mt-1">
                            {m.image_urls.map((img, idx) => (
                              <img 
                                key={idx} 
                                src={img} 
                                alt="Chat Attachment" 
                                className="rounded-lg object-cover max-h-28 w-full border border-white" 
                              />
                            ))}
                          </div>
                        )}

                        {/* Location attachment visually rendered */}
                        {m.location_lat && m.location_lng && (
                          <div className="bg-white/10 p-2.5 rounded-xl border border-white/20 mt-1 flex items-center gap-2 text-white">
                            <Navigation className="w-4 h-4 shrink-0 animate-bounce" />
                            <div className="text-[10px] min-w-0">
                              <span className="font-bold block">Ubicación Compartida</span>
                              <span className="truncate block opacity-90">{m.location_name}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* STATUS IN INDICATORS */}
                    <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-400 px-1">
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMe && (
                        <>
                          <span>•</span>
                          {m.status === 'sending' && (
                            <span className="italic flex items-center gap-0.5">
                              <Loader className="w-2.5 h-2.5 animate-spin" />
                              <span>{t.sendingStatus}</span>
                            </span>
                          )}
                          {m.status === 'sent' && (
                            <span className="flex items-center gap-0.5 text-gray-500 font-semibold">
                              <Check className="w-3 h-3" />
                              <span>{t.sentStatus}</span>
                            </span>
                          )}
                          {m.status === 'read' && (
                            <span className="flex items-center gap-0.5 text-pink-500 font-extrabold">
                              <CheckCheck className="w-3 h-3 text-pink-500" />
                              <span>{t.readStatus}</span>
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* ATTACHMENT PREVIEWS */}
            {images.length > 0 && (
              <div className="px-4 py-2 border-t border-pink-100 flex gap-2 bg-pink-50/20">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-12 rounded-lg overflow-hidden border border-pink-200">
                    <img src={img} alt="Attach preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeImage(idx)}
                      className="absolute top-0 right-0 bg-black/60 text-white p-0.5 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* SEND BAR CONTROLS */}
            <div className="p-4 border-t border-pink-100 flex items-center gap-2 bg-white">
              
              {/* Photo Input trigger */}
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={handleImageAttachment}
                className="hidden" 
                id="chat-photos-upload" 
              />
              <label 
                htmlFor="chat-photos-upload"
                className="p-2.5 bg-pink-50 hover:bg-pink-100 rounded-xl cursor-pointer text-pink-500 transition-colors"
                title="Adjuntar fotos (máx 2)"
              >
                <ImageIcon className="w-5 h-5" />
              </label>

              {/* Location warning popup triggers */}
              <button 
                onClick={() => setShowLocationWarning(true)}
                className="p-2.5 bg-pink-50 hover:bg-pink-100 rounded-xl text-pink-500 transition-colors"
                title={t.sendLocation}
              >
                <MapPin className="w-5 h-5" />
              </button>

              <input 
                type="text" 
                placeholder={t.placeholderChat}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                maxLength={300}
                className="flex-1 px-4 py-2.5 border border-pink-100 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-pink-200 bg-gray-50/30"
              />

              <button 
                onClick={() => handleSend()}
                className="bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-2xl transition-all shadow-md shadow-pink-100"
              >
                <Send className="w-4 h-4 fill-white" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="bg-pink-100 p-4 rounded-3xl text-pink-500 mb-3 shadow-inner">
              <MessageCircle className="w-8 h-8 fill-pink-500" />
            </div>
            <h3 className="font-bold text-gray-700 text-sm">Tus Mensajes de Bloom</h3>
            <p className="text-[11px] text-gray-400 max-w-xs mt-1">Selecciona a un contacto de la lista para empezar un chat privado premium y seguro.</p>
          </div>
        )}
      </div>

      {/* LOCATION PRIVACY DREADED WARNING */}
      {showLocationWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-rose-100 shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
            
            <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider text-rose-600">
              {t.locationWarningTitle}
            </h3>
            
            <p className="text-xs text-gray-600 mt-3 leading-relaxed whitespace-pre-wrap">
              {t.locationWarningText}
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button 
                onClick={handleShareLocationGPS}
                className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Entiendo, compartir</span>
              </button>
              <button 
                onClick={() => setShowLocationWarning(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MESSAGE SELECTION DIALOG */}
      {showDeleteMenuMsg && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xs w-full p-6 border border-pink-100 shadow-2xl">
            <h4 className="text-xs font-bold text-gray-800 mb-3">¿Cómo deseas eliminar este mensaje?</h4>
            <div className="space-y-2">
              <button 
                onClick={() => handleDeleteMsg('me')}
                className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs text-left px-4"
              >
                {t.deleteMsgForMe}
              </button>
              
              {showDeleteMenuMsg.sender_id === currentProfile.id && (
                <button 
                  onClick={() => handleDeleteMsg('everyone')}
                  className="w-full py-2.5 bg-pink-100 hover:bg-pink-200 text-pink-700 font-bold rounded-xl text-xs text-left px-4"
                >
                  {t.deleteMsgForEveryone}
                </button>
              )}

              <button 
                onClick={() => setShowDeleteMenuMsg(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl text-xs text-center font-bold"
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

// Zodiac translator helper
function selectedZodiacSign(user: Profile): string {
  return user.zodiac || 'Astral';
}
