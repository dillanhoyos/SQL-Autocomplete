export interface ParsedColumn {
  name: string;
  type: string;
  isPK: boolean;
  isFK: boolean;
  description: string;
}

export interface ParsedTable {
  name: string;
  columns: ParsedColumn[];
}

export function parseSchema(schemaString: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const lines = schemaString.split('\n').filter(line => line.trim() !== '');
  let currentTable: ParsedTable | null = null;

  for (const line of lines) {
    if (line.startsWith('Table: ')) {
      if (currentTable) {
        tables.push(currentTable);
      }
      currentTable = {
        name: line.replace('Table: ', '').trim(),
        columns: [],
      };
    } else if (line.trim().startsWith('- ') && currentTable) {
      const columnLine = line.trim().substring(2);
      
      const nameMatch = columnLine.match(/^([\w_]+)/);
      const typeMatch = columnLine.match(/\(([^)]+)\)/);
      const descMatch = columnLine.match(/(?:–|--)\s*(.*)$/);

      const name = nameMatch ? nameMatch[1] : 'unknown';
      const typeInfo = typeMatch ? typeMatch[1] : 'unknown';
      const description = descMatch ? descMatch[1].trim() : '';
      
      const [type, ...rest] = typeInfo.split(',').map(s => s.trim());
      const isPK = rest.includes('PK');
      const isFK = rest.some(r => r.startsWith('FK'));

      currentTable.columns.push({
        name,
        type,
        isPK,
        isFK,
        description,
      });
    }
  }

  if (currentTable) {
    tables.push(currentTable);
  }

  return tables;
}
