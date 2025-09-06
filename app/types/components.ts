// TypeScript types for React components

export interface XeroTenant {
  tenantId: string;
  tenantName: string;
  tenantType: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  tenants: XeroTenant[];
  sessionId?: string;
  expiresAt?: string;
  error?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

// Component Props Types
export interface XeroConnectProps {
  onConnectionChange?: (status: ConnectionStatus) => void;
  className?: string;
}

export interface XeroToolsProps {
  sessionId?: string;
  onToolExecuted?: (toolName: string, result: ToolExecutionResult) => void;
  className?: string;
}

export interface DashboardProps {
  className?: string;
}

// Form Types
export interface ToolFormData {
  [key: string]: any;
}

export interface ToolFormProps {
  tool: MCPTool;
  onSubmit: (data: ToolFormData) => Promise<void>;
  isLoading?: boolean;
}

// Activity Log Types
export interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  toolName: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  data?: any;
}

// Dashboard Data Types
export interface DashboardStats {
  totalAccounts: number;
  totalContacts: number;
  totalInvoices: number;
  recentTransactions: number;
  connectionHealth: 'healthy' | 'warning' | 'error';
}

// API Response Types
export interface MCPResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

export interface ListResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Error Boundary Types
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry?: () => void }>;
}

// Loading Component Types
export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  animate?: boolean;
}

// Export all types
export type {
  ConnectionStatus as XeroConnectionStatus,
  MCPTool as MCPServerTool,
  ToolExecutionResult as MCPToolResult,
  LoadingState as ComponentLoadingState,
  ErrorState as ComponentErrorState,
};