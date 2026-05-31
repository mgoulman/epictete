'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Filter, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import { PermissionGate } from '@/components/backoffice/auth/PermissionGate';
import { SortHeader, SortDir, sortCompare } from '@/components/backoffice/shared/SortHeader';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { AuditLog } from '@/lib/types/auth';

export default function AuditPage() {
  const { t } = useTranslation();
  const a = t.backoffice.audit;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Filters
  const [resourceType, setResourceType] = useState('');
  const [action, setAction] = useState('');

  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset)
      });

      if (resourceType) params.set('resourceType', resourceType);
      if (action) params.set('action', action);

      const response = await fetch(`/api/audit?${params}`);
      if (!response.ok) throw new Error('Failed to fetch logs');

      const data = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [offset, resourceType, action]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getActionClasses = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-500/10 text-green-500';
      case 'update':
        return 'bg-blue-500/10 text-blue-500';
      case 'delete':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-[#1a1a1a] text-gray-500';
    }
  };

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedLogs = [...logs].sort((a, b) => sortField ? sortCompare(a, b, sortField, sortDir) : 0);

  return (
    <PermissionGate
      permission="audit.read"
      fallback={
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">{t.backoffice.shared.noPermission}</p>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{a.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{a.subtitle}</p>
          </div>
          <button
            onClick={() => {
              setOffset(0);
              fetchLogs();
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {a.refresh}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-secondary border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{a.filters}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={resourceType}
              onChange={e => {
                setResourceType(e.target.value);
                setOffset(0);
              }}
              className="py-2 px-3 bg-card border border-border rounded-lg text-sm text-foreground"
            >
              <option value="">{a.allResources}</option>
              <option value="user">{a.resourceUsers}</option>
              <option value="menu">{a.resourceMenu}</option>
              <option value="settings">{a.resourceSettings}</option>
            </select>

            <select
              value={action}
              onChange={e => {
                setAction(e.target.value);
                setOffset(0);
              }}
              className="py-2 px-3 bg-card border border-border rounded-lg text-sm text-foreground"
            >
              <option value="">{a.allActions}</option>
              <option value="create">{a.actionCreate}</option>
              <option value="update">{a.actionUpdate}</option>
              <option value="delete">{a.actionDelete}</option>
            </select>

            {(resourceType || action) && (
              <button
                onClick={() => {
                  setResourceType('');
                  setAction('');
                  setOffset(0);
                }}
                className="py-2 px-3 text-sm text-muted-foreground bg-transparent border-none cursor-pointer hover:text-foreground"
              >
                {a.clearFilters}
              </button>
            )}
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-secondary border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-[3px] border-[#606338] border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground">{a.loadingLogs}</p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">{a.noLogs}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-card">
                    <th className="px-4 py-3 text-left"><SortHeader label={a.timestamp} field="created_at" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="text-xs font-medium text-muted" /></th>
                    <th className="px-4 py-3 text-left"><SortHeader label={a.user} field="user_email" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="text-xs font-medium text-muted" /></th>
                    <th className="px-4 py-3 text-left"><SortHeader label={a.action} field="action" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="text-xs font-medium text-muted" /></th>
                    <th className="px-4 py-3 text-left"><SortHeader label={a.resource} field="resource_type" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="text-xs font-medium text-muted" /></th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted">{a.details}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLogs.map(log => (
                    <tr key={log.id} className="border-t border-border">
                      <td className="px-4 py-3 text-[13px] text-muted-foreground">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-foreground">
                        {log.user_email || a.system}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full capitalize ${getActionClasses(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-foreground">
                        <span className="capitalize">{log.resource_type}</span>
                        {log.resource_id && (
                          <span className="text-muted-foreground ml-1">
                            #{log.resource_id.slice(0, 8)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-2 rounded-lg bg-transparent border-none text-muted-foreground cursor-pointer hover:text-foreground"
                          title={a.viewDetails}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-[13px] text-muted-foreground">
                {t.backoffice.shared.showing} {offset + 1} {t.backoffice.shared.to} {Math.min(offset + limit, total)} {t.backoffice.shared.of} {total} {t.backoffice.shared.entries}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-transparent border-none text-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-foreground">
                  {t.backoffice.shared.page} {currentPage} {t.backoffice.shared.of} {totalPages}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-transparent border-none text-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-secondary border border-border rounded-xl shadow-2xl w-full max-w-[600px] max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">{a.logDetails}</h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 rounded-lg bg-transparent border-none text-muted-foreground cursor-pointer hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[13px] text-muted-foreground mb-1">{a.timestamp}</p>
                    <p className="text-foreground">{formatDate(selectedLog.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-[13px] text-muted-foreground mb-1">{a.user}</p>
                    <p className="text-foreground">{selectedLog.user_email || a.system}</p>
                  </div>
                  <div>
                    <p className="text-[13px] text-muted-foreground mb-1">{a.action}</p>
                    <span className={`px-2 py-1 text-xs rounded-full capitalize ${getActionClasses(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] text-muted-foreground mb-1">{a.resource}</p>
                    <p className="text-foreground capitalize">{selectedLog.resource_type}</p>
                  </div>
                  {selectedLog.resource_id && (
                    <div className="col-span-2">
                      <p className="text-[13px] text-muted-foreground mb-1">{a.resourceId}</p>
                      <p className="text-foreground font-mono text-[13px]">{selectedLog.resource_id}</p>
                    </div>
                  )}
                  {selectedLog.ip_address && (
                    <div>
                      <p className="text-[13px] text-muted-foreground mb-1">{a.ipAddress}</p>
                      <p className="text-foreground font-mono text-[13px]">{selectedLog.ip_address}</p>
                    </div>
                  )}
                </div>

                {selectedLog.old_values && (
                  <div className="mt-4">
                    <p className="text-[13px] text-muted-foreground mb-2">{a.previousValues}</p>
                    <pre className="bg-card p-3 rounded-lg text-xs overflow-x-auto text-muted-foreground">
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_values && (
                  <div className="mt-4">
                    <p className="text-[13px] text-muted-foreground mb-2">{a.newValues}</p>
                    <pre className="bg-card p-3 rounded-lg text-xs overflow-x-auto text-muted-foreground">
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
