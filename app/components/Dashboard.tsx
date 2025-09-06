// Main dashboard

'use client';

import React, { useState, useEffect } from 'react';
import { mcpClient } from '@/lib/api-client';
import { ConnectionStatus, DashboardStats, ActivityLogEntry, DashboardProps } from '@/types/components';
import XeroConnect from './XeroConnect';
import XeroTools from './XeroTools';

const Dashboard: React.FC<DashboardProps> = ({ className = '' }) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    tenants: []
  });
  const [stats, setStats] = useState<DashboardStats>({
    totalAccounts: 0,
    totalContacts: 0,
    totalInvoices: 0,
    recentTransactions: 0,
    connectionHealth: 'error'
  });
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    if (connectionStatus.isConnected && connectionStatus.sessionId) {
      loadDashboardStats();
    }
  }, [connectionStatus]);

  const loadDashboardStats = async () => {
    setIsLoadingStats(true);

    try {
      // Load basic stats - in a real implementation, these would come from cached data
      // or quick API calls to get summary information
      const mockStats: DashboardStats = {
        totalAccounts: 25,
        totalContacts: 150,
        totalInvoices: 45,
        recentTransactions: 12,
        connectionHealth: 'healthy'
      };

      setStats(mockStats);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      setStats(prev => ({ ...prev, connectionHealth: 'error' }));
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleConnectionChange = (status: ConnectionStatus) => {
    setConnectionStatus(status);
  };

  const handleToolExecuted = (toolName: string, result: any) => {
    const logEntry: ActivityLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      toolName,
      status: result.success ? 'success' : 'error',
      message: result.success
        ? `Successfully executed ${toolName}`
        : `Failed to execute ${toolName}: ${result.error}`,
      data: result.data
    };

    setActivityLog(prev => [logEntry, ...prev.slice(0, 9)]); // Keep last 10 entries
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: string;
    color: string;
    isLoading?: boolean;
  }> = ({ title, value, icon, color, isLoading }) => (
    <div className={`p-6 bg-white rounded-lg shadow border ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {isLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse mt-1"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          )}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Xero MCP Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your Xero integration and execute accounting operations</p>
        </div>

        {/* Connection Status */}
        <div className="mb-8">
          <XeroConnect onConnectionChange={handleConnectionChange} />
        </div>

        {/* Stats Grid */}
        {connectionStatus.isConnected && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Chart of Accounts"
              value={stats.totalAccounts}
              icon="📊"
              color="border-blue-200"
              isLoading={isLoadingStats}
            />
            <StatCard
              title="Contacts"
              value={stats.totalContacts}
              icon="👥"
              color="border-green-200"
              isLoading={isLoadingStats}
            />
            <StatCard
              title="Invoices"
              value={stats.totalInvoices}
              icon="📄"
              color="border-purple-200"
              isLoading={isLoadingStats}
            />
            <StatCard
              title="Recent Transactions"
              value={stats.recentTransactions}
              icon="💰"
              color="border-orange-200"
              isLoading={isLoadingStats}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tools Section */}
          <div className="lg:col-span-2">
            <XeroTools
              sessionId={connectionStatus.sessionId}
              onToolExecuted={handleToolExecuted}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Connection Health */}
            <div className="bg-white rounded-lg shadow border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Connection Health</h3>
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  stats.connectionHealth === 'healthy' ? 'bg-green-500' :
                  stats.connectionHealth === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm font-medium capitalize">{stats.connectionHealth}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {stats.connectionHealth === 'healthy'
                  ? 'All systems operational'
                  : 'Check connection status'}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300"
                >
                  🔄 Refresh Data
                </button>
                <button
                  onClick={() => {/* Export functionality */}}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300"
                >
                  📤 Export Report
                </button>
                <button
                  onClick={() => {/* Settings */}}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300"
                >
                  ⚙️ Settings
                </button>
              </div>
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-lg shadow border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              {activityLog.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {activityLog.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-start space-x-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        entry.status === 'success' ? 'bg-green-500' :
                        entry.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {entry.toolName}
                        </p>
                        <p className="text-xs text-gray-600">
                          {entry.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;