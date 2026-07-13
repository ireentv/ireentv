import React, { ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-6 text-center select-none">
          <div className="max-w-md bg-[#050505] border border-red-500/30 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-red-600/10 border border-red-500/30 flex justify-center items-center mb-6 animate-pulse">
              <span className="text-red-500 text-3xl font-black">!</span>
            </div>
            <h1 className="text-2xl font-bold text-red-500 mb-2">দুঃখিত, কোনো একটি সমস্যা হয়েছে</h1>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              অ্যাপ্লিকেশনটি লোড করতে সমস্যা হচ্ছে। নিচের বাটনে ক্লিক করে পুনরায় চেষ্টা করুন।
            </p>
            {this.state.error && (
              <pre className="text-[11px] font-mono text-red-400 bg-red-950/20 border border-red-900/30 px-3 py-2 rounded-lg max-w-full overflow-x-auto mb-6 text-left w-full">
                {this.state.error.toString()}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="bg-[#00ffcc] text-black hover:bg-[#00e6b8] active:scale-95 transition-all duration-200 px-6 py-2.5 rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(0,255,204,0.3)] outline-none cursor-pointer"
            >
              আবার চেষ্টা করুন (Retry)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
