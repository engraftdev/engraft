import { Component } from "react";

export default class ErrorBoundary extends Component<any, {error: Error | undefined}> {
    constructor(props: any) {
      super(props);
      this.state = { error: undefined };
    }

    static getDerivedStateFromError(error: Error) {
      return { error };
    }

    componentDidCatch(error: Error, errorInfo: any) {

    }

    render() {
        if (this.state.error) {
          return <div>React error: {this.state.error.message}</div>;
        }

        return this.props.children;
    }
  }