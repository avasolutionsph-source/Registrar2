import { useEffect, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  ShieldCheck,
  AlertTriangle,
  HardDriveDownload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { syncToDevice } from '@/lib/db';
import { getOfflineMeta, idbClearAll, isOnline, type OfflineMeta } from '@/lib/offlineCache';

export default function OfflineData() {
  const [online, setOnline] = useState(isOnline());
  const [meta, setMeta] = useState<OfflineMeta | null | undefined>(undefined); // undefined = loading
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    getOfflineMeta()
      .then((m) => setMeta(m ?? null))
      .catch(() => setMeta(null));
  }, []);

  async function sync() {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const m = await syncToDevice();
      setMeta(m);
      setMsg(`Saved to this device: ${m.counts.students} students + classes, subjects, and more.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sync failed.');
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      await idbClearAll();
      setMeta(null);
      setMsg('Offline copy removed from this device.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to remove the offline copy.');
    } finally {
      setBusy(false);
    }
  }

  const total = meta ? Object.values(meta.counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Offline Access' }]} />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">Offline Access</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          Save a copy of all records to this device so you can view and print even without internet
          (e.g. during a brownout). Adding or editing still needs internet.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4 text-[12.5px]">
        {online ? (
          <Wifi className="w-4 h-4 text-ok-fg" />
        ) : (
          <WifiOff className="w-4 h-4 text-amber-600" />
        )}
        <span className={online ? 'text-ok-fg' : 'text-amber-700'}>{online ? 'Online' : 'Offline'}</span>
      </div>

      <div className="bg-panel border border-border rounded-md p-4 max-w-xl">
        <div className="flex items-center gap-2 mb-2">
          <HardDriveDownload className="w-4 h-4 text-ink-primary" />
          <h2 className="text-[14px] font-semibold text-ink-primary">Offline copy on this device</h2>
        </div>

        {meta === undefined ? (
          <p className="text-[12px] text-ink-secondary mb-3">Checking…</p>
        ) : meta === null ? (
          <p className="text-[12px] text-ink-secondary mb-3">
            No offline copy yet. Sync while online to enable offline view &amp; print.
          </p>
        ) : (
          <div className="text-[12px] text-ink-secondary mb-3">
            <p>
              Last synced:{' '}
              <span className="text-ink-primary font-medium">
                {new Date(meta.lastSyncedAt).toLocaleString()}
              </span>
            </p>
            <p className="mt-0.5">
              {meta.counts.students} students · {meta.counts.classes} classes · {meta.counts.subjects}{' '}
              subjects · {total} records total
            </p>
          </div>
        )}

        {err && <p className="text-[12px] text-nps-red mb-2">{err}</p>}
        {msg && (
          <p className="flex items-start gap-1.5 text-[12px] text-ok-fg mb-2">
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {msg}
          </p>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button onClick={sync} disabled={busy || !online}>
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
            )}
            {busy ? 'Syncing…' : meta ? 'Sync now (refresh)' : 'Sync now (make available offline)'}
          </Button>
          {meta && (
            <Button variant="secondary" onClick={clear} disabled={busy}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove offline copy
            </Button>
          )}
        </div>
        {!online && <p className="text-[11.5px] text-amber-700 mt-2">Connect to the internet to sync.</p>}
      </div>

      <div className="flex items-start gap-2 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-4 max-w-xl">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          The offline copy stores learners’ data (decrypted) on this device. Use it only on a trusted
          computer, and click “Remove offline copy” to wipe it. During a brownout this works only on a
          battery-powered laptop/tablet — a desktop loses power with the outage.
        </span>
      </div>
    </>
  );
}
