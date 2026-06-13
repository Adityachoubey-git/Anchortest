import React, { useState, useEffect } from 'react';
import { Settings, Sliders, List, HelpCircle, Save } from 'lucide-react';

interface ConfigPanelProps {
  onConfigChanged: () => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ onConfigChanged }) => {
  const [progressionType, setProgressionType] = useState<'ARITHMETIC' | 'CUSTOM_MAP'>('ARITHMETIC');
  const [startValue, setStartValue] = useState<number>(1);
  const [commonDifference, setCommonDifference] = useState<number>(2);
  const [customMap, setCustomMap] = useState<{ [key: string]: number }>({
    '1': 1,
    '2': 3,
    '3': 5,
    '4': 7,
    '5': 9,
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');


  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setProgressionType(data.config.progressionType);
          if (data.config.arithmeticConfig) {
            setStartValue(data.config.arithmeticConfig.startValue);
            setCommonDifference(data.config.arithmeticConfig.commonDifference);
          }
          if (data.config.customMap) {

            setCustomMap(data.config.customMap);
          }
        }
      })
      .catch((err) => console.error('Failed to load credit configuration:', err));
  }, []);

  const handleCustomMapChange = (depth: string, val: string) => {
    setCustomMap(prev => ({
      ...prev,
      [depth]: Number(val) || 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');

    try {
      const payload = {
        name: 'Active Forum Policy',
        progressionType,
        startValue,
        commonDifference,
        customMap: progressionType === 'CUSTOM_MAP' ? customMap : undefined
      };

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save config');

      setSuccessMsg('Credit configuration updated and activated!');
      onConfigChanged();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 glow-orange">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-bold text-white tracking-wide">Credit Engine Policies</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        <div className="flex gap-2 p-1 rounded-xl bg-slate-950 border border-slate-900">
          <button
            type="button"
            onClick={() => setProgressionType('ARITHMETIC')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${progressionType === 'ARITHMETIC'
              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-orange-500/40 text-orange-400'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Arithmetic Progression
          </button>
          <button
            type="button"
            onClick={() => setProgressionType('CUSTOM_MAP')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${progressionType === 'CUSTOM_MAP'
              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-orange-500/40 text-orange-400'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            <List className="w-3.5 h-3.5" />
            Custom Depth Map
          </button>
        </div>


        {progressionType === 'ARITHMETIC' && (
          <div className="space-y-4 p-4 rounded-xl bg-slate-950/40 border border-slate-900">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Start Value (a)
                </label>
                <input
                  type="number"
                  value={startValue}
                  onChange={(e) => setStartValue(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Difference (d)
                </label>
                <input
                  type="number"
                  value={commonDifference}
                  onChange={(e) => setCommonDifference(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                  min="0"
                />
              </div>
            </div>

            <div className="flex gap-2 text-slate-500 text-[11px] leading-relaxed pt-1.5 border-t border-slate-900">
              <HelpCircle className="w-4 h-4 flex-shrink-0 text-slate-600 mt-0.5" />
              <span>
                Calculates as: <code className="text-orange-400">a + (depth - 1) * d</code>. Currently:
                depth 1 = <strong>{startValue}</strong>, depth 2 = <strong>{startValue + commonDifference}</strong>, depth 3 = <strong>{startValue + commonDifference * 2}</strong> credits.
              </span>
            </div>
          </div>
        )}


        {progressionType === 'CUSTOM_MAP' && (
          <div className="space-y-4 p-4 rounded-xl bg-slate-950/40 border border-slate-900">
            <div className="text-[11px] text-slate-500 mb-2 leading-relaxed">
              Define explicit credit outputs for individual nested depth tiers.
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {['1', '2', '3', '4', '5'].map((depth) => (
                <div key={depth} className="flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-400 font-medium">Depth {depth} replies</span>
                  <input
                    type="number"
                    value={customMap[depth] ?? 1}
                    onChange={(e) => handleCustomMapChange(depth, e.target.value)}
                    className="w-24 bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-right text-white focus:outline-none focus:border-orange-500/50"
                    min="0"
                  />
                </div>
              ))}
            </div>
          </div>
        )}


        <div>
          {successMsg && (
            <div className="mb-3 text-xs font-semibold text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-3 py-2 rounded-lg text-center transition-all animate-pulse">
              {successMsg}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold shadow-lg shadow-orange-500/10 hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50 select-none"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving Changes...' : 'Save & Activate Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
export default ConfigPanel;
