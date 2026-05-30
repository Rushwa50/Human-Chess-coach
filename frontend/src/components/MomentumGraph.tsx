import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import type { Move, Mistake } from "../types";

interface MomentumGraphProps {
  moves: Move[];
  mistakes: Mistake[];
  gameStory?: string;
  compact?: boolean;
}

export default function MomentumGraph({ moves, mistakes, gameStory, compact = false }: MomentumGraphProps) {
  const data = useMemo(() => {
    return moves.map((move) => {
      const isWhite = move.move_number % 2 !== 0;
      // eval_after is from the perspective of the player who just moved
      const whiteEval = isWhite ? (move.eval_after ?? 0) : -(move.eval_after ?? 0);
      return {
        id: move.id,
        move_number: move.move_number,
        displayMove: isWhite ? `${Math.ceil(move.move_number / 2)}.` : `${Math.ceil(move.move_number / 2)}...`,
        eval: Math.max(-10, Math.min(10, whiteEval)), // Cap at +/- 10
        raw_eval: whiteEval,
        drop: move.eval_drop,
      };
    });
  }, [moves]);

  const peakAdvantage = useMemo(() => {
    if (!data.length) return null;
    return data.reduce((prev, current) => (prev.eval > current.eval ? prev : current));
  }, [data]);

  const criticalBlunder = useMemo(() => {
    if (!data.length) return null;
    return data.reduce((prev, current) => (prev.drop > current.drop ? prev : current));
  }, [data]);

  if (compact) {
    return (
      <div className="h-[120px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: -40, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEvalCompact" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5}/>
                <stop offset="50%" stopColor="#38bdf8" stopOpacity={0}/>
                <stop offset="50%" stopColor="#fb7185" stopOpacity={0}/>
                <stop offset="95%" stopColor="#fb7185" stopOpacity={0.5}/>
              </linearGradient>
            </defs>
            <YAxis domain={[-10, 10]} tick={false} axisLine={false} />
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="eval" stroke="#38bdf8" fillOpacity={1} fill="url(#colorEvalCompact)" strokeWidth={1.5} />
            {peakAdvantage && <ReferenceLine x={peakAdvantage.displayMove} stroke="#10b981" />}
            {criticalBlunder && criticalBlunder.drop > 1.5 && <ReferenceLine x={criticalBlunder.displayMove} stroke="#ef4444" />}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="rounded-2xl glass-panel p-6 shadow-xl mb-8 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-sky-500/10 blur-[50px] rounded-full"></div>
      
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white tracking-wide mb-1">Game Momentum Graph</h2>
        <p className="text-sm text-coach-muted">Evaluation over time (capped at +/- 10). Positive = White advantage.</p>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEval" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
                <stop offset="50%" stopColor="#38bdf8" stopOpacity={0}/>
                <stop offset="50%" stopColor="#fb7185" stopOpacity={0}/>
                <stop offset="95%" stopColor="#fb7185" stopOpacity={0.8}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
              dataKey="displayMove" 
              stroke="#64748b" 
              tick={{ fill: '#64748b', fontSize: 12 }} 
              minTickGap={30}
            />
            <YAxis 
              domain={[-10, 10]} 
              stroke="#64748b" 
              tick={{ fill: '#64748b', fontSize: 12 }} 
              tickCount={5}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
              itemStyle={{ color: '#38bdf8' }}
              labelStyle={{ fontWeight: 'bold', marginBottom: '0.25rem' }}
              formatter={(value: number, name: string, props: any) => [props.payload.raw_eval.toFixed(2), "Evaluation"]}
              labelFormatter={(label) => `Move ${label}`}
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
            {peakAdvantage && (
              <ReferenceLine x={peakAdvantage.displayMove} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'top', value: 'Peak', fill: '#10b981', fontSize: 12 }} />
            )}
            {criticalBlunder && criticalBlunder.drop > 1.5 && (
              <ReferenceLine x={criticalBlunder.displayMove} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'bottom', value: 'Blunder', fill: '#ef4444', fontSize: 12 }} />
            )}
            <Area 
              type="monotone" 
              dataKey="eval" 
              stroke="#38bdf8" 
              fillOpacity={1} 
              fill="url(#colorEval)" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {gameStory && (
        <div className="mt-8 bg-slate-800/40 p-5 rounded-xl border border-slate-700/50">
          <h3 className="text-sm font-bold text-sky-400 tracking-wider uppercase mb-3">AI Game Story</h3>
          <p className="text-slate-300 whitespace-pre-line leading-relaxed text-[15px]">
            {gameStory}
          </p>
        </div>
      )}
    </div>
  );
}
