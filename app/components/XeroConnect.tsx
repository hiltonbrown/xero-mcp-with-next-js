// OAuth connection component

'use client';

import React, { useState, useEffect } from 'react';
import { mcpClient } from '@/lib/api-client';
import { ConnectionStatus, XeroTenant, XeroConnectProps } from '@/types/components';

const XeroConnect: React.FC<XeroConnectProps> = ({ onConnectionChange, className = '' }) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    tenants: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnectionStatus();
    // Check URL parameters for OAuth callback
    checkOAuthCallback();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const status = await mcpClient.getConnectionStatus();
      setConnectionStatus(status);
      onConnectionChange?.(status);
    } catch (err) {
      setError('Failed to check connection status');
    }
  };

  const checkOAuthCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const sessionId = urlParams.get('sessionId');
    const error = urlParams.get('error');

    if (success === 'true' && sessionId) {
      mcpClient.setSessionId(sessionId);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      checkConnectionStatus();
    } else if (error) {
      setError(`OAuth failed: ${error}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // For demo purposes, use a mock account ID
      // In a real app, this would come from user authentication
      await mcpClient.initiateXeroAuth('demo-account-id');
    } catch (err) {
      setError('Failed to initiate OAuth flow');
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    mcpClient.clearSession();
    setConnectionStatus({
      isConnected: false,
      tenants: []
    });
    onConnectionChange?.({
      isConnected: false,
      tenants: []
    });
  };

  const getStatusColor = () => {
    if (error) return 'text-red-600 bg-red-50 border-red-200';
    if (connectionStatus.isConnected) return 'text-green-600 bg-green-50 border-green-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getStatusIcon = () => {
    if (error) return '❌';
    if (connectionStatus.isConnected) return '✅';
    return '🔄';
  };

  return (
    <div className={`max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg border ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Xero Connection</h2>
        <p className="text-gray-600">Connect your Xero organization to access accounting data</p>
      </div>

      {/* Connection Status */}
      <div className={`p-4 rounded-lg border mb-6 ${getStatusColor()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getStatusIcon()}</span>
            <div>
              <h3 className="font-semibold">
                {error ? 'Connection Error' :
                 connectionStatus.isConnected ? 'Connected to Xero' : 'Not Connected'}
              </h3>
              <p className="text-sm">
                {error || (connectionStatus.isConnected
                  ? `${connectionStatus.tenants.length} organization(s) connected`
                  : 'Click connect to link your Xero account')}
              </p>
            </div>
          </div>

          <div className="flex space-x-2">
            {!connectionStatus.isConnected && !error && (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{isLoading ? 'Connecting...' : 'Connect to Xero'}</span>
              </button>
            )}

            {connectionStatus.isConnected && (
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Disconnect
              </button>
            )}

            {error && (
              <button
                onClick={() => {
                  setError(null);
                  handleConnect();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Connected Organizations */}
      {connectionStatus.isConnected && connectionStatus.tenants.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Connected Organizations</h3>
          <div className="space-y-3">
            {connectionStatus.tenants.map((tenant: XeroTenant) => (
              <div key={tenant.tenantId} className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{tenant.tenantName}</h4>
                    <p className="text-sm text-gray-600">Type: {tenant.tenantType}</p>
                  </div>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Instructions */}
      {!connectionStatus.isConnected && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Connect</h3>
          <ol className="list-decimal list-inside text-blue-800 space-y-1">
            <li>Click the "Connect to Xero" button above</li>
            <li>You'll be redirected to Xero's authorization page</li>
            <li>Review and approve the requested permissions</li>
            <li>You'll be redirected back with your connection established</li>
          </ol>
        </div>
      )}

      {/* Error Details */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Connection Error</h3>
          <p className="text-red-800">{error}</p>
          <div className="mt-3 text-sm text-red-700">
            <p className="font-medium">Troubleshooting:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Ensure your Xero account has the necessary permissions</li>
              <li>Check that your Xero application is properly configured</li>
              <li>Try refreshing the page and connecting again</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default XeroConnect;