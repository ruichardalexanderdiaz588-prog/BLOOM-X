export function getZodiac(dateStr: string): { sign: string; icon: string } {
  if (!dateStr) return { sign: "Desconocido", icon: "🔮" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { sign: "Desconocido", icon: "🔮" };
  const day = d.getUTCDate();
  const month = d.getUTCMonth() + 1; // 1-12

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return { sign: "Aries", icon: "♈" };
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return { sign: "Taurus", icon: "♉" };
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return { sign: "Gemini", icon: "♊" };
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return { sign: "Cancer", icon: "♋" };
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return { sign: "Leo", icon: "♌" };
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return { sign: "Virgo", icon: "♍" };
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return { sign: "Libra", icon: "♎" };
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return { sign: "Scorpio", icon: "♏" };
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return { sign: "Sagittarius", icon: "♐" };
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return { sign: "Capricorn", icon: "♑" };
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return { sign: "Aquarius", icon: "♒" };
  return { sign: "Pisces", icon: "♓" };
}

export function getDistanceKm(lat1: number | null, lng1: number | null, lat2: number | null, lng2: number | null): number | null {
  if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) return null;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

export function calculateAge(birthdateStr: string): number {
  if (!birthdateStr) return 0;
  const birthDate = new Date(birthdateStr);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function formatTimeAgo(dateStr: string, lang: string = 'es'): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 10) {
    return lang === 'es' ? 'hace unos segundos' :
           lang === 'ru' ? 'несколько секунд назад' :
           lang === 'de' ? 'vor wenigen Sekunden' : 'just now';
  }
  if (diffSec < 60) {
    return lang === 'es' ? `hace ${diffSec} segundos` :
           lang === 'ru' ? `${diffSec} сек. назад` :
           lang === 'de' ? `vor ${diffSec} Sekunden` : `${diffSec}s ago`;
  }
  if (diffMin < 60) {
    return lang === 'es' ? `hace ${diffMin} minutos` :
           lang === 'ru' ? `${diffMin} мин. назад` :
           lang === 'de' ? `vor ${diffMin} Minuten` : `${diffMin}m ago`;
  }
  if (diffHr < 24) {
    return lang === 'es' ? `hace ${diffHr} horas` :
           lang === 'ru' ? `${diffHr} ч. назад` :
           lang === 'de' ? `vor ${diffHr} Stunden` : `${diffHr}h ago`;
  }
  if (diffDays < 7) {
    return lang === 'es' ? `hace ${diffDays} días` :
           lang === 'ru' ? `${diffDays} дн. назад` :
           lang === 'de' ? `vor ${diffDays} Tagen` : `${diffDays}d ago`;
  }
  return d.toLocaleDateString(lang === 'es' ? 'es-ES' : lang === 'ru' ? 'ru-RU' : lang === 'de' ? 'de-DE' : 'en-US');
}

// Simple base64 utility to handle fallback for premium default files
export const DEFAULT_AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=60"
];

export const DEFAULT_BANNERS = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=60"
];

export const PRESET_AVATARS_GALLERY = [
  { name: 'Chica Sonriente', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80', style: 'Aesthetic' },
  { name: 'Chico Espejo', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80', style: 'Selfie Espejo' },
  { name: 'Modelo Casual', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80', style: 'Urbano' },
  { name: 'Mirada Atenta', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80', style: 'Vibras de Calle' },
  { name: 'Estilo Sunset', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80', style: 'Atardecer' },
  { name: 'Chica Deportiva', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80', style: 'Fitness' },
  { name: 'Chico Elegante', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80', style: 'Elegante' },
  { name: 'Estilo Bohemio', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop&q=80', style: 'Natural' }
];

export function compressImage(base64Str: string, maxW: number = 400, maxH: number = 400): Promise<string> {
  return new Promise((resolve) => {
    // If it's already an external HTTP URL, don't compress it
    if (base64Str.startsWith('http://') || base64Str.startsWith('https://')) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxW) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        }
      } else {
        if (height > maxH) {
          width = Math.round((width * maxH) / height);
          height = maxH;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}
