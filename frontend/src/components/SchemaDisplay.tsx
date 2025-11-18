'use client'

import React from 'react';
import { ParsedTable, parseSchema } from '@/utils/schemaParser';

interface SchemaDisplayProps {
  schemaDescription: string;
}

const SchemaDisplay: React.FC<SchemaDisplayProps> = ({ schemaDescription }) => {
  const tables = parseSchema(schemaDescription);

  return (
    <div className="w-full bg-[#252525] border border-[#2a2a2a] rounded-lg p-4 overflow-x-auto">
      <div className="flex space-x-4">
        {tables.map((table) => (
          <div key={table.name} className="flex-shrink-0 w-64 bg-[#1f1f1f] rounded-lg p-4 border border-[#2a2a2a]">
            <h3 className="font-bold text-sm text-gray-300 mb-3">{table.name}</h3>
            <div className="space-y-2">
              {table.columns.map((column) => (
                <div key={column.name} className="flex items-center text-xs">
                  <span className="text-gray-400 w-2/5 truncate">{column.name}</span>
                  <span className="text-gray-500 w-1/5">{column.isPK ? 'PK' : column.isFK ? 'FK' : ''}</span>
                  <span className="text-gray-600 w-2/5 text-right">{column.type}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SchemaDisplay;
