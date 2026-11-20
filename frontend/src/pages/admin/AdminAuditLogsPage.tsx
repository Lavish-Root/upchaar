import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ShieldAlert, Activity, RefreshCw } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/cn';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const fetchLogs = async (p: number) => {
    setLoading(true);
    try {
      const res: any = await api.get('/admin/audit-logs', { params: { page: p, limit: 20 } });
      if (res.data) {
        setLogs(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Platform Security & Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable audit logging for clinical authorizations, doctor approvals, and administrative actions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLogs(page)}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh Audit Trail
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner text="Fetching audit log stream..." />
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-2">
          <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No audit log records found</h3>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Timestamp (UTC)</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity Type</th>
                  <th className="p-3">Actor / User</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3">Details / Request</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="p-3 font-bold text-slate-900">{log.action}</td>
                    <td className="p-3 text-primary-700">{log.entityType}</td>
                    <td className="p-3 text-slate-700 font-sans">
                      {log.user ? `${log.user.fullName} (${log.user.role})` : 'System / Guest'}
                    </td>
                    <td className="p-3 text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                    <td className="p-3 text-slate-500 font-sans max-w-xs truncate" title={log.details}>
                      {log.details || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
              <span>Showing Page {pagination.page} of {pagination.totalPages || 1} ({pagination.total} records)</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
