import React from 'react'
import { Clock, User, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export interface AuditLogItem {
  id: string
  action: string
  entityType?: string
  entityId?: string
  userName?: string | null
  userEmail?: string | null
  timestamp: string | Date
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  notes?: string | null
}

interface AuditTimelineProps {
  logs: AuditLogItem[]
  className?: string
  emptyMessage?: string
}

export function AuditTimeline({
  logs,
  className,
  emptyMessage = 'No activity history recorded yet.',
}: AuditTimelineProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-muted/20">
        <Clock className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted', className)}>
      {logs.map((log) => {
        const dateStr =
          typeof log.timestamp === 'string'
            ? new Date(log.timestamp).toLocaleString()
            : log.timestamp.toLocaleString()

        return (
          <div key={log.id} className="relative group">
            {/* Dot on line */}
            <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-primary bg-background shadow-xs group-hover:scale-110 transition-transform" />

            <div className="p-3 rounded-lg border bg-card/60 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider">
                    {log.action}
                  </Badge>
                  {log.userName && (
                    <span className="text-xs font-medium flex items-center gap-1 text-foreground">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {log.userName}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground">{dateStr}</span>
              </div>

              {log.notes && (
                <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-md">
                  {log.notes}
                </p>
              )}

              {/* Changes diff */}
              {log.newValues && (
                <div className="mt-2 space-y-1 pt-1 border-t text-xs">
                  {Object.entries(log.newValues).map(([key, newVal]) => {
                    const oldVal = log.oldValues?.[key]
                    if (oldVal === newVal) return null
                    return (
                      <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-mono text-[11px] font-semibold text-foreground">
                          {key}:
                        </span>
                        {oldVal !== undefined && (
                          <span className="line-through text-destructive/80">
                            {String(oldVal)}
                          </span>
                        )}
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {String(newVal)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
