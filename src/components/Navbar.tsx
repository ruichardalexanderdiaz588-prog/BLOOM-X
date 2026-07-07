import React from 'react';
import { Home, Compass, PlusCircle, MessageCircle, User, ShieldAlert, Sparkles } from 'lucide-react';
import { translations } from '../lib/translations';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lang: string;
  isAdmin: boolean;
}

export default function Navbar({ activeTab, setActiveTab, lang, isAdmin }: NavbarProps) {
  const t = translations[lang] || translations['es'];

  const navItems = [
    { id: 'home', label: t.home, icon: Home },
    { id: 'conecta', label: t.conecta, icon: Compass },
    { id: 'publica', label: t.publica, icon: PlusCircle },
    { id: 'chats', label: t.chats, icon: MessageCircle },
    { id: 'perfil', label: t.perfil, icon: User },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin', icon: ShieldAlert });
  }

  return (
    <>
      {/* DESKTOP TOP NAV */}
      <header className="hidden md:flex bg-white/95 backdrop-blur-md border-b border-pink-100 sticky top-0 z-40 items-center justify-between px-8 py-4 shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
          <div className="bg-gradient-to-r from-pink-500 to-rose-400 p-2 rounded-xl text-white shadow-md shadow-pink-100">
            <Sparkles className="w-5 h-5 fill-white animate-pulse" />
          </div>
          <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent uppercase font-sans">
            BLOOM
          </span>
        </div>

        <nav className="flex items-center gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  active 
                    ? 'bg-pink-500 text-white shadow-md shadow-pink-200' 
                    : 'text-gray-500 hover:text-pink-600 hover:bg-pink-50/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-pink-100 px-3 py-2 flex items-center justify-around z-40 shadow-[0_-2px_10px_rgba(244,114,182,0.08)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                active 
                  ? 'text-pink-600 font-bold scale-110' 
                  : 'text-gray-400 hover:text-pink-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] uppercase tracking-wider">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
