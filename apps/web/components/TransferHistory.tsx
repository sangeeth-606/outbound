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
  duration: number; // in seconds
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

  // Removed mock transfer data for production
  // TODO: Implement real transfer history fetching from backend

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
          // No fallback mock data - handle gracefully
          setTransfers([]);
          setFilteredTransfers([]);
        }
      } catch (error) {
        console.error('Failed to fetch transfer history:', error);
        // No fallback mock data - handle gracefully
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

    // Sort transfers
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
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'cancelled':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600/20 border-green-500/30 text-green-100';
      case 'failed':
        return 'bg-red-600/20 border-red-500/30 text-red-100';
      case 'cancelled':
        return 'bg-yellow-600/20 border-yellow-500/30 text-yellow-100';
      default:
        return 'bg-gray-600/20 border-gray-500/30 text-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg border border-blue-500/20 p-6">
        <div className="flex items-center justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"
          ></motion.div>
          <span className="ml-3 text-gray-300">Loading transfer history...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg border border-blue-500/20 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 border-b border-blue-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Transfer History</h3>
          </div>
          <span className="text-sm text-gray-400">{filteredTransfers.length} transfers</span>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-48">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search transfers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-blue-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-white/10 border border-blue-500/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-white/10 border border-blue-500/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="duration">By Duration</option>
          </select>
        </div>
      </div>

      {/* Transfer List */}
      <div className="max-h-96 overflow-y-auto">
        <AnimatePresence>
          {filteredTransfers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <History className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No transfers found</p>
              <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
            </motion.div>
          ) : (
            filteredTransfers.map((transfer, index) => (
              <motion.div
                key={transfer.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="border-b border-gray-600/20 last:border-b-0 hover:bg-white/5 transition-colors"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(transfer.status)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-white font-medium">{transfer.callerEmail}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(transfer.status)}`}>
                            {transfer.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                          <span>{formatTime(transfer.timestamp)}</span>
                          <span>Duration: {formatDuration(transfer.duration)}</span>
                          <span>Type: {transfer.callerType}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-300">
                      <span>Agent A: {transfer.agentA}</span>
                      <span>→</span>
                      <span>Agent B: {transfer.agentB}</span>
                    </div>
                    {transfer.reason && (
                      <span className="text-xs text-gray-500 bg-gray-600/20 px-2 py-1 rounded">
                        {transfer.reason}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 p-3 bg-gray-800/30 rounded-lg">
                    <p className="text-sm text-gray-300 leading-relaxed">{transfer.summary}</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="bg-gray-800/50 p-3 border-t border-gray-600/20">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Showing {filteredTransfers.length} of {transfers.length} transfers</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </motion.div>
  );
}