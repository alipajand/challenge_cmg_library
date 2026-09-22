import type { Classification } from '../../../src/index.ts';

interface ResultsTableProps {
  caption: string;
  results: Record<string, Classification>;
}

export function ResultsTable({ caption, results }: ResultsTableProps) {
  return (
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Sensor</th>
          <th scope="col">Classification</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(results).map(([name, classification]) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            <td>
              <span className="classification" data-classification={classification}>
                {classification}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
