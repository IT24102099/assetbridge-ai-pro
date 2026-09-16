import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Building,
  FileCheck2,
  CalendarCheck,
  Sparkles,
  Bot,
  Activity,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import apiClient from '../lib/api';
import { WorkflowDashboardMetricsDto } from '../types/workflow';

export const DashboardOverviewPage: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<WorkflowDashboardMetricsDto | null>(null);

  useEffect(() => {
    // Attempt fetching dashboard metrics from Phase 5 endpoint if user is Manager/Admin
    if (user?.role === 'Manager' || user?.role === 'Admin') {
      apiClient
        .get('/workflows/dashboard/metrics')
        .then((res) => {
          if (res.data.success) {
            setMetrics(res.data.data);
          }
        })
        .catch((err) => console.log('Metrics not available yet or user unauthorized:', err));
    }
  }, [user]);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-950/60 via-card/80 to-slate-900/60 p-6 md:p-8 backdrop-blur-xl shadow-xl">
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="brand">
                <Sparkles className="h-3 w-3 mr-1" />
                AssetBridge Remote Command Center
              </Badge>
              <Badge variant="outline" className="text-xs">
                Role: {user?.role}
              </Badge>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {user?.fullName}
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Overseeing remote Sri Lankan residential asset maintenance, multi-agent diagnostics, and long-term property continuity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-secondary/60 border border-border/50 px-4 py-3 text-xs">
              <Bot className="h-4 w-4 text-brand-400" />
              <div>
                <div className="font-semibold text-foreground">4 AI Agents</div>
                <div className="text-[10px] text-muted-foreground">Governance Engine Ready</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Workflows
            </CardTitle>
            <Activity className="h-4 w-4 text-brand-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics?.activeWorkflowsCount ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Deterministic 15-state lifecycle
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Approvals
            </CardTitle>
            <FileCheck2 className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {metrics?.pendingApprovalsCount ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Human-in-the-loop validation
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Completed Repairs
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {metrics?.completedWorkflowsCount ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Verified with evidence & audit
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Continuity Tasks
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics?.pendingFollowUpsCount ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {metrics?.overdueFollowUpsCount ?? 0} overdue follow-ups
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Agent Architecture Status Card */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/60 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-brand-400" />
              Specialized AI Agents Ecosystem
            </CardTitle>
            <CardDescription className="text-xs">
              4 vertical agents supporting remote property management and continuity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 border border-border/40">
              <div className="space-y-0.5">
                <div className="font-semibold text-foreground">Agent 1: Incident Planning Agent</div>
                <div className="text-[11px] text-muted-foreground">Member 1 &bull; Analyzes structural issues & urgency</div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 border border-border/40">
              <div className="space-y-0.5">
                <div className="font-semibold text-foreground">Agent 2: Provider Matching Agent</div>
                <div className="text-[11px] text-muted-foreground">Member 2 &bull; Geospatial & skill proximity matching</div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 border border-border/40">
              <div className="space-y-0.5">
                <div className="font-semibold text-foreground">Agent 3: Quotation Auditor Agent</div>
                <div className="text-[11px] text-muted-foreground">Member 3 &bull; Line-item budget & price benchmark audit</div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 border border-border/40">
              <div className="space-y-0.5">
                <div className="font-semibold text-foreground">Agent 4: Continuity Sentinel Agent</div>
                <div className="text-[11px] text-muted-foreground">Member 4 &bull; Post-repair warranty & scheduled rechecks</div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </CardContent>
        </Card>

        {/* System Health & Architecture Principles */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4 text-brand-400" />
              Governance & Security Boundary
            </CardTitle>
            <CardDescription className="text-xs">
              Backend is the ultimate source of truth
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="rounded-lg bg-brand-950/30 p-3.5 border border-brand-500/20 text-muted-foreground space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-400" />
                Human-in-the-Loop Rule
              </div>
              <p className="text-[11px] leading-relaxed">
                AI creates plans and compares quotations. The backend enforces budgets. Only human Managers or Admins can approve high-impact financial and maintenance actions.
              </p>
            </div>

            <div className="rounded-lg bg-secondary/40 p-3.5 border border-border/40 text-muted-foreground space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                Property Continuity
              </div>
              <p className="text-[11px] leading-relaxed">
                Maintenance does not end with job completion. Long-term follow-up tasks preserve historical property integrity for overseas owners.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
