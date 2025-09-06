// MCP tools interface

'use client';

import React, { useState, useEffect } from 'react';
import { mcpClient } from '@/lib/api-client';
import { MCPTool, ToolExecutionResult, XeroToolsProps, ToolFormData } from '@/types/components';

const XeroTools: React.FC<XeroToolsProps> = ({ sessionId, onToolExecuted, className = '' }) => {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [executionResult, setExecutionResult] = useState<ToolExecutionResult | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadTools();
    }
  }, [sessionId]);

  const loadTools = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const availableTools = await mcpClient.listTools();
      setTools(availableTools);
    } catch (err) {
      setError('Failed to load tools');
    } finally {
      setIsLoading(false);
    }
  };

  const executeTool = async (toolName: string, args: any) => {
    setIsLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      const result = await mcpClient.callTool(toolName, args);
      const executionTime = Date.now() - startTime;

      const toolResult: ToolExecutionResult = {
        success: true,
        data: result,
        executionTime
      };

      setExecutionResult(toolResult);
      onToolExecuted?.(toolName, toolResult);
    } catch (err) {
      const executionTime = Date.now() - startTime;
      const toolResult: ToolExecutionResult = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        executionTime
      };

      setExecutionResult(toolResult);
      onToolExecuted?.(toolName, toolResult);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderToolForm = (tool: MCPTool) => {
    const handleSubmit = async (formData: ToolFormData) => {
      await executeTool(tool.name, formData);
    };

    return (
      <ToolForm
        tool={tool}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    );
  };

  if (!sessionId) {
    return (
      <div className={`max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg border ${className}`}>
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🔗</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Connection Required</h3>
          <p className="text-gray-600">Please connect to Xero first to access MCP tools.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg border ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Xero MCP Tools</h2>
        <p className="text-gray-600">Execute accounting operations using Xero's API</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search tools..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tools List */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Tools</h3>

          {isLoading && tools.length === 0 && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
              <button
                onClick={loadTools}
                className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          <div className="space-y-3">
            {filteredTools.map((tool) => (
              <div
                key={tool.name}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedTool?.name === tool.name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedTool(tool)}
              >
                <h4 className="font-medium text-gray-900">{tool.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tool Interface */}
        <div>
          {selectedTool ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedTool.name}
              </h3>
              {renderToolForm(selectedTool)}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔧</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Tool</h3>
              <p className="text-gray-600">Choose a tool from the list to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Execution Result */}
      {executionResult && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Execution Result</h3>
          <div className={`p-4 rounded-lg border ${
            executionResult.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-medium ${
                executionResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {executionResult.success ? '✅ Success' : '❌ Error'}
              </span>
              {executionResult.executionTime && (
                <span className="text-sm text-gray-600">
                  {executionResult.executionTime}ms
                </span>
              )}
            </div>

            {executionResult.success ? (
              <pre className="text-sm text-green-800 bg-green-100 p-3 rounded overflow-x-auto">
                {JSON.stringify(executionResult.data, null, 2)}
              </pre>
            ) : (
              <p className="text-red-800">{executionResult.error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Tool Form Component
interface ToolFormProps {
  tool: MCPTool;
  onSubmit: (data: ToolFormData) => Promise<void>;
  isLoading: boolean;
}

const ToolForm: React.FC<ToolFormProps> = ({ tool, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<ToolFormData>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderField = (fieldName: string, fieldSchema: any) => {
    const value = formData[fieldName] || '';

    switch (fieldSchema.type) {
      case 'string':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            placeholder={fieldSchema.description || fieldName}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={tool.inputSchema.required?.includes(fieldName)}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(fieldName, parseFloat(e.target.value))}
            placeholder={fieldSchema.description || fieldName}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={tool.inputSchema.required?.includes(fieldName)}
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleInputChange(fieldName, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{fieldSchema.description || fieldName}</span>
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            placeholder={fieldSchema.description || fieldName}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={tool.inputSchema.required?.includes(fieldName)}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {tool.inputSchema.properties && Object.entries(tool.inputSchema.properties).map(([fieldName, fieldSchema]: [string, any]) => (
        <div key={fieldName}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {fieldName}
            {tool.inputSchema.required?.includes(fieldName) && <span className="text-red-500">*</span>}
          </label>
          {renderField(fieldName, fieldSchema)}
        </div>
      ))}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {isLoading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        )}
        <span>{isLoading ? 'Executing...' : 'Execute Tool'}</span>
      </button>
    </form>
  );
};

export default XeroTools;