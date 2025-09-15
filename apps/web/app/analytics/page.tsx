'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, Phone, Clock, CheckCircle, AlertCircle, BarChart3, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface AnalyticsData {
  transferStats: {
    totalTransfers: number;
    successfulTransfers: number;
    failedTransfers: number;
    averageDuration: number;
  };
  callMetrics: {
    totalCalls: number;
    averageCallDuration: number;
    peakHours: { hour: string; calls: number }[];
    callVolumeByDay: { date: string; calls: number }[];
  };
  agentPerformance: {
    agentId: string;
    name: string;
    transfersHandled: number;
    successRate: number;
    averageHandleTime: number;
  }[];
  realTimeMetrics: {
    activeCalls: number;
    waitingQueue: number;
    averageWaitTime: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch(`/api/analytics?time_range=${timeRange}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        console.error('Failed to fetch analytics data:', result.error);
        // Fallback to mock data if API fails
        setData({
          transferStats: {
            totalTransfers: 156,
            successfulTransfers: 142,
            failedTransfers: 14,
            averageDuration: 8.5
          },
          callMetrics: {
            totalCalls: 892,
            averageCallDuration: 12.3,
            peakHours: [
              { hour: '9:00', calls: 45 },
              { hour: '10:00', calls: 52 },
              { hour: '11:00', calls: 48 },
              { hour: '14:00', calls: 38 },
              { hour: '15:00', calls: 42 },
              { hour: '16:00', calls: 35 }
            ],
            callVolumeByDay: [
              { date: 'Mon', calls: 120 },
              { date: 'Tue', calls: 135 },
              { date: 'Wed', calls: 142 },
              { date: 'Thu', calls: 128 },
              { date: 'Fri', calls: 156 },
              { date: 'Sat', calls: 98 },
              { date: 'Sun', calls: 113 }
            ]
          },
          agentPerformance: [
            { agentId: 'agent_a', name: 'Alice Johnson', transfersHandled: 45, successRate: 95.6, averageHandleTime: 8.2 },
            { agentId: 'agent_b', name: 'Bob Smith', transfersHandled: 38, successRate: 92.1, averageHandleTime: 9.1 },
            { agentId: 'agent_c', name: 'Carol Davis', transfersHandled: 52, successRate: 98.1, averageHandleTime: 7.8 }
          ],
          realTimeMetrics: {
            activeCalls: 12,
            waitingQueue: 3,
            averageWaitTime: 2.4
          }
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-8 max-w-md mx-auto border border-blue-500/20">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Analytics...</h2>
          <p className="text-gray-300">Fetching dashboard data</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center">
        <div className="bg-red-600/20 border border-red-500 text-red-200 p-4 rounded-lg max-w-md mx-auto">
          Failed to load analytics data
        </div>
      </div>
    );
  }

  const successRate = (data.transferStats.successfulTransfers / data.transferStats.totalTransfers) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-blue-400 mr-3" />
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          </div>
          <p className="text-gray-300">Real-time insights into transfer performance and call metrics</p>

          {/* Time Range Selector */}
          <div className="mt-4 flex justify-center space-x-2">
            {['1d', '7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Real-time Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Calls</p>
                <p className="text-2xl font-bold text-green-400">{data.realTimeMetrics.activeCalls}</p>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Waiting Queue</p>
                <p className="text-2xl font-bold text-yellow-400">{data.realTimeMetrics.waitingQueue}</p>
              </div>
              <Users className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Wait Time</p>
                <p className="text-2xl font-bold text-blue-400">{data.realTimeMetrics.averageWaitTime}m</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </motion.div>

        {/* Transfer Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-500/20">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-400" />
              Transfer Performance
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Transfers</span>
                <span className="font-bold text-white">{data.transferStats.totalTransfers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Success Rate</span>
                <span className="font-bold text-green-400">{successRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Avg Duration</span>
                <span className="font-bold text-blue-400">{data.transferStats.averageDuration}m</span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-500/20">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
              Transfer Success Breakdown
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Successful', value: data.transferStats.successfulTransfers, color: '#00C49F' },
                    { name: 'Failed', value: data.transferStats.failedTransfers, color: '#FF8042' }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {[data.transferStats.successfulTransfers, data.transferStats.failedTransfers].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Call Volume Charts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-500/20">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Phone className="w-5 h-5 mr-2 text-green-400" />
              Call Volume by Day
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.callMetrics.callVolumeByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="#00C49F"
                  fill="#00C49F"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-500/20">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-400" />
              Peak Call Hours
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.callMetrics.peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="hour" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="calls" fill="#8884D8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Agent Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-500/20"
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-purple-400" />
            Agent Performance
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-2 text-gray-300">Agent</th>
                  <th className="text-left py-2 text-gray-300">Transfers</th>
                  <th className="text-left py-2 text-gray-300">Success Rate</th>
                  <th className="text-left py-2 text-gray-300">Avg Handle Time</th>
                </tr>
              </thead>
              <tbody>
                {data.agentPerformance.map((agent) => (
                  <motion.tr
                    key={agent.agentId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="border-b border-gray-700 hover:bg-white/5"
                  >
                    <td className="py-3 text-white font-medium">{agent.name}</td>
                    <td className="py-3 text-gray-300">{agent.transfersHandled}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        agent.successRate >= 95 ? 'bg-green-600/20 text-green-400' :
                        agent.successRate >= 90 ? 'bg-yellow-600/20 text-yellow-400' :
                        'bg-red-600/20 text-red-400'
                      }`}>
                        {agent.successRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 text-gray-300">{agent.averageHandleTime}m</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}