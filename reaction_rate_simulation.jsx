import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Beaker, Play, RotateCcw, Thermometer, GaugeCircle, Sparkles } from 'lucide-react';

const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 330;
const PARTICLE_RADIUS = 6;
const PRODUCT_RADIUS = 7;
const DT = 0.04;
const TOTAL_TIME = 24;
const STEPS = Math.floor(TOTAL_TIME / DT);
const BASE_ACTIVATION_SPEED = 1.25;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createParticle(type, width, height, speedScale) {
  const angle = Math.random() * Math.PI * 2;
  const speed = (0.55 + Math.random() * 0.75) * speedScale;
  return {
    id: `${type}-${Math.random().toString(36).slice(2)}-${Date.now()}-${Math.random()}`,
    type,
    x: 24 + Math.random() * (width - 48),
    y: 24 + Math.random() * (height - 48),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    flash: 0,
  };
}

function computeSimulation({ concentrationA, concentrationB, temperature, catalyst }) {
  const speedScale = 0.7 + temperature / 38;
  const activationThreshold = BASE_ACTIVATION_SPEED - (temperature - 25) * 0.008 - (catalyst ? 0.16 : 0);
  const initialA = Math.round(12 + concentrationA * 12);
  const initialB = Math.round(12 + concentrationB * 12);

  let particles = [
    ...Array.from({ length: initialA }, () => createParticle('A', CANVAS_WIDTH, CANVAS_HEIGHT, speedScale)),
    ...Array.from({ length: initialB }, () => createParticle('B', CANVAS_WIDTH, CANVAS_HEIGHT, speedScale)),
  ];

  const series = [];
  const frames = [];
  let time = 0;

  for (let step = 0; step <= STEPS; step += 1) {
    let reactionEvents = 0;

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x <= PARTICLE_RADIUS || p.x >= CANVAS_WIDTH - PARTICLE_RADIUS) {
        p.vx *= -1;
        p.x = clamp(p.x, PARTICLE_RADIUS, CANVAS_WIDTH - PARTICLE_RADIUS);
      }
      if (p.y <= PARTICLE_RADIUS || p.y >= CANVAS_HEIGHT - PARTICLE_RADIUS) {
        p.vy *= -1;
        p.y = clamp(p.y, PARTICLE_RADIUS, CANVAS_HEIGHT - PARTICLE_RADIUS);
      }

      if (p.flash > 0) p.flash -= 1;
    }

    const removed = new Set();
    const created = [];

    for (let i = 0; i < particles.length; i += 1) {
      if (removed.has(i)) continue;
      for (let j = i + 1; j < particles.length; j += 1) {
        if (removed.has(j)) continue;

        const p1 = particles[i];
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distSq = dx * dx + dy * dy;
        const minDist = p1.type === 'P' || p2.type === 'P' ? PRODUCT_RADIUS + PARTICLE_RADIUS : PARTICLE_RADIUS * 2;

        if (distSq <= minDist * minDist) {
          const relativeSpeed = Math.hypot(p1.vx - p2.vx, p1.vy - p2.vy);
          const isReactivePair =
            (p1.type === 'A' && p2.type === 'B') ||
            (p1.type === 'B' && p2.type === 'A');

          if (isReactivePair && relativeSpeed >= activationThreshold) {
            removed.add(i);
            removed.add(j);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const angle = Math.random() * Math.PI * 2;
            const productSpeed = (0.5 + Math.random() * 0.6) * speedScale * 0.85;
            created.push({
              id: `P-${step}-${i}-${j}-${Math.random()}`,
              type: 'P',
              x: midX,
              y: midY,
              vx: Math.cos(angle) * productSpeed,
              vy: Math.sin(angle) * productSpeed,
              flash: 10,
            });
            reactionEvents += 1;
            break;
          }

          const distance = Math.sqrt(distSq) || 1;
          const nx = dx / distance;
          const ny = dy / distance;
          const dvx = p1.vx - p2.vx;
          const dvy = p1.vy - p2.vy;
          const impulse = dvx * nx + dvy * ny;

          if (impulse < 0) {
            p1.vx -= impulse * nx;
            p1.vy -= impulse * ny;
            p2.vx += impulse * nx;
            p2.vy += impulse * ny;
          }

          const overlap = minDist - distance;
          if (overlap > 0) {
            p1.x += (overlap / 2) * nx;
            p1.y += (overlap / 2) * ny;
            p2.x -= (overlap / 2) * nx;
            p2.y -= (overlap / 2) * ny;
          }

          p1.flash = 2;
          p2.flash = 2;
        }
      }
    }

    particles = particles.filter((_, idx) => !removed.has(idx)).concat(created);

    const countA = particles.filter((p) => p.type === 'A').length;
    const countB = particles.filter((p) => p.type === 'B').length;
    const countP = particles.filter((p) => p.type === 'P').length;
    const rate = reactionEvents / DT;

    series.push({
      time: Number(time.toFixed(1)),
      reactant1: countA,
      reactant2: countB,
      product: countP,
      rate: Number(rate.toFixed(2)),
      cumulativeProduct: countP,
    });

    if (step % 2 === 0) {
      frames.push(
        particles.map((p) => ({
          x: p.x,
          y: p.y,
          type: p.type,
          flash: p.flash,
        }))
      );
    }

    time += DT;
  }

  const smoothSeries = series.map((point, index) => {
    const neighbors = series.slice(Math.max(0, index - 3), Math.min(series.length, index + 4));
    const avgRate = neighbors.reduce((sum, item) => sum + item.rate, 0) / neighbors.length;
    return {
      ...point,
      smoothRate: Number(avgRate.toFixed(2)),
    };
  });

  return {
    frames,
    series: smoothSeries,
    stats: {
      initialA,
      initialB,
      finalA: smoothSeries[smoothSeries.length - 1]?.reactant1 ?? 0,
      finalB: smoothSeries[smoothSeries.length - 1]?.reactant2 ?? 0,
      finalP: smoothSeries[smoothSeries.length - 1]?.product ?? 0,
      activationThreshold: Number(activationThreshold.toFixed(2)),
      speedScale: Number(speedScale.toFixed(2)),
    },
  };
}

function ParticleLegend() {
  return (
    <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-3">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-sky-500" /> 반응물 1 (A)
      </div>
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-violet-500" /> 반응물 2 (B)
      </div>
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-emerald-500" /> 생성물 (P)
      </div>
    </div>
  );
}

function ParticleSimulation({ frames, isRunning }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    frameRef.current = 0;
  }, [frames]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !frames.length) return;

    let animationId;

    const drawFrame = () => {
      const current = frames[frameRef.current] || [];
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, CANVAS_WIDTH - 2, CANVAS_HEIGHT - 2);

      current.forEach((particle) => {
        const radius = particle.type === 'P' ? PRODUCT_RADIUS : PARTICLE_RADIUS;
        if (particle.type === 'A') ctx.fillStyle = '#0ea5e9';
        if (particle.type === 'B') ctx.fillStyle = '#8b5cf6';
        if (particle.type === 'P') ctx.fillStyle = '#10b981';

        if (particle.flash > 0) {
          ctx.beginPath();
          ctx.fillStyle = 'rgba(251, 191, 36, 0.28)';
          ctx.arc(particle.x, particle.y, radius + 5, 0, Math.PI * 2);
          ctx.fill();
          if (particle.type === 'A') ctx.fillStyle = '#0ea5e9';
          if (particle.type === 'B') ctx.fillStyle = '#8b5cf6';
          if (particle.type === 'P') ctx.fillStyle = '#10b981';
        }

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      if (isRunning) {
        frameRef.current = (frameRef.current + 1) % frames.length;
      }
      animationId = requestAnimationFrame(drawFrame);
    };

    drawFrame();
    return () => cancelAnimationFrame(animationId);
  }, [frames, isRunning]);

  return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full rounded-2xl bg-white shadow-inner" />;
}

export default function ReactionRateSimulation() {
  const [concentrationA, setConcentrationA] = useState(1.3);
  const [concentrationB, setConcentrationB] = useState(1.1);
  const [temperature, setTemperature] = useState(35);
  const [catalyst, setCatalyst] = useState(true);
  const [seed, setSeed] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  const simulation = useMemo(
    () => computeSimulation({ concentrationA, concentrationB, temperature, catalyst, seed }),
    [concentrationA, concentrationB, temperature, catalyst, seed]
  );

  const { frames, series, stats } = simulation;
  const peakRate = Math.max(...series.map((d) => d.smoothRate));

  const rerun = () => {
    setSeed((prev) => prev + 1);
    setIsRunning(true);
  };

  const reset = () => {
    setConcentrationA(1.3);
    setConcentrationB(1.1);
    setTemperature(35);
    setCatalyst(true);
    setSeed((prev) => prev + 1);
    setIsRunning(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm shadow-sm">
              <Beaker className="h-4 w-4" /> 충돌 기반 화학 반응 시뮬레이션
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">반응물 A + 반응물 B → 생성물 P</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 md:text-base">
              입자 충돌이 충분한 에너지를 가지면 반응이 일어나고, 반응물 1개씩이 사라지면서 생성물 1개가 만들어집니다. 오른쪽 그래프는
              그 결과를 기반으로 시간에 따른 개수 변화와 반응속도를 보여줍니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsRunning((v) => !v)} className="rounded-2xl">
              <Play className="mr-2 h-4 w-4" /> {isRunning ? '애니메이션 일시정지' : '애니메이션 재생'}
            </Button>
            <Button variant="outline" onClick={rerun} className="rounded-2xl">
              <Sparkles className="mr-2 h-4 w-4" /> 다시 시뮬레이션
            </Button>
            <Button variant="outline" onClick={reset} className="rounded-2xl">
              <RotateCcw className="mr-2 h-4 w-4" /> 초기화
            </Button>
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.02fr_1.2fr]">
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <Card className="rounded-3xl border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">입자 충돌 시각화</CardTitle>
                <CardDescription>파란색(A)과 보라색(B)이 충분한 에너지로 충돌하면 초록색 생성물(P)로 바뀝니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <ParticleLegend />
                <ParticleSimulation frames={frames} isRunning={isRunning} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-2 flex items-center justify-between text-sm font-medium">
                      <span>반응물 A 초기 농도</span>
                      <span>{concentrationA.toFixed(1)}</span>
                    </div>
                    <Slider value={[concentrationA]} min={0.4} max={2.0} step={0.1} onValueChange={(v) => setConcentrationA(v[0])} />
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-2 flex items-center justify-between text-sm font-medium">
                      <span>반응물 B 초기 농도</span>
                      <span>{concentrationB.toFixed(1)}</span>
                    </div>
                    <Slider value={[concentrationB]} min={0.4} max={2.0} step={0.1} onValueChange={(v) => setConcentrationB(v[0])} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm font-medium">
                    <span className="inline-flex items-center gap-2"><Thermometer className="h-4 w-4" /> 온도</span>
                    <span>{temperature} °C</span>
                  </div>
                  <Slider value={[temperature]} min={10} max={95} step={1} onValueChange={(v) => setTemperature(v[0])} />
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">촉매 사용</p>
                    <p className="text-xs text-slate-500">촉매를 켜면 필요한 활성화 충돌 조건이 낮아져 반응 성공 확률이 올라갑니다.</p>
                  </div>
                  <Button variant={catalyst ? 'default' : 'outline'} className="rounded-2xl" onClick={() => setCatalyst((v) => !v)}>
                    {catalyst ? '사용 중' : '사용 안 함'}
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                    <p className="text-xs text-slate-500">초기 A / B</p>
                    <p className="mt-1 text-lg font-semibold">{stats.initialA} / {stats.initialB}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                    <p className="text-xs text-slate-500">속도 배율</p>
                    <p className="mt-1 text-lg font-semibold">{stats.speedScale}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                    <p className="text-xs text-slate-500">활성화 기준</p>
                    <p className="mt-1 text-lg font-semibold">{stats.activationThreshold}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <Card className="rounded-3xl border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">유의미하게 바꾼 반응속도 그래프</CardTitle>
                <CardDescription>
                  단순 임의 곡선이 아니라 실제 충돌-반응 시뮬레이션에서 기록한 데이터를 사용합니다. 반응물은 감소하고 생성물은 증가하며,
                  반응속도는 초기에 크고 시간이 갈수록 줄어듭니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl bg-slate-100 p-4">
                    <p className="text-xs text-slate-500">최대 반응속도</p>
                    <p className="mt-1 text-2xl font-bold">{peakRate.toFixed(2)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 p-4">
                    <p className="text-xs text-slate-500">최종 생성물 수</p>
                    <p className="mt-1 text-2xl font-bold">{stats.finalP}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 p-4">
                    <p className="text-xs text-slate-500">남은 반응물 A</p>
                    <p className="mt-1 text-2xl font-bold">{stats.finalA}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 p-4">
                    <p className="text-xs text-slate-500">남은 반응물 B</p>
                    <p className="mt-1 text-2xl font-bold">{stats.finalB}</p>
                  </div>
                </div>

                <div className="h-[360px] w-full rounded-3xl bg-white p-2 ring-1 ring-slate-200">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series} margin={{ top: 16, right: 20, left: 2, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" label={{ value: '시간 (s)', position: 'insideBottom', offset: -4 }} />
                      <YAxis yAxisId="left" label={{ value: '입자 수', angle: -90, position: 'insideLeft' }} />
                      <YAxis yAxisId="right" orientation="right" label={{ value: '반응속도', angle: 90, position: 'insideRight' }} />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="reactant1" name="반응물 A" stroke="#0ea5e9" strokeWidth={3} dot={false} />
                      <Line yAxisId="left" type="monotone" dataKey="reactant2" name="반응물 B" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                      <Line yAxisId="left" type="monotone" dataKey="product" name="생성물 P" stroke="#10b981" strokeWidth={3} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="smoothRate" name="반응속도" stroke="#f59e0b" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-3xl border border-slate-200 p-5">
                  <div className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <GaugeCircle className="h-5 w-5" /> 그래프 해석
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    반응 초반에는 A와 B가 많이 남아 있어 충돌 기회가 크므로 반응속도가 높게 시작합니다. 시간이 지나면서 반응물 입자 수가 감소해
                    유효 충돌 빈도가 줄고, 그래서 반응속도 곡선도 점차 낮아집니다. 생성물 곡선은 누적되어 증가하며, 제한 반응물에 가까워질수록
                    증가 폭도 완만해집니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
