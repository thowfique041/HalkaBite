import { useMemo, useState } from 'react';
import { Activity, Clock, Laptop, LogOut, Search, ShieldAlert, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useGetAdminActiveSessionsQuery, useGetAdminAuditLogsQuery, useRevokeAdminSessionMutation, type AdminActiveSession } from '../../store/api/adminSecurityApi';

const formatDate = (value: string) => new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const SecurityAuditPage = () => {
  const [tab, setTab] = useState<'devices' | 'logs'>('devices');
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [result, setResult] = useState('');
  const [page, setPage] = useState(1);
  const { data: sessionData, isLoading: sessionsLoading } = useGetAdminActiveSessionsQuery(undefined, { pollingInterval: 30000 });
  const { data: logData, isLoading: logsLoading } = useGetAdminAuditLogsQuery({ page, search: search || undefined, method: method || undefined, result: result || undefined }, { pollingInterval: 30000 });
  const [revoke, { isLoading: revoking }] = useRevokeAdminSessionMutation();

  const groupedSessions = useMemo(() => {
    const groups = new Map<string, AdminActiveSession[]>();
    sessionData?.data?.forEach(session => {
      const id = session.user?._id || 'deleted';
      groups.set(id, [...(groups.get(id) || []), session]);
    });
    return [...groups.values()];
  }, [sessionData]);

  const logoutDevice = async (id: string, owner: string) => {
    if (!window.confirm(`Log out this ${owner} device?`)) return;
    try { await revoke(id).unwrap(); toast.success('Device logged out successfully'); }
    catch (error: unknown) {
      const message = typeof error === 'object' && error !== null && 'data' in error
        ? (error as { data?: { message?: string } }).data?.message
        : undefined;
      toast.error(message || 'Could not log out device');
    }
  };
  const summaryCards: Array<[string, number, LucideIcon, string]> = [
    ['Active devices', sessionData?.summary?.totalActiveSessions ?? 0, Laptop, 'text-cyan-400'],
    ['Online accounts', sessionData?.summary?.uniqueUsers ?? 0, Users, 'text-primary-400'],
    ['Multi-device accounts', sessionData?.summary?.multipleDeviceUsers ?? 0, ShieldAlert, 'text-amber-400'],
    ['Failed actions (24h)', logData?.summary?.failedLast24Hours ?? 0, Activity, 'text-red-400']
  ];

  return <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold">Security & System Logs</h1>
      <p className="mt-2 text-sm text-white/50">Monitor active account devices and review system activity.</p>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {summaryCards.map(([label, value, Icon, color]) => <div className="card p-5" key={label}><div className="flex items-center justify-between"><div><p className="text-sm text-white/50">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div><Icon className={`h-7 w-7 ${color}`} /></div></div>)}
    </div>

    <div className="flex gap-2 rounded-xl bg-white/5 p-1">
      <button onClick={() => setTab('devices')} className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition ${tab === 'devices' ? 'bg-primary-500 text-white' : 'text-white/60 hover:text-white'}`}>Active Devices</button>
      <button onClick={() => setTab('logs')} className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition ${tab === 'logs' ? 'bg-primary-500 text-white' : 'text-white/60 hover:text-white'}`}>System Audit Log</button>
    </div>

    {tab === 'devices' ? <div className="space-y-4">
      {sessionsLoading && <div className="card p-8 text-center text-white/50">Loading active devices…</div>}
      {!sessionsLoading && !groupedSessions.length && <div className="card p-8 text-center text-white/50">No active login sessions.</div>}
      {groupedSessions.map(sessions => {
        const owner = sessions[0]?.user;
        return <section className="card overflow-hidden" key={owner?._id || sessions[0]._id}>
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5"><div><h2 className="font-semibold">{owner?.name || 'Deleted user'}</h2><p className="text-sm text-white/45">{owner?.email || 'Unavailable'} · {owner?.role || 'unknown'}</p></div><span className="rounded-full bg-primary-500/15 px-3 py-1 text-xs font-semibold text-primary-300">{sessions.length} {sessions.length === 1 ? 'device' : 'devices'}</span></header>
          <div className="divide-y divide-white/10">{sessions.map(session => <div key={session._id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3"><Laptop className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400"/><div className="min-w-0"><p className="font-medium">{session.browser} · {session.device}</p><p className="mt-1 break-all text-xs text-white/45">IP {session.ip}</p><p className="mt-1 text-xs text-white/45">Last active {formatDate(session.lastActiveAt)} · Login {formatDate(session.loginAt)}</p></div></div>
            <button disabled={revoking} onClick={() => logoutDevice(session._id, owner?.name || 'user')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"><LogOut className="h-4 w-4"/> Log out device</button>
          </div>)}</div>
        </section>;
      })}
    </div> : <div className="space-y-4">
      <div className="card grid gap-3 p-4 md:grid-cols-[1fr_150px_150px]">
        <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"/><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input w-full pl-10" placeholder="Search name, email, action or IP…"/></label>
        <select className="input" value={method} onChange={e => { setMethod(e.target.value); setPage(1); }}><option value="">All actions</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select>
        <select className="input" value={result} onChange={e => { setResult(e.target.value); setPage(1); }}><option value="">All results</option><option value="success">Successful</option><option value="failed">Failed</option></select>
      </div>
      <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-white/5 text-white/55"><tr><th className="p-4">Time</th><th className="p-4">User</th><th className="p-4">Action</th><th className="p-4">Device / IP</th><th className="p-4">Result</th></tr></thead><tbody className="divide-y divide-white/10">
        {logsLoading && <tr><td colSpan={5} className="p-8 text-center text-white/50">Loading audit log…</td></tr>}
        {!logsLoading && !logData?.data?.length && <tr><td colSpan={5} className="p-8 text-center text-white/50">No matching activity found.</td></tr>}
        {logData?.data?.map(log => <tr key={log._id} className="align-top hover:bg-white/[0.025]"><td className="whitespace-nowrap p-4 text-white/55"><Clock className="mr-1 inline h-3.5 w-3.5"/>{formatDate(log.createdAt)}</td><td className="p-4"><p className="font-medium">{log.actorName || 'Guest / unknown'}</p><p className="text-xs text-white/40">{log.actorEmail || log.actorRole || 'guest'}</p></td><td className="p-4"><p className="font-mono text-xs">{log.action}</p><p className="mt-1 text-xs text-white/40">{log.durationMs} ms</p></td><td className="p-4"><p>{log.browser} · {log.device}</p><p className="mt-1 text-xs text-white/40">{log.ip}</p></td><td className="p-4"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${log.success ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}><ShieldCheck className="h-3.5 w-3.5"/>{log.success ? 'Success' : `Failed (${log.statusCode})`}</span></td></tr>)}
      </tbody></table></div></div>
      {(logData?.pagination?.pages || 1) > 1 && <div className="flex items-center justify-between"><button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><span className="text-sm text-white/50">Page {page} of {logData?.pagination.pages}</span><button className="btn-secondary" disabled={page >= (logData?.pagination.pages || 1)} onClick={() => setPage(value => value + 1)}>Next</button></div>}
    </div>}
  </div>;
};

export default SecurityAuditPage;
