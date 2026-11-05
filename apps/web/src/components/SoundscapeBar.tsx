import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Headphones,
  Music,
  Bell,
  Waves,
  CloudRain,
  Sparkles,
  Zap,
  Sliders,
  X,
  Check,
} from 'lucide-react';
import {
  soundEngine,
  SoundMode,
  AmbientLayerKey,
  LayerConfig,
} from '../lib/soundEngine';
import * as api from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SoundscapeBarProps {
  className?: string;
  compact?: boolean;
}

const EqualizerBars: React.FC = () => (
  <span className="inline-flex items-end gap-[2.5px] h-3 px-1" title="Synthesizing audio">
    <span className="w-[2.5px] h-2.5 bg-emerald-400 rounded-full animate-pulse [animation-duration:550ms]" />
    <span className="w-[2.5px] h-3 bg-emerald-400 rounded-full animate-pulse [animation-duration:400ms]" />
    <span className="w-[2.5px] h-1.5 bg-emerald-400 rounded-full animate-pulse [animation-duration:700ms]" />
  </span>
);

export const SoundscapeBar: React.FC<SoundscapeBarProps> = ({
  className = '',
  compact = false,
}) => {
  const [currentMode, setCurrentMode] = useState<SoundMode>(soundEngine.getMode());
  const [isPlaying, setIsPlaying] = useState<boolean>(soundEngine.isPlaying());
  const [volume, setVolume] = useState<number>(() => soundEngine.getVolume());
  const [isMuted, setIsMuted] = useState(soundEngine.isSoundMuted());
  const [isOpen, setIsOpen] = useState(false);
  const [layers, setLayers] = useState<Record<AmbientLayerKey, LayerConfig>>(soundEngine.getLayers());
  const [mixSavedFeedback, setMixSavedFeedback] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: userSettings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => api.getSettings(),
    staleTime: 60000,
  });

  const saveMixMutation = useMutation({
    mutationFn: (mix: Record<string, number>) =>
      api.updateSettings({ ambient_layers: mix }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      setMixSavedFeedback(true);
      setTimeout(() => setMixSavedFeedback(false), 2000);
    },
  });

  // Apply saved mix from settings when loaded
  useEffect(() => {
    if (userSettings?.ambient_layers) {
      Object.entries(userSettings.ambient_layers).forEach(([k, vol]) => {
        soundEngine.setLayerVolume(k as AmbientLayerKey, vol as number);
      });
    }
  }, [userSettings?.ambient_layers]);

  useEffect(() => {
    soundEngine.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    const handleSoundChange = () => {
      setIsPlaying(soundEngine.isPlaying());
      setCurrentMode(soundEngine.getMode());
      setIsMuted(soundEngine.isSoundMuted());
      setLayers(soundEngine.getLayers());
    };
    window.addEventListener('focusforge-sound-changed', handleSoundChange);
    return () => window.removeEventListener('focusforge-sound-changed', handleSoundChange);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleLayer = async (key: AmbientLayerKey) => {
    const targetState = !layers[key].enabled;
    await soundEngine.setLayerState(key, targetState);
  };

  const handleLayerVolume = (key: AmbientLayerKey, vol: number) => {
    soundEngine.setLayerVolume(key, vol);
  };

  const handlePreset = async (preset: 'rainy_study' | 'deep_rumble' | 'zen_flow' | 'alpha_state') => {
    await soundEngine.applyPreset(preset);
  };

  const handleStopAll = () => {
    soundEngine.stopAmbient();
  };

  const activeLayerCount = (Object.keys(layers) as AmbientLayerKey[]).filter(
    (k) => layers[k].enabled
  ).length;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Pill Trigger */}
      <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 shadow-md">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            isPlaying
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Open Multi-Track Ambient Mixer"
        >
          <Headphones className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">
            {isPlaying ? (
              activeLayerCount > 1
                ? `Mixer (${activeLayerCount} active)`
                : layers.lofi.enabled
                ? 'Lofi Chill'
                : layers.rain.enabled
                ? 'Rain Drops'
                : layers.brown.enabled
                ? 'Brown Noise'
                : 'Ambient Audio'
            ) : (
              'Soundscape'
            )}
          </span>
          {isPlaying && <EqualizerBars />}
        </button>

        {/* Master Mute / Unmute */}
        <button
          onClick={() => soundEngine.setMuted(!isMuted)}
          className={`p-1.5 rounded-lg transition ${
            isMuted ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Multi-Track Ambient Mixer Dropdown Modal */}
      {isOpen && (
        <div className="absolute right-0 bottom-full mb-3 w-84 sm:w-96 bg-slate-950/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl p-5 z-50 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Ambient Sound Mixer</h3>
            </div>
            <div className="flex items-center gap-2">
              {isPlaying && (
                <button
                  onClick={handleStopAll}
                  className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 px-2 py-0.5 rounded bg-rose-950/40 border border-rose-800/50"
                >
                  Stop All
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mb-4">
            <label className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
              Curated Flow Presets
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handlePreset('rainy_study')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-left transition flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-white">Rain & Lofi</div>
                  <div className="text-[10px] text-slate-400">Rain + Rhodes Chords</div>
                </div>
                <CloudRain className="w-3.5 h-3.5 text-blue-400" />
              </button>
              <button
                onClick={() => handlePreset('deep_rumble')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-left transition flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-white">Deep Masking</div>
                  <div className="text-[10px] text-slate-400">Brown Noise + Drone</div>
                </div>
                <Waves className="w-3.5 h-3.5 text-amber-400" />
              </button>
              <button
                onClick={() => handlePreset('zen_flow')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-left transition flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-white">Zen Space</div>
                  <div className="text-[10px] text-slate-400">Pads + Soft Rain</div>
                </div>
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              </button>
              <button
                onClick={() => handlePreset('alpha_state')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-left transition flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-white">Alpha 14Hz</div>
                  <div className="text-[10px] text-slate-400">Binaural Waves</div>
                </div>
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </div>

            <div className="mt-2.5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const mix: Record<string, number> = {};
                  Object.entries(layers).forEach(([k, l]) => {
                    if (l.enabled) mix[k] = l.volume;
                  });
                  saveMixMutation.mutate(mix);
                }}
                disabled={saveMixMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 hover:text-white text-[11px] font-semibold transition"
              >
                <span>{mixSavedFeedback ? 'Mix Saved to Cloud! ✨' : '💾 Save Current Mix'}</span>
              </button>
            </div>
          </div>

          {/* Multi-Track Faders */}
          <div className="space-y-3 mb-4">
            <label className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block">
              Multi-Track Channels
            </label>

            {(Object.keys(layers) as AmbientLayerKey[]).map((key) => {
              const layer = layers[key];
              return (
                <div
                  key={key}
                  className={`p-2.5 rounded-xl border transition ${
                    layer.enabled
                      ? 'bg-blue-950/20 border-blue-500/40'
                      : 'bg-slate-900/60 border-slate-800/80 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      onClick={() => toggleLayer(key)}
                      className="flex items-center gap-2 text-xs font-semibold text-left text-white"
                    >
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                          layer.enabled
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-800 border-slate-700'
                        }`}
                      >
                        {layer.enabled && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <span>{layer.name}</span>
                    </button>
                    <span className="text-[11px] font-mono text-slate-400">
                      {Math.round(layer.volume * 100)}%
                    </span>
                  </div>

                  {layer.enabled && (
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={layer.volume}
                      onChange={(e) => handleLayerVolume(key, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Master Volume & Test Bells */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <Volume2 className="w-4 h-4 text-slate-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
            <button
              onClick={() => soundEngine.playSessionCompletionBell()}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1.5 border border-slate-800"
              title="Test Singing Bowl Chime"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px]">Chime</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SoundscapeBar;
