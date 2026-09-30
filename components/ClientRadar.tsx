import React, { useEffect, useMemo, useState } from 'react';
import { Radar, RefreshCw, Search, List, Columns3, ArrowUpRight, Clock3 } from 'lucide-react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { get } from '../services/api';
import { Area } from '../types';

interface Row {
  id: string; name: string; client_id: string | null; client_name: string | null;
  area_id: string; status: string; created_at: string; total: number; completed: number;
  pending: number; overdue: number; last_completed_at: string | null; undated_completed: number;
  last_completion_estimated: boolean;
  parent_id: string | null;
}
const lanes = [
  { id: 'unknown', title: 'Sem conclusão registrada', color: 'border-slate-400', hint: 'Primeira entrega ou histórico sem data' },
  { id: 'critical', title: 'Precisa de atenção', color: 'border-rose-500', hint: 'Com atraso ou 14+ dias sem conclusão' },
  { id: 'watch', title: 'Retomar contato', color: 'border-amber-400', hint: 'De 7 a 13 dias sem conclusão' },
  { id: 'fresh', title: 'Em dia', color: 'border-teal-500', hint: 'Conclusão nos últimos 6 dias, sem atrasos' },
];
const days = (date: string) => Math.max(0, differenceInCalendarDays(new Date(), parseISO(date)));
const lane = (r: Row) => r.overdue > 0 ? 'critical' : !r.last_completed_at ? 'unknown' : days(r.last_completed_at) >= 14 ? 'critical' : days(r.last_completed_at) >= 7 ? 'watch' : 'fresh';
const recency = (r: Row) => r.last_completed_at ? `${days(r.last_completed_at)} dias sem conclusão` : r.completed ? 'Conclusões antigas sem data' : 'Nenhuma atividade concluída';

export function ClientRadar({ areas, onOpen }: { areas: Area[]; onOpen: (id: string) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState<Date | null>(null);
  const [view, setView] = useState(() => localStorage.getItem('nuvyo-radar-view') === 'kanban' ? 'kanban' : 'list');
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('');
  const [client, setClient] = useState('');
  const [includeClosed, setIncludeClosed] = useState(false);
  const [projectType, setProjectType] = useState('all');
  const projectNames = useMemo(() => new Map(rows.map(r => [r.id, r.name])), [rows]);
  const parentLabel = (r: Row) => r.parent_id ? `Subprojeto de ${projectNames.get(r.parent_id) || 'projeto não disponível'}` : 'Projeto principal';
  const refresh = async () => {
    setLoading(true); setError('');
    try { setRows(await get('/projects/radar')); setUpdated(new Date()); }
    catch { setError('Não foi possível atualizar o radar. Tente novamente.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  const visible = useMemo(() => rows.filter(r =>
    (!area || r.area_id === area) && (!client || (r.client_id || 'none') === client) &&
    (includeClosed || !['Concluído', 'Cancelado'].includes(r.status)) &&
    (projectType === 'all' || (projectType === 'children' ? Boolean(r.parent_id) : !r.parent_id)) &&
    `${r.name} ${r.client_name || ''} ${projectNames.get(r.parent_id || '') || ''}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))
  ).sort((a, b) => {
    if (!a.last_completed_at && b.last_completed_at) return -1;
    if (a.last_completed_at && !b.last_completed_at) return 1;
    return (a.last_completed_at || a.created_at).localeCompare(b.last_completed_at || b.created_at) || b.overdue - a.overdue;
  }), [rows, area, client, search, includeClosed, projectType, projectNames]);
  const clients = Array.from(new Map(rows.filter(r => r.client_id).map(r => [r.client_id!, r.client_name!])).entries());
  // A client's recency uses its MOST RECENT delivery across all visible projects.
  const clientAlerts = useMemo(() => {
    const groups = new Map<string, { name: string; latest: string | null; project: string; estimated: boolean }>();
    visible.forEach(r => {
      const key = r.client_id || r.id;
      const old = groups.get(key);
      if (!old) groups.set(key, { name: r.client_name || r.name, latest: r.last_completed_at, project: r.id, estimated: r.last_completion_estimated });
      else if (r.last_completed_at && (!old.latest || r.last_completed_at >= old.latest)) {
        old.estimated = r.last_completed_at === old.latest ? old.estimated || r.last_completion_estimated : r.last_completion_estimated;
        old.latest = r.last_completed_at;
      }
    });
    return [...groups.values()].sort((a, b) => (a.latest || '').localeCompare(b.latest || ''));
  }, [visible]);
  const input = 'rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm';
  const last = (r: Row) => <div className="text-sm"><div>{r.last_completed_at ? format(parseISO(r.last_completed_at), 'dd/MM/yyyy') : 'Sem data registrada'}{r.last_completion_estimated && <span className="ml-2 text-xs text-amber-700 dark:text-amber-300" title="Estimativa baseada na última alteração da atividade antiga">Data estimada</span>}</div><div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{r.undated_completed > 0 ? `${r.undated_completed} conclusão(ões) sem data no histórico` : recency(r)}</div></div>;
  return <section className="space-y-6 text-gray-900 dark:text-gray-100" aria-label="Radar de clientes">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div><div className="flex items-center gap-3"><span className="rounded-2xl bg-[#E6FAFC] text-[#374A67] p-3"><Radar size={25} /></span><h2 className="text-3xl font-bold">Radar de clientes</h2></div><p className="mt-3 text-gray-500 dark:text-gray-400">Saiba onde retomar o trabalho antes que um cliente fique para trás.</p></div>
      <button onClick={refresh} disabled={loading} className={`${input} flex items-center justify-center gap-2 disabled:opacity-50`}><RefreshCw size={17} className={loading ? 'animate-spin' : ''} />{loading ? 'Atualizando…' : 'Atualizar radar'}</button>
    </div>
    {error && <div role="alert" className="rounded-xl bg-red-50 text-red-700 p-4">{error} {updated && 'Os dados abaixo são da última atualização bem-sucedida.'}</div>}
    {updated && <>
      <div className="rounded-2xl bg-[#0E1116] text-white p-5 sm:p-6">
        <h3 className="font-semibold text-lg flex gap-2 items-center"><Clock3 size={20} className="text-[#E6FAFC]" />Quem merece sua atenção hoje?</h3>
        <p className="mt-1 text-sm text-slate-300">Clientes há mais tempo sem entregas concluídas, dentro dos filtros selecionados.</p>
        <div className="flex gap-3 overflow-x-auto mt-5 pb-2">{clientAlerts.map((c, i) => <button key={c.project} onClick={() => onOpen(c.project)} className="min-w-[210px] max-w-[280px] text-left border border-slate-600 rounded-xl p-4 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-cyan-200"><span className="text-xs text-slate-400">PRIORIDADE {i + 1}</span><div className="font-semibold mt-1 break-words">{c.name}</div><div className="text-sm text-cyan-100 mt-2">{c.latest ? `${days(c.latest)} dias sem conclusão${c.estimated ? ' · Data estimada' : ' registrada'}` : 'Sem conclusão com data registrada'}</div></button>)}</div>
        <p className="text-xs text-slate-400 mt-2">Deslize para ver todos os {clientAlerts.length} destaques. Sem vínculo de cliente, projetos e subprojetos aparecem pelo próprio nome. Registros sem data aparecem primeiro para revisão.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[
        ['Projetos acompanhados', visible.length], ['Atividades realizadas', visible.reduce((n, r) => n + r.completed, 0)],
        ['A realizar', visible.reduce((n, r) => n + r.pending, 0)], ['Atrasadas', visible.reduce((n, r) => n + r.overdue, 0)],
      ].map(([label, value], i) => <div key={label} className={`rounded-2xl p-5 border ${i === 3 ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200 dark:border-rose-900' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}><p className="text-sm">{label}</p><p className="text-3xl font-bold mt-2 tabular-nums">{value}</p></div>)}</div>
    </>}
    <div className="flex flex-wrap gap-3 items-center">
      <select aria-label="Filtrar tipo de projeto" className={input} value={projectType} onChange={e => setProjectType(e.target.value)}><option value="all">Projetos e subprojetos</option><option value="parents">Somente projetos principais</option><option value="children">Somente subprojetos</option></select>
      <label className={`${input} flex gap-2 items-center flex-1 min-w-[200px]`}><Search size={17} /><input aria-label="Buscar projeto ou cliente" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar projeto ou cliente…" className="bg-transparent outline-none w-full" /></label>
      <select aria-label="Filtrar área" className={input} value={area} onChange={e => setArea(e.target.value)}><option value="">Todas as áreas</option>{areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
      <select aria-label="Filtrar cliente" className={input} value={client} onChange={e => setClient(e.target.value)}><option value="">Todos os clientes</option><option value="none">Sem cliente vinculado</option>{clients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
      <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">{[['list', 'Lista', List], ['kanban', 'Kanban', Columns3]].map(([id, label, Icon]: any) => <button key={id} aria-pressed={view === id} onClick={() => { setView(id); localStorage.setItem('nuvyo-radar-view', id); }} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${view === id ? 'bg-[#374A67] text-white' : ''}`}><Icon size={16} />{label}</button>)}</div>
    </div>
    <div className="flex flex-wrap justify-between gap-2 text-sm text-gray-500 dark:text-gray-400"><label className="flex items-center gap-2"><input type="checkbox" checked={includeClosed} onChange={e => setIncludeClosed(e.target.checked)} />Incluir concluídos e cancelados</label><span>{updated ? `Atualizado às ${format(updated, 'HH:mm')} · Mais antigos primeiro` : 'Carregando indicadores…'}</span></div>
    {updated && visible.length === 0 ? <div className="p-12 text-center rounded-2xl border border-dashed border-gray-300">Nenhum projeto encontrado. Ajuste os filtros ou cadastre um projeto.</div> : updated && view === 'list' ?
      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"><table className="w-full text-left text-sm"><thead className="bg-gray-50 dark:bg-gray-900"><tr>{['Projeto / cliente', 'Realizadas', 'A realizar', 'Atrasadas', 'Última conclusão', 'Acompanhamento'].map(t => <th key={t} className="p-4 whitespace-nowrap font-semibold">{t}</th>)}</tr></thead><tbody>{visible.map(r => <tr key={r.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40"><td className="p-4 min-w-[220px]"><button onClick={() => onOpen(r.id)} className="font-semibold text-left hover:underline flex gap-2 items-center">{r.name}<ArrowUpRight size={15} className="shrink-0" /></button><p className="text-xs text-[#374A67] dark:text-cyan-200 mt-1">{parentLabel(r)}</p><div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{r.client_name || 'Sem cliente vinculado'}</div></td><td className="p-4 tabular-nums">{r.completed}</td><td className="p-4 tabular-nums">{r.pending}</td><td className={`p-4 tabular-nums ${r.overdue ? 'text-rose-600 dark:text-rose-300 font-bold' : ''}`}>{r.overdue}</td><td className="p-4 min-w-[210px]">{last(r)}</td><td className="p-4"><span className={`block border-l-4 pl-3 ${lanes.find(l => l.id === lane(r))!.color}`}>{lanes.find(l => l.id === lane(r))!.title}</span></td></tr>)}</tbody></table></div>
      : updated && <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">{lanes.map(l => <div key={l.id} className={`rounded-2xl border-t-4 ${l.color} bg-gray-100 dark:bg-gray-800/50 p-3`}><h3 className="font-semibold flex justify-between gap-2">{l.title}<span>{visible.filter(r => lane(r) === l.id).length}</span></h3><p className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-4">{l.hint}</p><div className="space-y-3">{visible.filter(r => lane(r) === l.id).map(r => <article key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{r.client_name || 'Sem cliente vinculado'}</p><button onClick={() => onOpen(r.id)} className="font-bold text-left hover:underline flex gap-2 items-center">{r.name}<ArrowUpRight size={16} className="shrink-0" /></button><p className="text-xs text-[#374A67] dark:text-cyan-200 mt-2">{parentLabel(r)}</p><div className="grid grid-cols-3 gap-2 my-4 text-center">{[[r.completed, 'Feitas'], [r.pending, 'A fazer'], [r.overdue, 'Atrasadas']].map(([n, title]) => <div key={title} className="rounded-lg bg-gray-50 dark:bg-gray-900 p-2"><strong className="text-lg block">{n}</strong><span className="text-xs text-gray-500 dark:text-gray-400">{title}</span></div>)}</div><div className="border-t border-gray-100 dark:border-gray-700 pt-3">{last(r)}</div></article>)}{!visible.some(r => lane(r) === l.id) && <p className="p-5 text-sm text-gray-500 dark:text-gray-400 text-center">Nenhum projeto nesta faixa.</p>}</div></div>)}</div>}
    <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">Atrasadas são parte das atividades a realizar, com prazo anterior a hoje. Subtarefas não são contadas separadamente. O kanban organiza automaticamente a atenção, sem alterar o status dos projetos. Datas estimadas usam a última alteração das atividades antigas, preservada na migração. Novas conclusões usam a data real.</p>
  </section>;
}
