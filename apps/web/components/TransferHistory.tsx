'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Clock, User, Phone, CheckCircle, XCircle, AlertTriangle, Search, Filter } from 'lucide-react';

interface TransferRecord {
  id: string;
  timestamp: Date;
  agentA: string;
  agentB: string;
  callerEmail: string;
  callerType: 'investor' | 'prospect' | 'general';
  status: 'completed' | 'failed' | 'cancelled';
  duration: number;
  summary: string;
  reason?: string;
}

interface TransferHistoryProps {
  agentId: string;
  limit?: number;
}

export default function TransferHistory({ agentId, limit = 20 }: TransferHistoryProps) {
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'cancelled'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'duration'>('newest');

  useEffect(() => {
    const fetchTransferHistory = async () => {
      try {
        const response = await fetch(`/api/transfers/history?agent_id=${agentId}&limit=${limit}`);
        const result = await response.json();

        if (result.success) {
          const formattedTransfers = result.transfers.map((transfer: any) => ({
            ...transfer,
            timestamp: new Date(transfer.timestamp)
          }));
          setTransfers(formattedTransfers);
          setFilteredTransfers(formattedTransfers);
        } else {
          setTransfers([]);
          setFilteredTransfers([]);
        }
      } catch (error) {
        console.error('Failed to fetch transfer history:', error);
        setTransfers([]);
        setFilteredTransfers([]);
      }
      setLoading(false);
    };

    fetchTransferHistory();
  }, [agentId, limit]);

  useEffect(() => {
    let filtered = transfers.filter(transfer => {
      const matchesSearch = searchTerm === '' ||
        transfer.callerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.agentB.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || transfer.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.timestamp.getTime() - a.timestamp.getTime();
        case 'oldest':
          return a.timestamp.getTime() - b.timestamp.getTime();
        case 'duration':
          return b.duration - a.duration;
        default:
          return 0;
      }
    });

    setFilteredTransfers(filtered.slice(0, limit));
  }, [transfers, searchTerm, statusFilter, sortBy, limit]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-accent-success" />;
      case 'failed':
        return <XCircle className="w-3 h-3 text-accent-red" />;
      case 'cancelled':
        return <AlertTriangle className="w-3 h-3 text-accent-warning" />;
      default:
        return <Clock className="w-3 h-3 text-text-muted" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-accent-success/10 border-accent-success/20 text-accent-success';
      case 'failed':
        return 'bg-accent-red/10 border-accent-red/20 text-accent-red';
      case 'cancelled':
        return 'bg-accent-warning/10 border-accent-warning/20 text-accent-warning';
      default:
        return 'bg-surface-card border-border-dim text-text-muted';
    }
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border-2 border-accent-red border-t-transparent rounded-full"
          ></motion.div>
          <span className="ml-3 text-xs text-text-muted">Loading transfer history...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card overflow-hidden"
    >
      <div className="bg-surface-secondary p-4 border-b border-border-dim">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-text-label" />
            <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">Transfer History</h3>
          </div>
          <span className="text-[10px] text-text-muted">{filteredTransfers.length} transfers</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-48">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search transfers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full pl-9 text-xs"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="input px-3 py-1.5 text-xs"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="input px-3 py-1.5 text-xs"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="duration">By Duration</option>
          </select>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        <AnimatePresence>
          {filteredTransfers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <History className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-xs">No transfers found</p>
              <p className="text-text-muted text-[10px]">Try adjusting your search or filters</p>
            </motion.div>
          ) : (
            filteredTransfers.map((transfer, index) => (
              <motion.div
                key={transfer.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="border-b border-border-dim last:border-b-0 hover:bg-surface-hover transition-colors"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(transfer.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-text-muted" />
                          <span className="text-xs font-bold text-text-main">{transfer.callerEmail}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${getStatusColor(transfer.status)}`}>
                            {transfer.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-text-muted mt-1">
                          <span>{formatTime(transfer.timestamp)}</span>
                          <span>Duration: {formatDuration(transfer.duration)}</span>
                          <span>Type: {transfer.callerType}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[10px] text-text-muted">
                      <span>Agent A: {transfer.agentA}</span>
                      <span>→</span>
                      <span>Agent B: {transfer.agentB}</span>
                    </div>
                    {transfer.reason && (
                      <span className="text-[10px] text-text-muted bg-surface-card px-2 py-0.5 rounded border border-border-dim">
                        {transfer.reason}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 p-3 bg-surface-primary rounded-md">
                    <p className="text-xs text-text-muted leading-relaxed">{transfer.summary}</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="bg-surface-secondary p-3 border-t border-border-dim">
        <div className="flex justify-between text-[10px] text-text-muted">
          <span>Showing {filteredTransfers.length} of {transfers.length} transfers</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </motion.div>
  );
}
