import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, ArrowLeft, ArrowRight, MapPin, Sparkles, Check, 
  Shield, User, Calendar, Image as ImageIcon, Smile, Tag, Compass, AlertCircle
} from 'lucide-react';
import { Profile } from '../types';
import { translations } from '../lib/translations';
import { getZodiac, calculateAge, DEFAULT_AVATARS, DEFAULT_BANNERS, PRESET_AVATARS_GALLERY, compressImage } from '../lib/utils';
import { createProfile } from '../lib/supabase';

interface OnboardingProps {
  userId: string;
  userEmail?: string;
  lang?: string;
  onComplete: (profile: Profile) => void;
}

const GENDERS = [
  { value: 'hombre', label: 'Hombre', icon: '👨' },
  { value: 'mujer', label: 'Mujer', icon: '👩' },
  { value: 'hombre trans', label: 'Hombre Trans', icon: '🏳️‍⚧️👨' },
  { value: 'mujer trans', label: 'Mujer Trans', icon: '🏳️‍⚧️👩' },
  { value: 'no binario', label: 'No binario', icon: '⚧' },
  { value: 'inter', label: 'Intersexual', icon: '🟨' },
  { value: 'prefiero no decirlo', label: 'Prefiero no decirlo', icon: '🤫' }
];

const ORIENTATIONS = [
  { value: 'hetero', label: 'Heterosexual', icon: '👫' },
  { value: 'gay', label: 'Gay', icon: '👨‍❤️‍👨' },
  { value: 'lesbiana', label: 'Lesbiana', icon: '👩‍❤️‍👩' },
  { value: 'bisexual', label: 'Bisexual', icon: '💗💜💙' },
  { value: 'pansexual', label: 'Pansexual', icon: '💗💛💙' },
  { value: 'asexual', label: 'Asexual', icon: '🖤🩶🤍💜' },
  { value: 'demisexual', label: 'Demisexual', icon: '🤍🖤💜' },
  { value: 'polisexual', label: 'Polisexual', icon: '💗💚💙' },
  { value: 'transatractivo', label: 'Transatractivo/a', icon: '🏳️‍⚧️✨' },
  { value: 'lo_estoy_pensando', label: 'Aún no lo sé, lo estoy pensando', icon: '🤔' },
  { value: 'prefiero_no_decirlo', label: 'Prefiero no decirlo', icon: '🤫' }
];

const LOOKING_FOR_OPTIONS = [
  { value: 'cruising', label: 'Cruising', icon: '🌲', desc: 'Encuentros rápidos y discretos en áreas de interés' },
  { value: 'citas', label: 'Citas', icon: '🌹', desc: 'Salir, conocer personas nuevas y ver qué fluye' },
  { value: 'relacion seria', label: 'Relación Seria', icon: '💍', desc: 'Estabilidad y compromiso sincero a largo plazo' },
  { value: 'amistad', label: 'Amistad', icon: '🤝', desc: 'Ampliar mi grupo social y compartir aficiones' },
  { value: 'pasar el rato', label: 'Pasar el Rato', icon: '🥂', desc: 'Vivir el momento sin etiquetas ni ataduras' },
  { value: 'relación seria, pero no me cierro', label: 'Relación seria, pero flexible', icon: '🎯', desc: 'Busco estabilidad, pero fluyo con la vibra' }
];

const EMOTIONAL_STATUSES = [
  { value: 'soltero', label: 'Soltero/a', icon: '🔓', desc: 'Libre y listo para conectar' },
  { value: 'casado', label: 'Casado/a', icon: '🔒', desc: 'En una relación formal' },
  { value: 'recién casado', label: 'Recién casado/a', icon: '🎉', desc: 'Disfrutando de la nueva etapa' },
  { value: 'viudo', label: 'Viudo/a', icon: '🖤', desc: 'Llevando un duelo o sanando' },
  { value: 'es difícil decirlo', label: 'Es difícil decirlo', icon: '🧩', desc: 'Situación sentimental compleja' },
  { value: 'divorciado', label: 'Divorciado/a', icon: '✂️', desc: 'Cerrando ciclos y recomenzando' }
];

const INTERESTS_PRESETS = [
  '#lgbt', '#comedia', '#gaming', '#tv', '#memes', '#gastronomia', 
  '#musica', '#viajes', '#cine', '#deportes', '#moda', '#baile', 
  '#lectura', '#tecnologia', '#arte', '#naturaleza', '#mascotas', '#fiesta'
];

export default function Onboarding({ userId, userEmail, onComplete }: OnboardingProps) {
  // Try loading drafts from localstorage
  const [step, setStep] = useState<number>(1);
  const [maxStepReached, setMaxStepReached] = useState<number>(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  const [orientation, setOrientation] = useState('');
  const [showAge, setShowAge] = useState(true);
  const [showOrientation, setShowOrientation] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATARS[0]);
  const [bannerUrl, setBannerUrl] = useState(DEFAULT_BANNERS[0]);
  const [bio, setBio] = useState('');
  const [gustos, setGustos] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState('');
  const [emotionalStatus, setEmotionalStatus] = useState('soltero');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationName, setLocationName] = useState('');
  const [country, setCountry] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedNotifications, setAcceptedNotifications] = useState(false);
  
  // Dialogs
  const [showAgeWarning, setShowAgeWarning] = useState(false);
  const [showOrientationWarning, setShowOrientationWarning] = useState(false);
  const [errorText, setErrorText] = useState('');

  // Auto load draft
  useEffect(() => {
    try {
      const draft = localStorage.getItem(`bloom_onboarding_draft_${userId}`);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.step) setStep(parsed.step);
        if (parsed.maxStepReached) setMaxStepReached(parsed.maxStepReached);
        if (parsed.firstName) setFirstName(parsed.firstName);
        if (parsed.lastName) setLastName(parsed.lastName);
        if (parsed.username) setUsername(parsed.username);
        if (parsed.birthdate) setBirthdate(parsed.birthdate);
        if (parsed.gender) setGender(parsed.gender);
        if (parsed.orientation) setOrientation(parsed.orientation);
        if (parsed.showAge !== undefined) setShowAge(parsed.showAge);
        if (parsed.showOrientation !== undefined) setShowOrientation(parsed.showOrientation);
        if (parsed.avatarUrl) setAvatarUrl(parsed.avatarUrl);
        if (parsed.bannerUrl) setBannerUrl(parsed.bannerUrl);
        if (parsed.bio) setBio(parsed.bio);
        if (parsed.gustos) setGustos(parsed.gustos);
        if (parsed.lookingFor) setLookingFor(parsed.lookingFor);
        if (parsed.emotionalStatus) setEmotionalStatus(parsed.emotionalStatus);
        if (parsed.locationLat) setLocationLat(parsed.locationLat);
        if (parsed.locationLng) setLocationLng(parsed.locationLng);
        if (parsed.locationName) setLocationName(parsed.locationName);
        if (parsed.country) setCountry(parsed.country);
        if (parsed.acceptedTerms) setAcceptedTerms(parsed.acceptedTerms);
        if (parsed.acceptedNotifications) setAcceptedNotifications(parsed.acceptedNotifications);
      }
    } catch (e) {
      console.error('Error restoring onboarding draft', e);
    }
  }, [userId]);

  // Save draft on edit
  useEffect(() => {
    try {
      const draft = {
        step, maxStepReached, firstName, lastName, username, birthdate,
        gender, orientation, showAge, showOrientation, avatarUrl, bannerUrl,
        bio, gustos, lookingFor, emotionalStatus, locationLat, locationLng,
        locationName, country, acceptedTerms, acceptedNotifications
      };
      localStorage.setItem(`bloom_onboarding_draft_${userId}`, JSON.stringify(draft));
    } catch (e) {
      console.error('Error saving onboarding draft', e);
    }
  }, [
    step, maxStepReached, firstName, lastName, username, birthdate,
    gender, orientation, showAge, showOrientation, avatarUrl, bannerUrl,
    bio, gustos, lookingFor, emotionalStatus, locationLat, locationLng,
    locationName, country, acceptedTerms, acceptedNotifications, userId
  ]);

  // Handle geolocation auto retrieval
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setErrorText("La geolocalización no está soportada por tu navegador.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocationLat(lat);
        setLocationLng(lng);

        // Fetch reverse geocoding from free OSM API
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
          const data = await res.json();
          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.county || "Ciudad cercana";
            const ctry = data.address.country || "País Desconocido";
            setLocationName(city);
            setCountry(ctry);
          } else {
            setLocationName("Ubicación Real");
            setCountry("Tu País");
          }
        } catch (e) {
          setLocationName("Ubicación Compartida");
          setCountry("Tu País");
        }
      },
      (error) => {
        console.error(error);
        setErrorText("No pudimos obtener tu ubicación real. Por favor, asegúrate de dar permisos en tu navegador.");
        // Fallback coordinates (neutral)
        setLocationLat(40.416775);
        setLocationLng(-3.703790);
        setLocationName("Madrid");
        setCountry("España");
      }
    );
  };

  const handleNext = () => {
    setErrorText('');
    // Validations per step
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim() || !username.trim() || !birthdate) {
        setErrorText("Por favor, rellena todos los campos.");
        return;
      }
    } else if (step === 2) {
      if (!gender) {
        setErrorText("Por favor, selecciona tu género.");
        return;
      }
    } else if (step === 3) {
      if (!orientation) {
        setErrorText("Por favor, selecciona tu orientación sexual.");
        return;
      }
    } else if (step === 4) {
      if (!lookingFor || !emotionalStatus) {
        setErrorText("Por favor, selecciona qué buscas y tu estado emocional.");
        return;
      }
    } else if (step === 5) {
      if (gustos.length === 0) {
        setErrorText("Por favor, selecciona al menos 1 tema de tu interés.");
        return;
      }
    } else if (step === 6) {
      if (!locationLat || !locationName) {
        setErrorText("Es obligatorio activar la ubicación para conectar con Bloom.");
        return;
      }
      if (!acceptedTerms) {
        setErrorText("Debes aceptar los términos y condiciones de servicio.");
        return;
      }
    }

    const nextStep = step + 1;
    setStep(nextStep);
    if (nextStep > maxStepReached) {
      setMaxStepReached(nextStep);
    }
  };

  const handleBack = () => {
    setErrorText('');
    if (step > 1) {
      setStep(step - 1);
    }
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

  const toggleInterest = (interest: string) => {
    if (gustos.includes(interest)) {
      setGustos(gustos.filter(i => i !== interest));
    } else {
      setGustos([...gustos, interest]);
    }
  };

  const handleSubmit = async () => {
    if (!acceptedTerms) {
      setErrorText("Debes aceptar los términos y políticas para completar el registro.");
      return;
    }

    const age = calculateAge(birthdate);
    const zDetails = getZodiac(birthdate);
    const selectedGenderObj = GENDERS.find(g => g.value === gender);
    const selectedOrientObj = ORIENTATIONS.find(o => o.value === orientation);

    const finalProfile: Partial<Profile> = {
      id: userId,
      first_name: firstName,
      last_name: lastName,
      username: username.toLowerCase().replace(/\s+/g, ''),
      birthdate,
      age,
      zodiac: zDetails.sign,
      zodiac_icon: zDetails.icon,
      gender,
      gender_icon: selectedGenderObj?.icon || '⚧',
      orientation,
      orientation_icon: selectedOrientObj?.icon || '✨',
      show_age: showAge,
      show_orientation: showOrientation,
      avatar_url: avatarUrl,
      banner_url: bannerUrl,
      bio: bio || '¡Hola! Estoy usando Bloom para conectar.',
      gustos,
      looking_for: lookingFor,
      emotional_status: emotionalStatus,
      location_lat: locationLat,
      location_lng: locationLng,
      location_name: locationName || 'Ubicación remota',
      country: country || 'Mundo',
      language: 'es',
      is_admin: userEmail === 'richardalexanderdiaz0@gmail.com'
    };

    const saved = await createProfile(finalProfile);
    if (saved) {
      // Clear draft
      localStorage.removeItem(`bloom_onboarding_draft_${userId}`);
      onComplete(saved);
    } else {
      setErrorText("Error al guardar en Supabase. Verifica RLS y asegúrate de que el 'Nombre de usuario' no esté en uso por otra cuenta.");
    }
  };

  const currentZodiac = birthdate ? getZodiac(birthdate) : null;
  const computedAge = birthdate ? calculateAge(birthdate) : 0;

  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-pink-100 overflow-hidden relative">
        
        {/* TOP WELCOME BANNER */}
        <div className="bg-gradient-to-r from-pink-500 to-rose-400 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/15 rounded-full blur-xl -ml-8 -mb-8" />
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-8 h-8 fill-white animate-pulse" />
            <span className="text-2xl font-bold tracking-wider uppercase font-sans">BLOOM</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{translations.es.welcome}</h1>
          <p className="text-pink-100 text-sm mt-1">Crea tu perfil premium en un par de pasos para conectar hoy mismo.</p>
          
          {/* STEP PROGRESS BAR */}
          <div className="mt-6 flex items-center justify-between text-xs text-pink-100">
            <span>Paso {step} de 6</span>
            <span>{Math.round((step / 6) * 100)}% Completado</span>
          </div>
          <div className="w-full bg-pink-700/30 h-2 rounded-full mt-2 overflow-hidden">
            <motion.div 
              className="bg-white h-full"
              initial={{ width: '0%' }}
              animate={{ width: `${(step / 6) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* PREMIUM ERROR SUGGESTION TIP */}
        <AnimatePresence>
          {step > 1 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-rose-50 border-b border-rose-100 px-6 py-2.5 flex items-center gap-2.5 text-xs text-rose-700"
            >
              <Sparkles className="w-4 h-4 text-pink-500 animate-spin" />
              <span>{translations.es.stepErrorTip}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ERROR DISPLAY */}
        {errorText && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 mt-4 text-sm text-red-700 rounded-r-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{errorText}</span>
          </div>
        )}

        <div className="p-8">
          <AnimatePresence mode="wait">
            {/* STEP 1: BASIC INFO */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <User className="text-pink-500 w-5 h-5" /> 1. Datos Personales
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Nombre</label>
                    <input 
                      type="text" 
                      placeholder="Richard"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 bg-gray-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Apellido</label>
                    <input 
                      type="text" 
                      placeholder="Alexander"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 bg-gray-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Nombre de usuario único</label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-gray-400 font-semibold">@</span>
                    <input 
                      type="text" 
                      placeholder="richybloom"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 bg-gray-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Fecha de Nacimiento</label>
                  <input 
                    type="date" 
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 bg-gray-50/50"
                  />
                  {birthdate && (
                    <div className="mt-3 bg-pink-50/70 p-3 rounded-xl flex items-center justify-between text-sm">
                      <span className="text-gray-600 font-medium flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-pink-500" />
                        Edad calculada: <strong className="text-pink-600">{computedAge} años</strong>
                      </span>
                      {currentZodiac && (
                        <span className="text-gray-600 font-medium flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-pink-100 shadow-sm">
                          Zodíaco: <strong className="text-pink-600">{currentZodiac.icon} {currentZodiac.sign}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 2: GENDER */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span>⚧</span> 2. ¿Cuál es tu género?
                </h3>
                <p className="text-xs text-gray-500">Selecciona el género con el que te identificas para mostrar en tu tarjeta.</p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {GENDERS.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setGender(g.value)}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 ${
                        gender === g.value 
                          ? 'border-pink-500 bg-pink-50/40 ring-2 ring-pink-300 shadow-md' 
                          : 'border-gray-100 bg-white hover:border-pink-200 hover:bg-pink-50/10'
                      }`}
                    >
                      <span className="text-2xl">{g.icon}</span>
                      <span className="font-semibold text-gray-700 text-sm">{g.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: SEXUAL ORIENTATION & PRIVACY WARNINGS */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Heart className="text-pink-500 w-5 h-5 fill-pink-500" /> 3. Orientación Sexual y Ajustes de Público
                </h3>
                <p className="text-xs text-gray-500">Bloom es un espacio diverso para conectar de forma auténtica.</p>
                
                {/* SELECTOR BANNER */}
                <div className="bg-pink-50 border border-pink-100 p-4 rounded-2xl max-h-64 overflow-y-auto grid grid-cols-2 gap-2.5">
                  {ORIENTATIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setOrientation(o.value)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 ${
                        orientation === o.value 
                          ? 'border-pink-500 bg-white shadow-sm ring-2 ring-pink-300 font-bold text-pink-700' 
                          : 'border-transparent bg-white/70 hover:bg-white hover:border-pink-200'
                      }`}
                    >
                      <span className="text-lg">{o.icon}</span>
                      <span className="text-xs text-gray-700">{o.label}</span>
                    </button>
                  ))}
                </div>

                {/* SHOW AGE & ORIENTATION SETTING TOGGLES WITH WARNS */}
                <div className="bg-gray-50 p-4 rounded-2xl space-y-3 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-700 block">Mostrar Edad públicamente</span>
                      <span className="text-[10px] text-gray-400">Verán tu edad de {computedAge} años en tu tarjeta.</span>
                    </div>
                    <button 
                      onClick={() => {
                        if (!showAge) {
                          // Try activating -> show warning popup
                          setShowAgeWarning(true);
                        } else {
                          setShowAge(false);
                        }
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative ${showAge ? 'bg-pink-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${showAge ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <div>
                      <span className="text-xs font-bold text-gray-700 block">Mostrar Orientación Sexual</span>
                      <span className="text-[10px] text-gray-400">Verán tu preferencia en tu perfil principal.</span>
                    </div>
                    <button 
                      onClick={() => {
                        if (!showOrientation) {
                          setShowOrientationWarning(true);
                        } else {
                          setShowOrientation(false);
                        }
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative ${showOrientation ? 'bg-pink-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${showOrientation ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: INTENTIONS & IMAGES */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Compass className="text-pink-500 w-5 h-5" /> 4. ¿Qué buscas en Bloom?
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">¿Qué estás buscando en Bloom?</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 border border-gray-100 rounded-2xl bg-gray-50/30">
                      {LOOKING_FOR_OPTIONS.map(opt => {
                        const isSelected = lookingFor === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setLookingFor(opt.value)}
                            className={`flex items-start text-left p-2.5 rounded-xl border transition-all ${
                              isSelected
                                ? 'bg-pink-500/5 border-pink-500 ring-2 ring-pink-500/10'
                                : 'bg-white border-gray-100 hover:border-pink-200'
                            }`}
                          >
                            <span className="text-xl mr-2.5 mt-0.5" role="img" aria-label={opt.label}>
                              {opt.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className={`block font-bold text-xs ${isSelected ? 'text-pink-600' : 'text-gray-700'}`}>
                                {opt.label}
                              </span>
                              <span className="block text-[10px] text-gray-400 leading-tight mt-0.5 line-clamp-2">
                                {opt.desc}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="ml-1 self-center bg-pink-500 text-white rounded-full p-0.5">
                                <Check className="w-3 h-3" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Tu Estado Sentimental / Emocional</label>
                    <div className="grid grid-cols-2 gap-2">
                      {EMOTIONAL_STATUSES.map(opt => {
                        const isSelected = emotionalStatus === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setEmotionalStatus(opt.value)}
                            className={`flex items-center gap-2 text-left p-2 rounded-xl border transition-all ${
                              isSelected
                                ? 'bg-pink-500/5 border-pink-500 ring-2 ring-pink-500/10'
                                : 'bg-white border-gray-100 hover:border-pink-200'
                            }`}
                          >
                            <span className="text-md" role="img" aria-label={opt.label}>
                              {opt.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className={`block font-bold text-[11px] truncate ${isSelected ? 'text-pink-600' : 'text-gray-700'}`}>
                                {opt.label}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="bg-pink-500 text-white rounded-full p-0.5 shrink-0">
                                <Check className="w-2.5 h-2.5" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Biografía (Máx 180 caracteres)</label>
                  <textarea 
                    maxLength={180}
                    placeholder="Cuéntanos sobre ti, qué te hace especial, tus vibras..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 text-sm h-20 focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
                  />
                  <div className="text-right text-[10px] text-gray-400">{bio.length}/180</div>
                </div>

                {/* PRESET AVATARS GALLERY */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Selecciona un Avatar Premium o Sube el Tuyo
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
                            className="w-16 h-16 rounded-2xl object-cover border border-gray-100"
                            referrerPolicy="no-referrer"
                            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=60'; }}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 rounded-b-2xl py-0.5 text-center">
                            <span className="text-[8px] font-bold text-white block truncate px-1">
                              {preset.style}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                              <Check className="w-2.5 h-2.5" strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* IMAGES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Foto de Perfil Personalizada</label>
                    <div className="flex items-center gap-3">
                      <img src={avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover border border-pink-200 shadow-sm" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=60'; }} />
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleCustomAvatarUpload}
                        className="hidden" 
                        id="avatar-upload" 
                      />
                      <label htmlFor="avatar-upload" className="px-3 py-1.5 bg-pink-100 hover:bg-pink-200 text-pink-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                        Subir Foto
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Foto de Portada / Banner</label>
                    <div className="flex items-center gap-3">
                      <img src={bannerUrl} alt="Banner" className="w-16 h-10 rounded-lg object-cover border border-pink-200 shadow-sm" referrerPolicy="no-referrer" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleCustomBannerUpload}
                        className="hidden" 
                        id="banner-upload" 
                      />
                      <label htmlFor="banner-upload" className="px-3 py-1.5 bg-pink-100 hover:bg-pink-200 text-pink-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                        Subir Banner
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: INTERESTS (GUSTOS) */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Tag className="text-pink-500 w-5 h-5" /> 5. Elige tus Gustos (#Hashtags)
                </h3>
                <p className="text-xs text-gray-500">Selecciona temas de moda que te gusten para autocompletar en tu perfil y buscar conexiones con afinidad.</p>

                <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-2 bg-pink-50/30 rounded-2xl border border-pink-100">
                  {INTERESTS_PRESETS.map((interest) => {
                    const active = gustos.includes(interest);
                    return (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          active 
                            ? 'bg-pink-500 text-white shadow-sm ring-1 ring-pink-400' 
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-pink-300'
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>

                <div className="bg-pink-50/50 p-4 rounded-xl">
                  <span className="text-xs font-bold text-gray-700 block mb-1">Tus hashtags seleccionados:</span>
                  <div className="flex flex-wrap gap-1">
                    {gustos.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">Ninguno seleccionado aún...</span>
                    ) : (
                      gustos.map(g => (
                        <span key={g} className="bg-white text-pink-600 px-2 py-0.5 rounded-full border border-pink-100 text-xs font-semibold">
                          {g}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 6: LOCATION & NOTIFICATIONS & SUBMIT */}
            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <MapPin className="text-pink-500 w-5 h-5" /> 6. Ubicación y Notificaciones
                </h3>

                {/* GEOLOCATION ACCORDION */}
                <div className="bg-pink-50/40 p-5 rounded-2xl border border-pink-100 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">Permitir Acceso a la Ubicación</h4>
                      <p className="text-[10px] text-gray-500">Es indispensable para calcular la distancia en kilómetros a otras personas en tiempo real en la pestaña Conecta.</p>
                    </div>
                    <button 
                      onClick={requestLocation}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        locationLat 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-pink-500 hover:bg-pink-600 text-white shadow-sm'
                      }`}
                    >
                      {locationLat ? '✓ Compartido' : 'Compartir GPS'}
                    </button>
                  </div>

                  {locationName && (
                    <div className="bg-white p-3 rounded-xl border border-pink-100 flex items-center gap-2 text-xs">
                      <MapPin className="w-4 h-4 text-pink-500 shrink-0" />
                      <div>
                        <span className="font-semibold text-gray-700">Autocompletado con éxito:</span>{' '}
                        <span className="text-pink-600 font-bold">{locationName}, {country}</span>
                        <span className="text-[9px] text-gray-400 block mt-0.5">(Nota: No podrás modificar esta ubicación real de GPS manualmente)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* NOTIFICATIONS CHECKBOX */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <button 
                    onClick={() => setAcceptedNotifications(!acceptedNotifications)}
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                      acceptedNotifications ? 'bg-pink-500 border-pink-500 text-white' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {acceptedNotifications && <Check className="w-4 h-4" />}
                  </button>
                  <div>
                    <span className="text-xs font-bold text-gray-700 block">Permitir Notificaciones</span>
                    <span className="text-[10px] text-gray-400">Recibe avisos inmediatos sobre mensajes y nuevos matches.</span>
                  </div>
                </div>

                {/* TERMS & CONDITIONS PREMIUM CHECKBOX */}
                <div className="p-4 bg-pink-50/20 border border-pink-100/60 rounded-xl space-y-2">
                  <div className="flex items-start gap-3">
                    <button 
                      onClick={() => setAcceptedTerms(!acceptedTerms)}
                      className="w-6 h-6 rounded-lg border flex items-center justify-center transition-colors shrink-0 mt-0.5 border-pink-300 bg-white"
                    >
                      {acceptedTerms && (
                        <motion.svg 
                          className="w-4 h-4 text-pink-500" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor" 
                          strokeWidth="3"
                        >
                          <motion.path 
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.3 }}
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            d="M5 13l4 4L19 7" 
                          />
                        </motion.svg>
                      )}
                    </button>
                    <div className="text-xs text-gray-600">
                      Declaro que he leído y acepto en su totalidad los{' '}
                      <span className="text-pink-600 font-semibold underline cursor-pointer">Términos de Servicio de Bloom</span> y las{' '}
                      <span className="text-pink-600 font-semibold underline cursor-pointer">Políticas de Privacidad de Datos</span>.
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CONTROL BUTTONS / NAVIGATION ARROWS */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-8">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`p-3 rounded-full border transition-all ${
                step === 1 
                  ? 'border-gray-100 text-gray-300 cursor-not-allowed' 
                  : 'border-pink-200 text-pink-500 hover:bg-pink-50 hover:border-pink-300'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {step < 6 ? (
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-full shadow-lg hover:shadow-pink-200 flex items-center gap-2 transition-all"
              >
                <span>{translations.es.next}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex flex-col items-end gap-2">
                {errorText && (
                  <span className="text-red-500 text-xs font-bold bg-red-50 px-2 py-1 rounded-md max-w-xs text-right">
                    {errorText}
                  </span>
                )}
                <button
                  onClick={handleSubmit}
                  className="px-8 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold rounded-full shadow-xl hover:shadow-pink-200 flex items-center gap-2 transition-all animate-bounce"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>{translations.es.completeOnboarding}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* POPUP WARNINGS */}
      {/* Age public warning */}
      {showAgeWarning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-pink-100 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-pink-500" />
            </div>
            <h4 className="text-md font-bold text-gray-800">¿Mostrar Edad públicamente?</h4>
            <p className="text-xs text-gray-500 mt-2">{translations.es.publicAgeWarn}</p>
            <div className="flex items-center gap-3 mt-6">
              <button 
                onClick={() => {
                  setShowAge(true);
                  setShowAgeWarning(false);
                }}
                className="flex-1 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-xs transition-colors"
              >
                {translations.es.confirm}
              </button>
              <button 
                onClick={() => {
                  setShowAge(false);
                  setShowAgeWarning(false);
                }}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
              >
                {translations.es.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orientation public warning */}
      {showOrientationWarning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-pink-100 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-pink-500" />
            </div>
            <h4 className="text-md font-bold text-gray-800">¿Mostrar Orientación Sexual?</h4>
            <p className="text-xs text-gray-500 mt-2">{translations.es.publicOrientationWarn}</p>
            <div className="flex items-center gap-3 mt-6">
              <button 
                onClick={() => {
                  setShowOrientation(true);
                  setShowOrientationWarning(false);
                }}
                className="flex-1 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-xs transition-colors"
              >
                {translations.es.confirm}
              </button>
              <button 
                onClick={() => {
                  setShowOrientation(false);
                  setShowOrientationWarning(false);
                }}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
              >
                {translations.es.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
