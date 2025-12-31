import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💥</div>
                    <h1 style={{ color: '#e11d48' }}>Something went wrong.</h1>
                    <p style={{ color: '#4b5563', marginBottom: '2rem' }}>
                        The application crashed. Here is the error details:
                    </p>
                    <div style={{
                        backgroundColor: '#f3f4f6',
                        padding: '1.5rem',
                        borderRadius: '0.5rem',
                        overflowX: 'auto',
                        textAlign: 'left',
                        border: '1px solid #d1d5db'
                    }}>
                        <p style={{ color: '#dc2626', fontWeight: 'bold', margin: 0 }}>
                            {this.state.error && this.state.error.toString()}
                        </p>
                        {this.state.errorInfo && (
                            <pre style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                {this.state.errorInfo.componentStack}
                            </pre>
                        )}
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '2rem',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
