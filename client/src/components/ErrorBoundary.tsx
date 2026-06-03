import React, { ReactNode, ErrorInfo } from 'react';
import { logger } from '../logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'var(--bg)',
            color: 'var(--text)',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h1>Virhe pelin suorituksessa</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Jokin meni pieleen. Yritä ladata sivu uudelleen.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details
              style={{
                padding: '1rem',
                background: 'var(--card-bg)',
                borderRadius: '0.5rem',
                textAlign: 'left',
                maxWidth: '500px',
                marginBottom: '2rem',
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Virheenneljitykset (dev vain)
              </summary>
              <pre
                style={{
                  marginTop: '1rem',
                  fontSize: '0.8rem',
                  overflow: 'auto',
                  color: '#ff6b6b',
                }}
              >
                {this.state.error.toString()}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--primary)',
              color: 'var(--text)',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Lataa sivu uudelleen
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
