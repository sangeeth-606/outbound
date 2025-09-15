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

const COLORS = ['#000000', '#888888', '#cccccc', '#555555', '#aaaaaa'];

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
        // No fallback mock data - handle gracefully
        setData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="bg-gray-100 rounded-lg shadow-md p-8 max-w-md mx-auto border border-gray-200">
          <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Analytics...</h2>
          <p className="text-gray-600">Fetching dashboard data</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg max-w-md mx-auto">
          Failed to load analytics data
        </div>
      </div>
    );
  }

  const successRate = (data.transferStats.successfulTransfers / data.transferStats.totalTransfers) * 100;

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-black mr-3" />
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          </div>
          <p className="text-gray-600">Real-time insights into transfer performance and call metrics</p>

          {/* Time Range Selector */}
          <div className="mt-4 flex justify-center space-x-2">
            {['1d', '7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-black text-white'
                    : 'bg-gray-200 text-black hover:bg-gray-300'
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
          <div className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Active Calls</p>
                <p className="text-2xl font-bold text-black">{data.realTimeMetrics.activeCalls}</p>
              </div>
              <Activity className="w-8 h-8 text-black" />
            </div>
          </div>

          <div className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Waiting Queue</p>
                <p className="text-2xl font-bold text-black">{data.realTimeMetrics.waitingQueue}</p>
              </div>
              <Users className="w-8 h-8 text-black" />
            </div>
          </div>

          <div className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Avg Wait Time</p>
                <p className="text-2xl font-bold text-black">{data.realTimeMetrics.averageWaitTime}m</p>
              </div>
              <Clock className="w-8 h-8 text-black" />
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
          <div className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-black" />
              Transfer Performance
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Transfers</span>
                <span className="font-bold text-black">{data.transferStats.totalTransfers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Success Rate</span>
                <span className="font-bold text-black">{successRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg Duration</span>
                <span className="font-bold text-black">{data.transferStats.averageDuration}m</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-black" />
              Transfer Success Breakdown
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Successful', value: data.transferStats.successfulTransfers, color: '#000000' },
                    { name: 'Failed', value: data.transferStats.failedTransfers, color: '#888888' }
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
          <div className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Phone className="w-5 h-5 mr-2 text-black" />
              Call Volume by Day
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.callMetrics.callVolumeByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cccccc" />
                <XAxis dataKey="date" stroke="#888888" />
                <YAxis stroke="#888888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cccccc',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="#000000"
                  fill="#000000"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-black" />
              Peak Call Hours
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.callMetrics.peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cccccc" />
                <XAxis dataKey="hour" stroke="#888888" />
                <YAxis stroke="#888888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cccccc',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="calls" fill="#555555" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Agent Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200"
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-black" />
            Agent Performance
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 text-gray-600">Agent</th>
                  <th className="text-left py-2 text-gray-600">Transfers</th>
                  <th className="text-left py-2 text-gray-600">Success Rate</th>
                  <th className="text-left py-2 text-gray-600">Avg Handle Time</th>
                </tr>
              </thead>
              <tbody>
                {data.agentPerformance.map((agent) => (
                  <motion.tr
                    key={agent.agentId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="border-b border-gray-200 hover:bg-gray-200"
                  >
                    <td className="py-3 text-black font-medium">{agent.name}</td>
                    <td className="py-3 text-gray-600">{agent.transfersHandled}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        agent.successRate >= 95 ? 'bg-green-100 text-green-800' :
                        agent.successRate >= 90 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {agent.successRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 text-gray-600">{agent.averageHandleTime}m</td>
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
