import { LogFileInput } from './components/LogFileInput/LogFileInput.tsx';
import { ResultsTable } from './components/ResultsTable/ResultsTable.tsx';
import { useLogEvaluation, type LogEvaluation } from './hooks/useLogEvaluation.ts';

function statusMessage(state: LogEvaluation): string {
  switch (state.status) {
    case 'loading':
      return 'Evaluating the log…';
    case 'success': {
      const count = Object.keys(state.results).length;
      return `Classified ${count} ${count === 1 ? 'sensor' : 'sensors'} from ${state.fileName}.`;
    }
    default:
      return '';
  }
}

export function App() {
  const { state, evaluate, evaluateSample } = useLogEvaluation();

  return (
    <main>
      <header className="page-header">
        <p className="eyebrow">365-Widgets</p>
        <h1>Sensor quality control</h1>
        <p className="lead">
          Choose a test-chamber log to see how each thermometer, humidity sensor and carbon monoxide
          detector is classified.
        </p>
      </header>
      <LogFileInput onFileSelect={evaluate} onUseSample={evaluateSample} />
      <p role="status" className="status" data-status={state.status}>
        {statusMessage(state)}
      </p>
      {state.status === 'error' && (
        <p role="alert" className="error">
          <strong>{state.fileName} could not be evaluated.</strong> {state.message}
        </p>
      )}
      {state.status === 'success' && (
        <ResultsTable caption={`Results for ${state.fileName}`} results={state.results} />
      )}
    </main>
  );
}
