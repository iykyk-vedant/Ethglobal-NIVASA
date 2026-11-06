import React from 'react';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  caption?: string;
  isSrOnlyCaption?: boolean;
}

export const Table: React.FC<TableProps> = ({
  caption,
  isSrOnlyCaption = true,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-border bg-surface-card">
      <table className={`w-full text-left text-sm border-collapse ${className}`} {...props}>
        {caption && (
          <caption className={isSrOnlyCaption ? 'sr-only' : 'p-3 text-xs text-text-secondary text-left'}>
            {caption}
          </caption>
        )}
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <thead className={`bg-surface-muted/60 text-xs uppercase tracking-wider text-text-secondary font-semibold border-b border-border ${className}`} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <tbody className={`divide-y divide-border ${className}`} {...props}>
    {children}
  </tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <tr className={`hover:bg-surface-page/60 transition-colors duration-fast ${className}`} {...props}>
    {children}
  </tr>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <th scope="col" className={`px-4 py-3 font-semibold ${className}`} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <td className={`px-4 py-3 text-text-primary ${className}`} {...props}>
    {children}
  </td>
);
